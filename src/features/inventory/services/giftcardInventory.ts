import {
  Contract,
  JsonRpcProvider,
  formatUnits,
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
  'function cipherRef(uint256 tokenId) view returns (string)',
  'function giftcardBalances(uint256 tokenId) view returns (((address token,uint256 amount)[] values,uint256 gasReserve,uint8 valuePolicy,bool isMultiToken) result)',
  'function gasReserveOf(uint256 tokenId) view returns (uint256)'
] as const;

const ERC20_METADATA_ABI = [
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
] as const;

const ERC721_ENUMERABLE_INTERFACE_ID = '0x780e9d63';
const MAX_ITEMS_PER_COLLECTION = 100;
const LOG_WINDOW = 9_000;
const LOG_BATCH_SIZE = 6;
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
  isFunded: boolean;
  fundBalances: GiftcardFundBalance[];
  gasReserveAtomic: string | null;
  gasReserveDisplay: string | null;
  attributes: GiftcardMetadataAttribute[];
  discovery: 'enumerable' | 'transfer-log';
};

export type GiftcardFundBalance = {
  token: HexString;
  amountAtomic: string;
  amountDisplay: string;
  symbol: string;
  decimals: number;
  isNative: boolean;
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
      provider,
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
  const windows: Array<{ fromBlock: number; toBlock: number }> = [];

  for (let toBlock = latest; toBlock >= earliest;) {
    const fromBlock = Math.max(earliest, toBlock - LOG_WINDOW + 1);
    windows.push({ fromBlock, toBlock });
    if (fromBlock === earliest) break;
    toBlock = fromBlock - 1;
  }

  for (let offset = 0; offset < windows.length; offset += LOG_BATCH_SIZE) {
    const batch = windows.slice(offset, offset + LOG_BATCH_SIZE);
    const logs = (await Promise.all(batch.map(({ fromBlock, toBlock }) => provider.getLogs({
      address: collection,
      fromBlock,
      toBlock,
      topics: [ERC721_TRANSFER_TOPIC, null, ownerTopic]
    })))).flat();
    const newTokenIds: Array<{ topic: string; tokenId: bigint }> = [];

    for (const log of logs.reverse()) {
      const tokenTopic = log.topics[3];
      if (!tokenTopic || candidates.has(tokenTopic)) continue;
      candidates.add(tokenTopic);
      newTokenIds.push({ topic: tokenTopic, tokenId: BigInt(tokenTopic) });
    }

    const currentOwners = await Promise.all(newTokenIds.map(({ tokenId }) =>
      optionalRead(() => contract.ownerOf(tokenId), '')
    ));
    newTokenIds.forEach(({ tokenId, topic }, index) => {
      const currentOwner = currentOwners[index];
      if (String(currentOwner).toLowerCase() === owner.toLowerCase()) {
        owned.set(topic, tokenId);
      }
    });

    if (owned.size >= balance) break;
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
  provider,
  tokenId
}: {
  collection: HexString;
  collectionName: string;
  contract: Contract;
  discovery: 'enumerable' | 'transfer-log';
  profile: RuntimeNetworkProfile;
  provider: JsonRpcProvider;
  tokenId: bigint;
}): Promise<GiftcardInventoryItem> {
  const [metadataUri, isUnwrapped, cipherRef, rawGiftcardBalances, directGasReserve] = await Promise.all([
    optionalRead(() => contract.tokenURI(tokenId), ''),
    optionalRead(() => contract.isUnwrapped(tokenId), false),
    optionalRead(() => contract.cipherRef(tokenId), ''),
    optionalRead<unknown | null>(() => contract.giftcardBalances(tokenId), null),
    optionalRead<bigint | null>(() => contract.gasReserveOf(tokenId), null)
  ]);
  const metadata = await fetchMetadata(String(metadataUri));
  const attributes = metadata?.attributes ?? [];
  const value = parseAmount(readAttribute(attributes, ['credit amount', 'value', 'card value', 'amount']));
  const encryptionType = readAttribute(attributes, ['encryption type', 'encryption']);
  const brandName = readAttribute(attributes, ['brand name', 'company', 'vendor'])
    ?? metadata?.name?.replace(/\s+giftcard$/i, '')
    ?? collectionName;
  const normalizedEncryption = String(encryptionType ?? '').trim();
  const backingMode = String(metadata?.properties?.backing_mode ?? '').trim().toLowerCase();
  const giftcardBalances = parseGiftcardBalanceView(rawGiftcardBalances);
  const gasReserve = giftcardBalances?.gasReserve ?? directGasReserve;
  const isFunded = giftcardBalances !== null || backingMode === 'onchain_funded';
  const fundBalances = giftcardBalances
    ? await Promise.all(giftcardBalances.values.map((balance) => loadFundBalance(balance, provider)))
    : [];

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
    isEncrypted: !isFunded && (
      Boolean(cipherRef) || Boolean(normalizedEncryption && normalizedEncryption.toLowerCase() !== 'none')
    ),
    encryptionType: normalizedEncryption || null,
    giftCode: isFunded
      ? null
      : stringValue(readAttribute(attributes, ['giftcard code', 'gift code', 'voucher code', 'code'])),
    isFunded,
    fundBalances,
    gasReserveAtomic: gasReserve == null ? null : gasReserve.toString(),
    gasReserveDisplay: gasReserve == null ? null : formatUnits(gasReserve, 18),
    attributes,
    discovery
  };
}

type ParsedGiftcardBalanceView = {
  values: readonly unknown[];
  gasReserve: bigint;
};

/** Normalizes the single Solidity struct returned by the funded collection. */
export function parseGiftcardBalanceView(raw: unknown): ParsedGiftcardBalanceView | null {
  if (!Array.isArray(raw)) return null;

  // Ethers normally unwraps a single tuple return. Keep the outer-tuple case for
  // encoded fixtures and providers that preserve the ABI result container.
  const candidate = raw.length === 1
    && Array.isArray(raw[0])
    && raw[0].length >= 4
    && Array.isArray(raw[0][0])
    ? raw[0]
    : raw;
  if (!Array.isArray(candidate[0]) || candidate.length < 4) return null;

  try {
    return {
      values: candidate[0],
      gasReserve: BigInt(candidate[1] ?? 0)
    };
  } catch {
    return null;
  }
}

async function loadFundBalance(raw: any, provider: JsonRpcProvider): Promise<GiftcardFundBalance> {
  const token = getAddress(String(raw?.token ?? raw?.[0])) as HexString;
  const amount = BigInt(raw?.amount ?? raw?.[1] ?? 0);
  const isNative = token.toLowerCase() === '0x0000000000000000000000000000000000000000';
  if (isNative) {
    return {
      token,
      amountAtomic: amount.toString(),
      amountDisplay: formatUnits(amount, 18),
      symbol: 'ETH',
      decimals: 18,
      isNative: true
    };
  }

  const erc20 = new Contract(token, ERC20_METADATA_ABI, provider);
  const [symbol, decimals] = await Promise.all([
    optionalRead(() => erc20.symbol(), 'ERC20'),
    optionalRead(() => erc20.decimals(), 18n)
  ]);
  const normalizedDecimals = Number(decimals);
  return {
    token,
    amountAtomic: amount.toString(),
    amountDisplay: formatUnits(amount, normalizedDecimals),
    symbol: String(symbol),
    decimals: normalizedDecimals,
    isNative: false
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
