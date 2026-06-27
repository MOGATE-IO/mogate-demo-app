import { Interface, toBeHex } from 'ethers';

import {
  ARBITRUM_SEPOLIA_GIFTCARD,
  AUTHORITY_GATEWAY_V3_ABI,
  ERC20_APPROVAL_ABI,
  ERC721_TRANSFER_TOPIC,
  MOGATE_UA_MINT_GATEWAY_V2_ABI,
  ZERO_ADDRESS
} from '@/config/contracts';
import type { GatewayVersion } from '@/config/env';
import { getDefaultNetworkProfile, type RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { HexString } from '@/types/wallet';

type EncKeyTuple = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: HexString;
};

export type PreparedUnsafeCheckout = {
  gatewayVersion: GatewayVersion;
  gatewayAddress?: HexString;
  checkoutId: string;
  orderId: string;
  collection: HexString;
  to: HexString;
  uri: string;
  encKey?: EncKeyTuple;
  cipherRef?: string;
  paymentToken: HexString;
  amountAtomic: bigint;
  amountDisplay: string;
  currency: string;
  tokenDecimals: number;
  tokenType: 'native' | 'erc20' | 'fherc20';
  paymentRecipient?: HexString;
  funded?: {
    token: HexString;
    amountAtomic: bigint;
    amountDisplay: string;
    currency: string;
    tokenDecimals: number;
  } | null;
  gasReserve?: {
    amountAtomic: bigint;
    amountDisplay: string;
    currency: string;
  } | null;
};

export type UaTransactionCall = {
  to: HexString;
  data: HexString;
  value?: HexString;
};

const directCheckoutTemplate = {
  checkout: {
    gatewayVersion: 'v2',
    orderId: 'mobile-test-order',
    collection: ARBITRUM_SEPOLIA_GIFTCARD.collection,
    to: '0x0000000000000000000000000000000000000000',
    uri: 'ipfs://funded-giftcard-metadata',
    paymentToken: ZERO_ADDRESS,
    amountAtomic: '0',
    amountDisplay: '0',
    currency: 'ETH',
    tokenDecimals: 18,
    tokenType: 'native',
    paymentRecipient: '0x0000000000000000000000000000000000000000',
    funded: {
      token: ZERO_ADDRESS,
      amountAtomic: '0',
      amountDisplay: '0',
      currency: 'ETH',
      tokenDecimals: 18
    },
    gasReserve: {
      amountAtomic: '0',
      amountDisplay: '0',
      currency: 'ETH'
    }
  }
};

export type GiftcardCheckoutIntent = {
  merchantId?: string;
  merchantName?: string;
  amountDisplay?: string;
  currency?: string;
};

export function getDirectCheckoutTemplate(
  receiver?: string | null,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  return JSON.stringify(
    {
      ...directCheckoutTemplate,
      checkout: {
        ...directCheckoutTemplate.checkout,
        collection: profile.gateway.fundedCollection || directCheckoutTemplate.checkout.collection,
        to: receiver || directCheckoutTemplate.checkout.to
      }
    },
    null,
    2
  );
}

function normalizeHex(value?: string | null): HexString {
  if (!value) return '0x';
  return value.startsWith('0x') ? (value as HexString) : (`0x${value}` as HexString);
}

