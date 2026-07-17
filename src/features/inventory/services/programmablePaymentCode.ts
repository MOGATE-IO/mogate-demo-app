import { Buffer } from 'buffer';
import {
  Signature,
  ZeroAddress,
  ZeroHash,
  getAddress,
  hexlify,
  isAddress,
  keccak256,
  randomBytes,
  verifyTypedData
} from 'ethers';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { HexString, WalletAdapter } from '@/@web3/types/wallet';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import { withTimeout } from '@/utils/async';

const PAYMENT_INTENT_TYPES = {
  PaymentIntent: [
    { name: 'collection', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'holder', type: 'address' },
    { name: 'recipient', type: 'address' },
    { name: 'nonce', type: 'uint256' },
    { name: 'expiry', type: 'uint256' },
    { name: 'chainId', type: 'uint256' },
    { name: 'rulesHash', type: 'bytes32' },
    { name: 'visibilityPaymentCode', type: 'uint8' },
    { name: 'sponsorMode', type: 'uint8' },
    { name: 'gasReimbursementLimit', type: 'uint256' },
    { name: 'paymentCodeCommitment', type: 'bytes32' }
  ]
};

const EIP712_DOMAIN_TYPES = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' }
];

const PAYMENT_CODE_PRESETS: Record<number, {
  account7702: HexString;
  codePrefix: string;
  gateway: HexString;
}> = {
  11155111: {
    account7702: '0x5a5c8b5af0dcbe2aa5345b3f87bbeebf5b6f6dcb',
    codePrefix: 'sep',
    gateway: '0xa0b23ed315aa54eac446ed418f6078f6b6c65655'
  },
  421614: {
    account7702: '0xe2eec3443af330514e9fb6b3fa6880f56c069d8c',
    codePrefix: 'arb',
    gateway: '0xd290428e60932a34551cd385adcbb9faf8850c89'
  }
};

type PaymentCodeAuthorization = {
  address: HexString;
  chainId: number;
  nonce: string;
  r: HexString;
  s: HexString;
  yParity: number;
};

export type ProgrammablePaymentCodeResult = {
  authorization7702Included: boolean;
  code: string;
  expiresAtUnixSeconds: number | null;
};

export async function generateProgrammablePaymentCode({
  expirySeconds = 900,
  item,
  ownerAddress,
  profile,
  ua7702 = false,
  wallet
}: {
  expirySeconds?: number;
  item: GiftcardInventoryItem;
  ownerAddress: string;
  profile: RuntimeNetworkProfile;
  ua7702?: boolean;
  wallet: WalletAdapter;
}): Promise<ProgrammablePaymentCodeResult> {
  if (item.isUnwrapped) throw new Error('Unwrapped giftcards cannot create a transferable payment code.');
  if (!isAddress(ownerAddress)) throw new Error('Connect the wallet that owns this giftcard.');
  if (!wallet.signTypedData) throw new Error('The connected wallet cannot sign payment codes.');

  const preset = PAYMENT_CODE_PRESETS[profile.ua.targetChainId];
  if (!preset) {
    throw new Error(`Payment-code gateway is not configured for chain ${profile.ua.targetChainId}.`);
  }

  const holder = getAddress(ownerAddress);
  const now = Math.floor(Date.now() / 1000);
  const expiry = expirySeconds > 0 ? BigInt(now + expirySeconds) : 0n;
  const secret = hexlify(randomBytes(32)) as HexString;
  const intent = {
    collection: getAddress(item.collection),
    tokenId: BigInt(item.tokenId),
    holder,
    recipient: ZeroAddress,
    nonce: BigInt(Date.now()),
    expiry,
    chainId: BigInt(profile.ua.targetChainId),
    rulesHash: ZeroHash,
    visibilityPaymentCode: 1,
    sponsorMode: 0,
    gasReimbursementLimit: 0n,
    paymentCodeCommitment: keccak256(secret)
  };
  const domain = {
    name: 'Mogate Payment Code Gateway 7702',
    version: '1',
    chainId: profile.ua.targetChainId,
    verifyingContract: preset.gateway
  };
  const typedData = JSON.stringify({
    domain,
    types: {
      EIP712Domain: EIP712_DOMAIN_TYPES,
      ...PAYMENT_INTENT_TYPES
    },
    primaryType: 'PaymentIntent',
    message: intent
  }, bigintReplacer);
  const holderSignature = await withTimeout(
    wallet.signTypedData(typedData),
    90_000,
    'The wallet did not sign the payment code within 90 seconds.'
  );
  const recovered = verifyTypedData(domain, PAYMENT_INTENT_TYPES, intent, holderSignature);
  if (getAddress(recovered) !== holder) {
    throw new Error('The payment-code signature does not match the giftcard owner.');
  }

  const authorization7702 = ua7702
    ? await create7702Authorization({ ownerAddress: holder, preset, profile, wallet })
    : undefined;
  const envelope = {
    version: 'MGPC1',
    network: preset.codePrefix,
    generationMode: 'signature-only',
    paymentCodeGateway: preset.gateway,
    intent,
    paymentCodeSecret: secret,
    holderSignature,
    ...(authorization7702 ? { authorization7702 } : {})
  };

  return {
    authorization7702Included: Boolean(authorization7702),
    code: encodePaymentCodeEnvelope(preset.codePrefix, envelope),
    expiresAtUnixSeconds: expiry > 0n ? Number(expiry) : null
  };
}

export function encodePaymentCodeEnvelope(prefix: string, envelope: Record<string, unknown>) {
  const json = JSON.stringify(envelope, bigintReplacer);
  const encoded = Buffer.from(json, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
  return `${prefix}:MGPC1:${encoded}`;
}

async function create7702Authorization({
  ownerAddress,
  preset,
  profile,
  wallet
}: {
  ownerAddress: string;
  preset: (typeof PAYMENT_CODE_PRESETS)[number];
  profile: RuntimeNetworkProfile;
  wallet: WalletAdapter;
}): Promise<PaymentCodeAuthorization> {
  if (!wallet.sign7702Authorization || !wallet.getProvider) {
    throw new Error('UA7702 authorization is not available from the connected signer.');
  }
  const provider = await withTimeout(
    Promise.resolve(wallet.getProvider()),
    15_000,
    'The embedded wallet provider did not become ready for UA7702 authorization.'
  ) as { request?: (request: { method: string; params?: unknown[] }) => Promise<unknown> };
  if (typeof provider?.request !== 'function') {
    throw new Error('The embedded wallet provider cannot read the UA7702 nonce.');
  }
  const nonceHex = String(await withTimeout(
    provider.request({ method: 'eth_getTransactionCount', params: [ownerAddress, 'pending'] }),
    15_000,
    'The wallet nonce could not be loaded for UA7702 authorization.'
  ));
  const nonce = BigInt(nonceHex);
  const signed = await wallet.sign7702Authorization({
    address: preset.account7702,
    chainId: profile.ua.targetChainId,
    nonce
  });
  const signature = Signature.from(signed.signature);
  return {
    address: preset.account7702,
    chainId: profile.ua.targetChainId,
    nonce: nonce.toString(),
    r: signature.r as HexString,
    s: signature.s as HexString,
    yParity: signature.yParity
  };
}

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}
