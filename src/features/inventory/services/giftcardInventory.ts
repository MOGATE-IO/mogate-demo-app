import {
  Contract,
  JsonRpcProvider,
  getAddress,
  isAddress,
  toUtf8String,
  zeroPadValue,
  decodeBase64
} from 'ethers';

import { ERC721_TRANSFER_TOPIC } from '@/config/contracts';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { HexString } from '@/@web3/types/wallet';

const INVENTORY_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function isUnwrapped(uint256 tokenId) view returns (bool)',
  'function cipherRef(uint256 tokenId) view returns (string)'
] as const;

const ERC721_ENUMERABLE_INTERFACE_ID = '0x780e9d63';
const MAX_ITEMS_PER_COLLECTION = 100;
const LOG_WINDOW = 9_000;
const MAX_LOG_SPAN = 900_000;

export type GiftcardMetadataAttribute = {
  trait_type?: string;
  value?: string | number | boolean;
};

type GiftcardMetadata = {
  name?: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: GiftcardMetadataAttribute[];
  properties?: Record<string, unknown>;
};

export type GiftcardInventoryItem = {
  id: string;
  collection: HexString;
  collectionName: string;
  tokenId: string;
  title: string;
  brandName: string;
  category: string;
  value: number | null;
  currency: string;
  region: string;
  imageUrl: string | null;
  metadataUri: string | null;
  externalUrl: string | null;
  networkLabel: string;
  isUnwrapped: boolean;
  isEncrypted: boolean;
  encryptionType: string | null;
  giftCode: string | null;
  attributes: GiftcardMetadataAttribute[];
  discovery: 'enumerable' | 'transfer-log';
};

export function getGiftcardCollectionAddresses(profile: RuntimeNetworkProfile): HexString[] {
  return Array.from(new Set([
    profile.gateway.legacyCollection,
    profile.gateway.fundedCollection
  ].filter((address): address is HexString => Boolean(address && isAddress(address)))));
}

export async function loadGiftcardInventory({
  ownerAddress,
  profile,
  onProgress
}: {
  ownerAddress: string;
  profile: RuntimeNetworkProfile;
  onProgress?: (item: GiftcardInventoryItem) => void;
}): Promise<GiftcardInventoryItem[]> {
  if (!isAddress(ownerAddress)) throw new Error('The connected EVM wallet address is invalid.');
  const owner = getAddress(ownerAddress);
  const collections = getGiftcardCollectionAddresses(profile);
  if (collections.length === 0) return [];

  const provider = new JsonRpcProvider(profile.ua.rpcUrl, profile.ua.targetChainId, {
    staticNetwork: true
  });
  const settled = await Promise.allSettled(
    collections.map((collection) => loadCollection({
      collection,
      owner,
      profile,
      provider,
      onProgress
    }))
  );
  const items = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  const firstError = settled.find((result) => result.status === 'rejected');

  if (items.length === 0 && firstError?.status === 'rejected') {
    throw firstError.reason instanceof Error
      ? firstError.reason
      : new Error('Giftcard inventory could not be loaded.');
  }

  return items.sort((a, b) => Number(BigInt(b.tokenId) - BigInt(a.tokenId)));
}

async function loadCollection({
  collection,
  owner,
  profile,
  provider,
  onProgress
}: {
  collection: HexString;
  owner: string;
  profile: RuntimeNetworkProfile;
  provider: JsonRpcProvider;
  onProgress?: (item: GiftcardInventoryItem) => void;
}) {
  const contract = new Contract(collection, INVENTORY_ABI, provider);
  const balance = Number(await contract.balanceOf(owner));
  if (balance === 0) return [];

  const collectionName = await optionalRead(() => contract.name(), 'Mogate Giftcard');
  const enumerable = await optionalRead(
    () => contract.supportsInterface(ERC721_ENUMERABLE_INTERFACE_ID),
    false
  );
  const tokenIds = enumerable
    ? await loadEnumerableTokenIds(contract, owner, Math.min(balance, MAX_ITEMS_PER_COLLECTION))
    : await scanOwnedTokenIds({
        balance: Math.min(balance, MAX_ITEMS_PER_COLLECTION),
        collection,
        contract,
        owner,
        provider
      });
  const discovery = enumerable ? 'enumerable' as const : 'transfer-log' as const;
  const items: GiftcardInventoryItem[] = [];

  for (const tokenId of tokenIds) {
    const item = await loadToken({
      collection,
      collectionName: String(collectionName),
      contract,
      discovery,
      profile,
      tokenId
    });
    items.push(item);
    onProgress?.(item);
  }

  return items;
}

async function loadEnumerableTokenIds(contract: Contract, owner: string, balance: number) {
  const tokenIds: bigint[] = [];
  for (let index = 0; index < balance; index += 1) {
    tokenIds.push(BigInt(await contract.tokenOfOwnerByIndex(owner, index)));
  }
  return tokenIds;
}