function isAddressConfigured(value?: string | null) {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

export function isSameEvmAddress(left?: string | null, right?: string | null) {
  return Boolean(left && right && left.toLowerCase() === right.toLowerCase());
}

export function assertCheckoutReceiverIsOwner(checkout: PreparedUnsafeCheckout, ownerAddress: string) {
  if (!isAddressConfigured(ownerAddress)) {
    throw new Error('Owner EOA is missing or invalid.');
  }

  if (!isAddressConfigured(checkout.to)) {
    throw new Error('Prepared checkout receiver is missing or invalid.');
  }

  if (!isSameEvmAddress(checkout.to, ownerAddress)) {
    throw new Error(
      `Prepared checkout receiver ${checkout.to} does not match owner EOA ${ownerAddress}. In-place UA mint requires checkout.to to be the signing EOA.`
    );
  }
}

function normalizeGatewayVersion(value: unknown): GatewayVersion {
  return value === 'v0' ? 'v0' : 'v2';
}

function parseCtHash(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`ctHash must be a non-negative integer. Received ${value}.`);
    }
    return BigInt(value);
  }
  if (typeof value !== 'string') {
    throw new Error('ctHash must be a decimal or hex string.');
  }

  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return BigInt(trimmed);
  if (/^0x[0-9a-fA-F]+$/.test(trimmed)) return BigInt(trimmed);
  if (/^[0-9a-fA-F]+$/.test(trimmed)) return BigInt(`0x${trimmed}`);
  throw new Error('ctHash must be decimal or hex, with or without 0x.');
}

function parseEncKey(raw: unknown): EncKeyTuple {
  const parsed =
    typeof raw === 'string'
      ? (JSON.parse(raw) as Record<string, unknown>)
      : (raw as Record<string, unknown>);

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Prepared checkout is missing encKey.');
  }

  if (Array.isArray(parsed.parts)) {
    throw new Error('EVM unsafeCheckout expects the single signed euint128 key_handle, not split parts.');
  }

  const utype = Number(parsed.utype ?? 6);
  if (utype !== 6) {
    throw new Error(`EVM giftcard key must be euint128 utype 6, received ${utype}.`);
  }

  const signature = normalizeHex(String(parsed.signature ?? ''));
  if (signature === '0x') {
    throw new Error('Prepared checkout encKey is missing its CoFHE verifier signature.');
  }

  return {
    ctHash: parseCtHash(parsed.ctHash),
    securityZone: Number(parsed.securityZone ?? 0),
    utype,
    signature
  };
}

function decimalToAtomic(amount: string | number, decimals: number) {
  const [wholeRaw, fractionRaw = ''] = String(amount).split('.');
  const whole = wholeRaw || '0';
  const fraction = fractionRaw.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(`${whole}${fraction}`.replace(/^0+(?=\d)/, '') || '0');
}

function parseOptionalFunding(raw: any) {
  if (!raw) return null;
  const amountAtomic = BigInt(raw.amountAtomic ?? raw.amount_atomic ?? 0);
  const token = normalizeHex(raw.token ?? raw.valueToken ?? raw.value_token ?? raw.fundingToken ?? raw.funding_token ?? ZERO_ADDRESS);
  return {
    token,
    amountAtomic,
    amountDisplay: String(raw.amountDisplay ?? raw.amount_display ?? '0'),
    currency: String(raw.currency ?? (token.toLowerCase() === ZERO_ADDRESS ? 'ETH' : 'USDC')),
    tokenDecimals: Number(raw.tokenDecimals ?? raw.token_decimals ?? (token.toLowerCase() === ZERO_ADDRESS ? 18 : 6))
  };
}

function parseOptionalGasReserve(raw: any) {
  if (!raw) return null;
  const amountAtomic = BigInt(raw.amountAtomic ?? raw.amount_atomic ?? 0);
  return {
    amountAtomic,
    amountDisplay: String(raw.amountDisplay ?? raw.amount_display ?? '0'),
    currency: String(raw.currency ?? 'ETH')
  };
}

