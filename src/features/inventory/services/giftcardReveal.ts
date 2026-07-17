import { Buffer } from 'buffer';
import {
  BrowserProvider,
  Contract,
  ZeroAddress,
  getAddress,
  isAddress,
  keccak256,
  toBeHex,
  toUtf8Bytes
} from 'ethers';
import nacl from 'tweetnacl';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { HexString, WalletAdapter } from '@/@web3/types/wallet';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import { fetchWithTimeout, withTimeout } from '@/utils/async';

const COFHE_TASK_MANAGER = '0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9';
const TASK_MANAGER_ABI = ['function acl() view returns (address)'] as const;
const EIP712_DOMAIN_ABI = [
  'function eip712Domain() view returns (bytes1 fields,string name,string version,uint256 chainId,address verifyingContract,bytes32 salt,uint256[] extensions)'
] as const;
const PERMIT_TYPES = {
  PermissionedV2IssuerSelf: [
    { name: 'issuer', type: 'address' },
    { name: 'expiration', type: 'uint64' },
    { name: 'recipient', type: 'address' },
    { name: 'validatorId', type: 'uint256' },
    { name: 'validatorContract', type: 'address' },
    { name: 'sealingKey', type: 'bytes32' }
  ]
};
const EIP712_DOMAIN_TYPES = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
];

type Eip1193Provider = {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type CofheDomain = {
  chainId: number;
  name: string;
  verifyingContract: string;
  version: string;
};

type SerializedCofhePermit = {
  hash: HexString;
  name: string;
  type: 'self';
  issuer: string;
  expiration: number;
  recipient: string;
  validatorId: number;
  validatorContract: string;
  issuerSignature: HexString;
  recipientSignature: '0x';
  _signedDomain: CofheDomain;
  sealingPair: {
    privateKey: string;
    publicKey: string;
  };
};

export type RevealedGiftcardCode = {
  code: string;
  pinCode?: string;
  provider?: string;
  transactionId?: string;
};

export async function revealGiftcardCode({
  item,
  ownerAddress,
  profile,
  wallet
}: {
  item: GiftcardInventoryItem;
  ownerAddress: string;
  profile: RuntimeNetworkProfile;
  wallet: WalletAdapter;
}): Promise<RevealedGiftcardCode> {
  if (!item.isEncrypted) throw new Error('This giftcard has no encrypted merchant code.');
  if (!isAddress(ownerAddress)) throw new Error('Connect the wallet that owns this giftcard.');
  if (!wallet.getProvider || !wallet.signTypedData) {
    throw new Error('The connected wallet cannot authorize secure code reveal.');
  }

  const rawProvider = await withTimeout(
    Promise.resolve(wallet.getProvider()),
    15_000,
    'The embedded wallet provider did not become ready for code reveal.'
  ) as Eip1193Provider;
  if (!rawProvider || typeof rawProvider.request !== 'function') {
    throw new Error('The embedded EVM wallet provider is not ready.');
  }
  await ensureRevealChain(rawProvider, profile);

  const provider = new BrowserProvider(rawProvider);
  const domain = await loadCofheDomain(provider, profile);
  const permit = await createSignedRevealPermit({
    domain,
    ownerAddress: getAddress(ownerAddress),
    signTypedData: wallet.signTypedData
  });
  const response = await fetchWithTimeout(
    `${profile.apiBase.replace(/\/+$/, '')}/giftcard/reveal-code`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chain_id: profile.ua.targetChainId,
        collection: item.collection,
        token_id: item.tokenId,
        permit
      })
    },
    75_000,
    'Secure code reveal did not finish within 75 seconds. The giftcard remains safely unwrapped.'
  );
  if (!response.ok) {
    const body = await response.text();
    throw new Error(readApiErrorMessage(body) ?? `Code reveal failed (${response.status}).`);
  }

  const result = await response.json() as {
    code?: string;
    pin_code?: string;
    provider?: string;
    transaction_id?: string;
  };
  if (!result.code?.trim()) throw new Error('Code reveal returned no merchant code.');
  return {
    code: result.code.trim(),
    pinCode: result.pin_code?.trim() || undefined,
    provider: result.provider?.trim() || undefined,
    transactionId: result.transaction_id?.trim() || undefined
  };
}

function readApiErrorMessage(body: string) {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    return parsed.message?.trim() || undefined;
  } catch {
    return body.trim() || undefined;
  }
}

async function ensureRevealChain(provider: Eip1193Provider, profile: RuntimeNetworkProfile) {
  const targetChainHex = toBeHex(profile.ua.targetChainId).toLowerCase();
  try {
    await withTimeout(
      provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainHex }]
      }),
      20_000,
      `The wallet did not switch to ${profile.ua.chainLabel} within 20 seconds.`
    );
  } catch (error) {
    const currentChain = String(await withTimeout(
      provider.request({ method: 'eth_chainId' }),
      10_000,
      'The wallet did not report its current network.'
    )).toLowerCase();
    if (currentChain !== targetChainHex) throw error;
  }
}

async function loadCofheDomain(provider: BrowserProvider, profile: RuntimeNetworkProfile) {
  const taskManager = new Contract(COFHE_TASK_MANAGER, TASK_MANAGER_ABI, provider);
  const aclAddress = getAddress(String(await withTimeout(
    taskManager.acl(),
    15_000,
    'The CoFHE access-control contract did not respond.'
  )));
  const acl = new Contract(aclAddress, EIP712_DOMAIN_ABI, provider);
  const raw = await withTimeout(
    acl.eip712Domain(),
    15_000,
    'The CoFHE signature domain did not load.'
  ) as [string, string, string, bigint, string, string, bigint[]];
  if (Number(raw[3]) !== profile.ua.targetChainId) {
    throw new Error('The CoFHE signature domain does not match the active network.');
  }
  return {
    name: raw[1],
    version: raw[2],
    chainId: Number(raw[3]),
    verifyingContract: getAddress(raw[4])
  };
}

async function createSignedRevealPermit({
  domain,
  ownerAddress,
  signTypedData
}: {
  domain: CofheDomain;
  ownerAddress: string;
  signTypedData: NonNullable<WalletAdapter['signTypedData']>;
}): Promise<SerializedCofhePermit> {
  const keyPair = nacl.box.keyPair();
  const expiration = Math.floor(Date.now() / 1000) + 10 * 60;
  const validatorId = 0;
  const validatorContract = ZeroAddress;
  const recipient = ZeroAddress;
  const sealingPair = {
    privateKey: Buffer.from(keyPair.secretKey).toString('hex'),
    publicKey: Buffer.from(keyPair.publicKey).toString('hex')
  };
  const hashFields = {
    type: 'self' as const,
    issuer: ownerAddress,
    expiration,
    recipient,
    validatorId,
    validatorContract
  };
  const message = {
    issuer: ownerAddress,
    expiration,
    recipient,
    validatorId,
    validatorContract,
    sealingKey: `0x${sealingPair.publicKey}`
  };
  const typedData = JSON.stringify({
    domain,
    types: {
      EIP712Domain: EIP712_DOMAIN_TYPES,
      ...PERMIT_TYPES
    },
    primaryType: 'PermissionedV2IssuerSelf',
    message
  });
  const issuerSignature = await withTimeout(
    signTypedData(typedData),
    90_000,
    'The wallet did not authorize code reveal within 90 seconds.'
  );

  return {
    hash: keccak256(toUtf8Bytes(JSON.stringify(hashFields))) as HexString,
    name: 'Mogate giftcard reveal',
    ...hashFields,
    issuerSignature,
    recipientSignature: '0x',
    _signedDomain: domain,
    sealingPair
  };
}