async function scanOwnedTokenIds({
  balance,
  collection,
  contract,
  owner,
  provider
}: {
  balance: number;
  collection: HexString;
  contract: Contract;
  owner: string;
  provider: JsonRpcProvider;
}) {
  const latest = await provider.getBlockNumber();
  const earliest = Math.max(0, latest - MAX_LOG_SPAN);
  const ownerTopic = zeroPadValue(owner, 32);
  const candidates = new Set<string>();
  const owned = new Map<string, bigint>();

  for (let toBlock = latest; toBlock >= earliest;) {
    const fromBlock = Math.max(earliest, toBlock - LOG_WINDOW + 1);
    const logs = await provider.getLogs({
      address: collection,
      fromBlock,
      toBlock,
      topics: [ERC721_TRANSFER_TOPIC, null, ownerTopic]
    });

    for (const log of logs.reverse()) {
      const tokenTopic = log.topics[3];
      if (!tokenTopic || candidates.has(tokenTopic)) continue;
      candidates.add(tokenTopic);
      const tokenId = BigInt(tokenTopic);
      const currentOwner = await optionalRead(() => contract.ownerOf(tokenId), '');
      if (String(currentOwner).toLowerCase() === owner.toLowerCase()) {
        owned.set(tokenTopic, tokenId);
      }
    }

    if (owned.size >= balance || fromBlock === earliest) break;
    toBlock = fromBlock - 1;
  }

  if (owned.size === 0) {
    throw new Error('The collection reports owned giftcards, but its recent transfer history was unavailable.');
  }
  return Array.from(owned.values()).slice(0, balance);
}

async function loadToken({
  collection,
  collectionName,
  contract,
  discovery,
  profile,
  tokenId
}: {
  collection: HexString;
  collectionName: string;
  contract: Contract;
  discovery: 'enumerable' | 'transfer-log';
  profile: RuntimeNetworkProfile;
  tokenId: bigint;
}): Promise<GiftcardInventoryItem> {
  const [metadataUri, isUnwrapped, cipherRef] = await Promise.all([
    optionalRead(() => contract.tokenURI(tokenId), ''),
    optionalRead(() => contract.isUnwrapped(tokenId), false),
    optionalRead(() => contract.cipherRef(tokenId), '')
  ]);
  const metadata = await fetchMetadata(String(metadataUri));
  const attributes = metadata?.attributes ?? [];
  const value = parseAmount(readAttribute(attributes, ['credit amount', 'value', 'card value', 'amount']));
  const encryptionType = readAttribute(attributes, ['encryption type', 'encryption']);
  const brandName = readAttribute(attributes, ['brand name', 'company', 'vendor'])
    ?? metadata?.name?.replace(/\s+giftcard$/i, '')
    ?? collectionName;
  const normalizedEncryption = String(encryptionType ?? '').trim();

  return {
    id: `${collection.toLowerCase()}:${tokenId}`,
    collection,
    collectionName,
    tokenId: tokenId.toString(),
    title: metadata?.name ?? `Giftcard #${tokenId}`,
    brandName: String(brandName),
    category: String(readAttribute(attributes, ['category']) ?? 'Giftcard'),
    value,
    currency: String(readAttribute(attributes, ['currency']) ?? 'USD'),
    region: String(readAttribute(attributes, ['region']) ?? 'GLOBAL'),
    imageUrl: metadata?.image ? resolveContentUri(metadata.image) : null,
    metadataUri: metadataUri ? String(metadataUri) : null,
    externalUrl: metadata?.external_url ?? null,
    networkLabel: profile.ua.chainLabel,
    isUnwrapped: Boolean(isUnwrapped),
    isEncrypted: Boolean(cipherRef) || Boolean(normalizedEncryption && normalizedEncryption.toLowerCase() !== 'none'),
    encryptionType: normalizedEncryption || null,
    giftCode: stringValue(readAttribute(attributes, ['giftcard code', 'gift code', 'voucher code', 'code'])),
    attributes,
    discovery
  };
}

async function fetchMetadata(uri: string): Promise<GiftcardMetadata | null> {
  if (!uri) return null;
  try {
    if (uri.startsWith('data:application/json;base64,')) {
      const payload = uri.slice('data:application/json;base64,'.length);
      return JSON.parse(toUtf8String(decodeBase64(payload))) as GiftcardMetadata;
    }
    if (uri.startsWith('data:application/json,')) {
      return JSON.parse(decodeURIComponent(uri.slice('data:application/json,'.length))) as GiftcardMetadata;
    }
    const response = await fetch(resolveContentUri(uri));
    if (!response.ok) return null;
    return await response.json() as GiftcardMetadata;
  } catch {
    return null;
  }
}

function resolveContentUri(uri: string) {
  if (uri.startsWith('ipfs://ipfs/')) return uri.replace('ipfs://ipfs/', 'https://ipfs.io/ipfs/');
  if (uri.startsWith('ipfs://')) return uri.replace('ipfs://', 'https://ipfs.io/ipfs/');
  return uri;
}

function readAttribute(attributes: GiftcardMetadataAttribute[], names: string[]) {
  const normalizedNames = new Set(names.map(normalizeKey));
  return attributes.find((attribute) => normalizedNames.has(normalizeKey(attribute.trait_type)))?.value;
}

function normalizeKey(value?: string) {
  return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const match = String(value ?? '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown) {
  if (value == null || value === '') return null;
  return String(value);
}

async function optionalRead<T>(read: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await read();
  } catch {
    return fallback;
  }
}