function normalizeDirectPayload(
  raw: Record<string, any>,
  receiverFallback: string,
  profile: RuntimeNetworkProfile
): PreparedUnsafeCheckout {
  const checkout = raw.checkout ?? raw;
  const gatewayVersion = normalizeGatewayVersion(checkout.gatewayVersion ?? checkout.gateway_version ?? profile.gateway.version);
  const tokenDecimals = Number(checkout.tokenDecimals ?? 18);
  return {
    gatewayVersion,
    gatewayAddress: isAddressConfigured(checkout.gatewayAddress ?? checkout.gateway_address)
      ? normalizeHex(checkout.gatewayAddress ?? checkout.gateway_address)
      : undefined,
    checkoutId: String(checkout.checkoutId ?? checkout.checkout_id ?? checkout.orderId ?? checkout.order_id),
    orderId: String(checkout.orderId ?? checkout.order_id ?? checkout.checkoutId ?? checkout.checkout_id),
    collection: normalizeHex(checkout.collection ?? profile.gateway.fundedCollection ?? ARBITRUM_SEPOLIA_GIFTCARD.collection),
    to: normalizeHex(checkout.to ?? receiverFallback),
    uri: String(checkout.uri ?? ''),
    encKey: gatewayVersion === 'v0' ? parseEncKey(checkout.encKey ?? checkout.enc_key) : undefined,
    cipherRef: gatewayVersion === 'v0' ? String(checkout.cipherRef ?? checkout.cipher_ref ?? '') : undefined,
    paymentToken: normalizeHex(checkout.paymentToken ?? checkout.payment_token ?? ZERO_ADDRESS),
    amountAtomic: BigInt(checkout.amountAtomic ?? checkout.amount_atomic ?? 0),
    amountDisplay: String(checkout.amountDisplay ?? checkout.amount_display ?? '0'),
    currency: String(checkout.currency ?? 'ETH'),
    tokenDecimals,
    tokenType: checkout.tokenType ?? checkout.token_type ?? 'native',
    paymentRecipient: isAddressConfigured(checkout.paymentRecipient ?? checkout.payment_recipient)
      ? normalizeHex(checkout.paymentRecipient ?? checkout.payment_recipient)
      : undefined,
    funded: parseOptionalFunding(checkout.funded ?? checkout.funding),
    gasReserve: parseOptionalGasReserve(checkout.gasReserve ?? checkout.gas_reserve)
  };
}

function normalizeWebCheckout(
  raw: Record<string, any>,
  receiverFallback: string,
  profile: RuntimeNetworkProfile
): PreparedUnsafeCheckout {
  const permit = raw.prepared?.permit;
  const evm = permit?.execution?.evm;
  if (!permit || !evm) {
    throw new Error('Prepared checkout is missing prepared.permit.execution.evm.');
  }

  const tokenType = (evm.token_type ?? 'native') as PreparedUnsafeCheckout['tokenType'];
  const tokenDecimals = tokenType === 'native' ? 18 : 6;
  const amountDisplay = String(raw.direct_payment?.amount ?? raw.total_amount ?? '0');
  const amountAtomic = evm.amount ? BigInt(evm.amount) : decimalToAtomic(amountDisplay, tokenDecimals);
  const encKeyRaw = raw.prepared?.encryption?.key_handle || evm.enc_key;
  const gatewayVersion = normalizeGatewayVersion(raw.gatewayVersion ?? raw.gateway_version ?? profile.gateway.version);

  return {
    gatewayVersion,
    gatewayAddress: isAddressConfigured(evm.gateway_address)
      ? normalizeHex(evm.gateway_address)
      : undefined,
    checkoutId: String(raw.checkout_id ?? evm.order_id),
    orderId: String(evm.order_id ?? raw.checkout_id),
    collection: normalizeHex(raw.collection ?? profile.gateway.fundedCollection ?? ARBITRUM_SEPOLIA_GIFTCARD.collection),
    to: normalizeHex(evm.to ?? receiverFallback),
    uri: String(evm.uri ?? ''),
    encKey: gatewayVersion === 'v0' ? parseEncKey(encKeyRaw) : undefined,
    cipherRef: gatewayVersion === 'v0' ? String(raw.prepared?.encryption?.cipher_ref || evm.cipher_ref || '') : undefined,
    paymentToken: normalizeHex(evm.token_address || ZERO_ADDRESS),
    amountAtomic,
    amountDisplay,
    currency: String(raw.currency ?? 'USD'),
    tokenDecimals,
    tokenType,
    paymentRecipient: isAddressConfigured(raw.payment_recipient ?? evm.payment_recipient)
      ? normalizeHex(raw.payment_recipient ?? evm.payment_recipient)
      : undefined,
    funded: parseOptionalFunding(raw.prepared?.funding ?? raw.funding),
    gasReserve: parseOptionalGasReserve(raw.prepared?.gas_reserve ?? raw.gas_reserve)
  };
}

export function parsePreparedCheckoutJson(
  input: string,
  receiverFallback: string,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  const raw = JSON.parse(input) as Record<string, any>;
  if (raw.prepared?.permit?.execution?.evm) return normalizeWebCheckout(raw, receiverFallback, profile);
  return normalizeDirectPayload(raw, receiverFallback, profile);
}

export async function fetchPreparedCheckout(
  receiver: string,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile(),
  intent?: GiftcardCheckoutIntent | null
) {
  if (!profile.checkoutEndpoint) {
    throw new Error('Checkout API path is not configured. Paste prepared checkout JSON instead.');
  }

  const response = await fetch(profile.checkoutEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      chain: 'evm',
      network: profile.ua.networkName,
      chainId: profile.ua.targetChainId,
      receiver,
      intent: intent ?? undefined
    })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Checkout endpoint failed ${response.status}: ${body}`);
  }

  const body = (await response.json()) as Record<string, any>;
  if (body.prepared?.permit?.execution?.evm) return normalizeWebCheckout(body, receiver, profile);
  return normalizeDirectPayload(body, receiver, profile);
}

function buildUnsafeCheckoutCalls(checkout: PreparedUnsafeCheckout) {
  if (!checkout.encKey || !checkout.cipherRef) {
    throw new Error('V0 unsafeCheckout requires encKey and cipherRef.');
  }

  const gatewayInterface = new Interface(AUTHORITY_GATEWAY_V3_ABI);
  const erc20Interface = new Interface(ERC20_APPROVAL_ABI);

  const unsafeCheckoutData = gatewayInterface.encodeFunctionData('unsafeCheckout', [
    {
      orderId: checkout.orderId,
      collection: checkout.collection,
      to: checkout.to,
      uri: checkout.uri,
      encKey: checkout.encKey,
      cipherRef: checkout.cipherRef
    },
    checkout.paymentToken,
    checkout.amountAtomic
  ]) as HexString;

  const isNative = checkout.paymentToken.toLowerCase() === ZERO_ADDRESS;
  const transactions: UaTransactionCall[] = [];

  if (!isNative) {
    const approveData = erc20Interface.encodeFunctionData('approve', [
      ARBITRUM_SEPOLIA_GIFTCARD.authorityGateway,
      checkout.amountAtomic
    ]) as HexString;
    transactions.push({
      to: checkout.paymentToken,
      data: approveData,
      value: '0x0'
    });
  }

  transactions.push({
    to: ARBITRUM_SEPOLIA_GIFTCARD.authorityGateway,
    data: unsafeCheckoutData,
    value: isNative ? (toBeHex(checkout.amountAtomic) as HexString) : '0x0'
  });

  return {
    chainId: ARBITRUM_SEPOLIA_GIFTCARD.chainId,
    transactions
  };
}

function resolveV2Gateway(
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  const gateway = checkout.gatewayAddress ?? normalizeHex(profile.gateway.v2Address);
  if (!isAddressConfigured(gateway)) {
    throw new Error(`V2 mint gateway address is not configured for ${profile.label}.`);
  }
  return gateway;
}

function resolvePaymentRecipient(
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  const recipient = checkout.paymentRecipient;
  if (isAddressConfigured(recipient)) return normalizeHex(recipient);
  if (checkout.amountAtomic > 0n) {
    throw new Error('V2 payment recipient is missing from the backend checkout payload.');
  }
  return ZERO_ADDRESS;
}

function buildV2CheckoutCalls(
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  const gatewayAddress = resolveV2Gateway(checkout, profile);
  const paymentRecipient = resolvePaymentRecipient(checkout, profile);
  const gatewayInterface = new Interface(MOGATE_UA_MINT_GATEWAY_V2_ABI);
  const erc20Interface = new Interface(ERC20_APPROVAL_ABI);
  const transactions: UaTransactionCall[] = [];

  const paymentIsNative = checkout.paymentToken.toLowerCase() === ZERO_ADDRESS;
  if (!paymentIsNative && checkout.amountAtomic > 0n) {
    transactions.push({
      to: checkout.paymentToken,
      data: erc20Interface.encodeFunctionData('approve', [gatewayAddress, checkout.amountAtomic]) as HexString,
      value: '0x0'
    });
  }

  const funded = checkout.funded;
  const fundedAmount = funded?.amountAtomic ?? 0n;
  const fundedToken = funded?.token ?? ZERO_ADDRESS;
  const fundingIsNative = fundedToken.toLowerCase() === ZERO_ADDRESS;
  if (funded && fundedAmount > 0n && !fundingIsNative) {
    transactions.push({
      to: fundedToken,
      data: erc20Interface.encodeFunctionData('approve', [checkout.collection, fundedAmount]) as HexString,
      value: '0x0'
    });
  }

  const gasReserveAmount = checkout.gasReserve?.amountAtomic ?? 0n;
  const nativeValue =
    (paymentIsNative ? checkout.amountAtomic : 0n) +
    (fundingIsNative ? fundedAmount : 0n) +
    gasReserveAmount;

  const checkoutData = gatewayInterface.encodeFunctionData('checkoutFundedV2', [
    {
      orderId: checkout.orderId,
      collection: checkout.collection,
      to: checkout.to,
      uri: checkout.uri
    },
    {
      token: checkout.paymentToken,
      amount: checkout.amountAtomic,
      recipient: paymentRecipient
    },
    {
      valueToken: fundedToken,
      valueAmount: fundedAmount,
      gasReserveAmount
    }
  ]) as HexString;

  transactions.push({
    to: gatewayAddress,
    data: checkoutData,
    value: toBeHex(nativeValue) as HexString
  });

  return {
    chainId: profile.ua.targetChainId,
    transactions
  };
}

export function buildGiftcardMintCalls(
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  if (checkout.gatewayVersion === 'v0') return buildUnsafeCheckoutCalls(checkout);
  return buildV2CheckoutCalls(checkout, profile);
}

export function describeMintPlan(checkout: PreparedUnsafeCheckout) {
  const fundedAmount = checkout.funded?.amountAtomic ?? 0n;
  const gasReserveAmount = checkout.gasReserve?.amountAtomic ?? 0n;
  return {
    gatewayVersion: checkout.gatewayVersion,
    payment: `${checkout.amountDisplay} ${checkout.currency}`,
    funded: fundedAmount > 0n ? `${checkout.funded?.amountDisplay} ${checkout.funded?.currency}` : 'disabled',
    gasReserve:
      gasReserveAmount > 0n
        ? `${checkout.gasReserve?.amountDisplay} ${checkout.gasReserve?.currency}`
        : 'disabled'
  };
}

function indexedTopicToAddress(topic?: string) {
  if (!topic || topic.length < 42) return '';
  return `0x${topic.slice(-40)}`.toLowerCase();
}

export function extractMintedTokenIdFromReceipt(input: {
  receipt?: any;
  receiver?: string | null;
  collection?: string;
}) {
  const logs = input.receipt?.logs || input.receipt?.transactionReceipt?.logs || [];
  const collection = (input.collection ?? ARBITRUM_SEPOLIA_GIFTCARD.collection).toLowerCase();
  const receiver = input.receiver?.toLowerCase();

  const transfer = [...logs]
    .reverse()
    .find((log) => {
      const topics = log?.topics || [];
      if (String(log?.address ?? '').toLowerCase() !== collection) return false;
      if (String(topics[0] ?? '').toLowerCase() !== ERC721_TRANSFER_TOPIC) return false;
      if (!topics[3]) return false;
      return receiver ? indexedTopicToAddress(topics[2]) === receiver : true;
    });

  if (!transfer?.topics?.[3]) return '';
  return BigInt(transfer.topics[3]).toString();
}
