import {
  AbiCoder,
  Interface,
  TypedDataEncoder,
  concat,
  formatUnits,
  isAddress,
  keccak256,
  toBeHex,
  toUtf8Bytes,
  verifyTypedData
} from 'ethers';

import {
  ARBITRUM_SEPOLIA_GIFTCARD,
  AUTHORITY_GATEWAY_V3_ABI,
  ERC20_APPROVAL_ABI,
  ERC721_TRANSFER_TOPIC,
  MOGATE_UA_FUNDED_GATEWAY_ABI,
  ZERO_ADDRESS
} from '@/config/contracts';
import type { GatewayVersion } from '@/config/env';
import { getDefaultNetworkProfile, type RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { HexString } from '@/@web3/types/wallet';
import { fetchWithTimeout } from '@/utils/async';

type EncKeyTuple = {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: HexString;
};

export type PreparedUnsafeCheckout = {
  gatewayVersion: GatewayVersion;
  chainId?: number;
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
  checkoutTotalDisplay?: string;
  currency: string;
  tokenDecimals: number;
  tokenType: 'native' | 'erc20' | 'fherc20';
  payer?: HexString;
  paymentRecipient?: HexString;
  valuePolicy?: 'fixed' | 'top_up_existing' | 'holder_managed';
  valuePolicyCode?: 0 | 1 | 2;
  valueIsFixed?: boolean;
  isMultiToken?: boolean;
  funded?: {
    token: HexString;
    amountAtomic: bigint;
    amountDisplay: string;
    currency: string;
    tokenDecimals: number;
  } | null;
  fundedAssets?: Array<{
    token: HexString;
    amountAtomic: bigint;
    amountDisplay: string;
    currency: string;
    tokenDecimals: number;
  }>;
  gasReserve?: {
    amountAtomic: bigint;
    amountDisplay: string;
    currency: string;
  } | null;
  signedPermit?: {
    gasReserveAmount: bigint;
    nonce: bigint;
    deadline: bigint;
    signature: HexString;
    signer: HexString;
    fundingHash: HexString;
    digest: HexString;
  };
  requiredNativeValue?: bigint;
};

export type UaTransactionCall = {
  to: HexString;
  data: HexString;
  value?: HexString;
};

const directCheckoutTemplate = {
  checkout: {
    gatewayVersion: 'signed-v2',
    gatewayAddress: '',
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

const FUNDED_CHECKOUT_DOMAIN_NAME = 'AuthorityFundedGiftcardGateway';
const FUNDED_CHECKOUT_DOMAIN_VERSION = '2';
const FUNDING_ASSET_TYPEHASH = keccak256(
  toUtf8Bytes('FundingAsset(address token,uint256 amount)')
);
const FUNDED_CHECKOUT_TYPES = {
  Checkout: [
    { name: 'orderIdHash', type: 'bytes32' },
    { name: 'collection', type: 'address' },
    { name: 'payer', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'uriHash', type: 'bytes32' },
    { name: 'feeToken', type: 'address' },
    { name: 'feeAmount', type: 'uint256' },
    { name: 'fundingHash', type: 'bytes32' },
    { name: 'gasReserveAmount', type: 'uint256' },
    { name: 'valuePolicy', type: 'uint8' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

export type GiftcardCheckoutIntent = {
  merchantId?: string;
  provider?: string;
  productId?: number | string | null;
  merchantName?: string;
  amountDisplay?: string;
  currency?: string;
  region?: string;
  network?: 'ethereum' | 'arbitrum';
  giftcardMode?: 'voucher' | 'funded';
  mintMode?: 'public';
  autoMint?: boolean;
  autoUnwrap?: boolean;
  reserveGas?: boolean;
  couponCode?: string;
};

type CheckoutPaymentOption = {
  payment_method: string;
  payment_currency: string;
  token_address?: string | null;
  token_decimals?: number;
  token_type?: 'native' | 'erc20' | 'spl' | 'fherc20' | 'coin' | string;
  is_confidential?: boolean;
  is_enabled?: boolean;
  execution_mode?: string;
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
        gatewayAddress:
          profile.gateway.signedAddress || directCheckoutTemplate.checkout.gatewayAddress,
        collection:
          profile.gateway.fundedCollection ||
          profile.gateway.legacyCollection ||
          directCheckoutTemplate.checkout.collection,
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

function assertAddress(value: string | undefined, field: string): asserts value is HexString {
  if (!value || !isAddress(value)) throw new Error(`Prepared checkout ${field} is invalid.`);
}

function assertBytes32(value: string | undefined, field: string): asserts value is HexString {
  if (!value || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error(`Prepared checkout ${field} is not a bytes32 value.`);
  }
}

export function hashPreparedFundedAssets(
  funding: NonNullable<PreparedUnsafeCheckout['fundedAssets']>
) {
  const coder = AbiCoder.defaultAbiCoder();
  const elementHashes = funding.map((asset, index) => {
    assertAddress(asset.token, `funding[${index}].token`);
    if (asset.amountAtomic <= 0n) {
      throw new Error(`Prepared checkout funding[${index}] amount must be positive.`);
    }
    return keccak256(
      coder.encode(
        ['bytes32', 'address', 'uint256'],
        [FUNDING_ASSET_TYPEHASH, asset.token, asset.amountAtomic]
      )
    );
  });
  return keccak256(concat(elementHashes));
}

export function assertPreparedFundedCheckoutIntegrity(
  checkout: PreparedUnsafeCheckout,
  ownerAddress: string,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile(),
  nowSeconds = BigInt(Math.floor(Date.now() / 1000))
) {
  if (checkout.gatewayVersion !== 'signed-v2') return null;

  assertAddress(ownerAddress, 'connected payer');
  assertAddress(checkout.gatewayAddress, 'gateway');
  assertAddress(checkout.collection, 'collection');
  assertAddress(checkout.payer, 'payer');
  assertAddress(checkout.to, 'receiver');
  assertAddress(checkout.paymentToken, 'service fee token');
  if (!checkout.orderId || checkout.orderId !== checkout.checkoutId) {
    throw new Error('Prepared checkout order ID does not match its checkout ID.');
  }
  if (!checkout.uri.trim()) throw new Error('Prepared checkout metadata URI is empty.');
  if (checkout.chainId !== profile.ua.targetChainId) {
    throw new Error(`Prepared checkout targets chain ${checkout.chainId}, not ${profile.ua.targetChainId}.`);
  }
  if (!isSameEvmAddress(checkout.gatewayAddress, profile.gateway.signedAddress)) {
    throw new Error('Prepared checkout gateway does not match the configured funded gateway.');
  }
  if (!isSameEvmAddress(checkout.collection, profile.gateway.fundedCollection)) {
    throw new Error('Prepared checkout collection does not match the configured funded collection.');
  }
  if (!isSameEvmAddress(checkout.payer, ownerAddress)) {
    throw new Error('Prepared checkout payer does not match the connected wallet.');
  }
  if (!isSameEvmAddress(checkout.to, ownerAddress)) {
    throw new Error('Prepared checkout receiver does not match the connected wallet.');
  }

  const permit = checkout.signedPermit;
  const funding = checkout.fundedAssets ?? [];
  if (!permit || funding.length === 0 || funding.length > 16) {
    throw new Error('Prepared checkout is missing valid signed funding terms.');
  }
  if (!/^0x[0-9a-fA-F]{130}$/.test(permit.signature)) {
    throw new Error('Prepared checkout EIP-712 signature must be exactly 65 bytes.');
  }
  assertAddress(permit.signer, 'backend signer');
  assertBytes32(permit.fundingHash, 'funding hash');
  assertBytes32(permit.digest, 'EIP-712 digest');
  if (permit.deadline <= nowSeconds) throw new Error('Prepared checkout EIP-712 permit has expired.');
  if (checkout.valuePolicyCode == null || checkout.valuePolicyCode < 0 || checkout.valuePolicyCode > 2) {
    throw new Error('Prepared checkout value policy is invalid.');
  }

  const fundingHash = hashPreparedFundedAssets(funding);
  if (fundingHash.toLowerCase() !== permit.fundingHash.toLowerCase()) {
    throw new Error('Prepared checkout funding hash does not match its funding assets.');
  }
  const calculatedNativeValue =
    (checkout.paymentToken.toLowerCase() === ZERO_ADDRESS ? checkout.amountAtomic : 0n) +
    funding.reduce(
      (sum, asset) => sum + (asset.token.toLowerCase() === ZERO_ADDRESS ? asset.amountAtomic : 0n),
      permit.gasReserveAmount
    );
  if (checkout.requiredNativeValue !== calculatedNativeValue) {
    throw new Error('Prepared checkout native value does not match its signed assets and reserve.');
  }

  const domain = {
    name: FUNDED_CHECKOUT_DOMAIN_NAME,
    version: FUNDED_CHECKOUT_DOMAIN_VERSION,
    chainId: checkout.chainId,
    verifyingContract: checkout.gatewayAddress
  };
  const message = {
    orderIdHash: keccak256(toUtf8Bytes(checkout.orderId)),
    collection: checkout.collection,
    payer: checkout.payer,
    to: checkout.to,
    uriHash: keccak256(toUtf8Bytes(checkout.uri)),
    feeToken: checkout.paymentToken,
    feeAmount: checkout.amountAtomic,
    fundingHash,
    gasReserveAmount: permit.gasReserveAmount,
    valuePolicy: checkout.valuePolicyCode,
    nonce: permit.nonce,
    deadline: permit.deadline
  };
  const digest = TypedDataEncoder.hash(domain, FUNDED_CHECKOUT_TYPES, message);
  if (digest.toLowerCase() !== permit.digest.toLowerCase()) {
    throw new Error('Prepared checkout EIP-712 digest does not match its signed parameters.');
  }
  const recoveredSigner = verifyTypedData(
    domain,
    FUNDED_CHECKOUT_TYPES,
    message,
    permit.signature
  );
  if (!isSameEvmAddress(recoveredSigner, permit.signer)) {
    throw new Error('Prepared checkout signature does not recover its declared backend signer.');
  }

  return { digest, fundingHash, recoveredSigner };
}

export function assertCheckoutReceiverIsOwner(checkout: PreparedUnsafeCheckout, ownerAddress: string) {
  if (!isAddressConfigured(ownerAddress)) {
    throw new Error('Owner EOA is missing or invalid.');
  }

  const executionAddress = checkout.payer ?? checkout.to;
  if (!isAddressConfigured(executionAddress)) {
    throw new Error('Prepared checkout payer is missing or invalid.');
  }

  if (!isSameEvmAddress(executionAddress, ownerAddress)) {
    throw new Error(
      `Prepared checkout payer ${executionAddress} does not match owner EOA ${ownerAddress}. In-place UA mint must execute from the signed payer.`
    );
  }
}

function normalizeGatewayVersion(value: unknown): GatewayVersion {
  if (value === 'v0' || value === 'signed-v1' || value === 'signed-v2') return value;
  return 'signed-v2';
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

function parseSignedFundedAsset(raw: any) {
  const token = normalizeHex(raw?.token ?? ZERO_ADDRESS);
  const amountAtomic = BigInt(raw?.amount ?? raw?.amount_atomic ?? 0);
  const tokenDecimals = Number(
    raw?.decimals ?? (token.toLowerCase() === ZERO_ADDRESS ? 18 : 6)
  );
  const currency = String(
    raw?.symbol ?? (token.toLowerCase() === ZERO_ADDRESS ? 'ETH' : 'TOKEN')
  );
  return {
    token,
    amountAtomic,
    amountDisplay: formatUnits(amountAtomic, tokenDecimals),
    currency,
    tokenDecimals
  };
}

function normalizeSignedFundedCheckout(
  raw: Record<string, any>,
  evm: Record<string, any>,
  signed: Record<string, any>
): PreparedUnsafeCheckout {
  if (raw.status !== 'prepared') {
    throw new Error(`Funded checkout is not prepared yet (status: ${String(raw.status ?? 'unknown')}).`);
  }
  if (raw.prepared?.giftcard_type !== 'funded') {
    throw new Error('Prepared checkout is not a funded giftcard payload.');
  }
  if (evm.mode !== 'atomic_checkout' || evm.entrypoint !== 'checkout') {
    throw new Error('Prepared funded checkout must use the atomic checkout entrypoint.');
  }
  if (signed.version !== '2') {
    throw new Error(`Prepared funded checkout version ${String(signed.version ?? 'unknown')} is unsupported.`);
  }
  const serviceFee = signed.service_fee ?? signed.payment ?? {};
  const permit = signed.permit ?? {};
  const fundedAssets = Array.isArray(signed.funding)
    ? signed.funding.map(parseSignedFundedAsset)
    : [];
  if (fundedAssets.length === 0) {
    throw new Error('Signed funded checkout has no value assets.');
  }
  const gasReserveAmount = BigInt(
    permit.gas_reserve_amount ?? permit.gasReserveAmount ?? 0
  );
  const paymentToken = normalizeHex(serviceFee.token ?? ZERO_ADDRESS);
  const tokenDecimals = Number(
    raw.prepared?.permit?.token_decimals ??
    (paymentToken.toLowerCase() === ZERO_ADDRESS ? 18 : 6)
  );
  const amountAtomic = BigInt(serviceFee.amount ?? 0);
  const signature = normalizeHex(signed.signature);
  if (signature === '0x') throw new Error('Signed funded checkout is missing its EIP-712 signature.');

  return {
    gatewayVersion: 'signed-v2',
    chainId: Number(signed.chain_id),
    gatewayAddress: normalizeHex(signed.gateway_address),
    checkoutId: String(raw.checkout_id ?? signed.order_id),
    orderId: String(signed.order_id ?? evm.order_id ?? raw.checkout_id),
    collection: normalizeHex(signed.collection_address),
    payer: normalizeHex(signed.payer),
    to: normalizeHex(signed.to),
    uri: String(signed.uri ?? evm.uri ?? ''),
    paymentToken,
    amountAtomic,
    amountDisplay: formatUnits(amountAtomic, tokenDecimals),
    checkoutTotalDisplay: String(
      raw.direct_payment?.amount ?? raw.total_amount ?? formatUnits(amountAtomic, tokenDecimals)
    ),
    currency: String(raw.currency ?? (paymentToken.toLowerCase() === ZERO_ADDRESS ? 'ETH' : 'USDC')),
    tokenDecimals,
    tokenType: paymentToken.toLowerCase() === ZERO_ADDRESS ? 'native' : 'erc20',
    paymentRecipient: isAddressConfigured(serviceFee.recipient)
      ? normalizeHex(serviceFee.recipient)
      : undefined,
    valuePolicy: signed.value_policy ?? 'fixed',
    valuePolicyCode: Number(signed.value_policy_code ?? 0) as 0 | 1 | 2,
    valueIsFixed: signed.value_is_fixed ?? signed.value_policy === 'fixed',
    isMultiToken: signed.is_multi_token ?? fundedAssets.length > 1,
    funded: fundedAssets[0] ?? null,
    fundedAssets,
    gasReserve: {
      amountAtomic: gasReserveAmount,
      amountDisplay: formatUnits(gasReserveAmount, 18),
      currency: 'ETH'
    },
    signedPermit: {
      gasReserveAmount,
      nonce: BigInt(permit.nonce ?? 0),
      deadline: BigInt(permit.deadline ?? 0),
      signature,
      signer: normalizeHex(signed.signer),
      fundingHash: normalizeHex(signed.funding_hash),
      digest: normalizeHex(signed.digest)
    },
    requiredNativeValue: BigInt(signed.required_native_value ?? 0)
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
      : isAddressConfigured(profile.gateway.legacyAddress)
        ? normalizeHex(profile.gateway.legacyAddress)
        : undefined,
    checkoutId: String(checkout.checkoutId ?? checkout.checkout_id ?? checkout.orderId ?? checkout.order_id),
    orderId: String(checkout.orderId ?? checkout.order_id ?? checkout.checkoutId ?? checkout.checkout_id),
    collection: normalizeHex(
      checkout.collection ??
      profile.gateway.legacyCollection ??
      profile.gateway.fundedCollection ??
      ARBITRUM_SEPOLIA_GIFTCARD.collection
    ),
    to: normalizeHex(checkout.to ?? receiverFallback),
    uri: String(checkout.uri ?? ''),
    encKey: gatewayVersion === 'v0' ? parseEncKey(checkout.encKey ?? checkout.enc_key) : undefined,
    cipherRef: gatewayVersion === 'v0' ? String(checkout.cipherRef ?? checkout.cipher_ref ?? '') : undefined,
    paymentToken: normalizeHex(checkout.paymentToken ?? checkout.payment_token ?? ZERO_ADDRESS),
    amountAtomic: BigInt(checkout.amountAtomic ?? checkout.amount_atomic ?? 0),
    amountDisplay: String(checkout.amountDisplay ?? checkout.amount_display ?? '0'),
    checkoutTotalDisplay: String(
      checkout.checkoutTotalDisplay ??
      checkout.checkout_total_display ??
      checkout.amountDisplay ??
      checkout.amount_display ??
      '0'
    ),
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
  if (evm.funded_checkout) {
    return normalizeSignedFundedCheckout(raw, evm, evm.funded_checkout);
  }

  const tokenType = (evm.token_type ?? 'native') as PreparedUnsafeCheckout['tokenType'];
  const tokenDecimals = tokenType === 'native' ? 18 : 6;
  const amountDisplay = String(raw.direct_payment?.amount ?? raw.total_amount ?? '0');
  const amountAtomic = evm.amount ? BigInt(evm.amount) : decimalToAtomic(amountDisplay, tokenDecimals);
  const encKeyRaw = raw.prepared?.encryption?.key_handle || evm.enc_key;
  const legacyUnsafeCheckout = evm.entrypoint === 'unsafeCheckout' && Boolean(encKeyRaw);
  const gatewayVersion = normalizeGatewayVersion(
    raw.gatewayVersion ?? raw.gateway_version ?? (legacyUnsafeCheckout ? 'v0' : profile.gateway.version)
  );

  return {
    gatewayVersion,
    gatewayAddress: isAddressConfigured(evm.gateway_address)
      ? normalizeHex(evm.gateway_address)
      : isAddressConfigured(profile.gateway.legacyAddress)
        ? normalizeHex(profile.gateway.legacyAddress)
        : undefined,
    checkoutId: String(raw.checkout_id ?? evm.order_id),
    orderId: String(evm.order_id ?? raw.checkout_id),
    collection: normalizeHex(
      raw.collection ??
      profile.gateway.legacyCollection ??
      profile.gateway.fundedCollection ??
      ARBITRUM_SEPOLIA_GIFTCARD.collection
    ),
    to: normalizeHex(evm.to ?? receiverFallback),
    uri: String(evm.uri ?? ''),
    encKey: gatewayVersion === 'v0' ? parseEncKey(encKeyRaw) : undefined,
    cipherRef: gatewayVersion === 'v0' ? String(raw.prepared?.encryption?.cipher_ref || evm.cipher_ref || '') : undefined,
    paymentToken: normalizeHex(evm.token_address || ZERO_ADDRESS),
    amountAtomic,
    amountDisplay,
    checkoutTotalDisplay: amountDisplay,
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

function assertPreparedCheckoutMatchesProfile(
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile
) {
  const targetRoute = profile.stablecoinRoutes.find(
    (route) => route.chainId === profile.ua.targetChainId
  );
  const configuredUsdc = targetRoute?.tokens.find((token) => token.symbol === 'USDC');
  if (
    checkout.amountAtomic > 0n &&
    configuredUsdc &&
    checkout.paymentToken.toLowerCase() !== configuredUsdc.address.toLowerCase()
  ) {
    throw new Error(
      `Checkout prepared ${checkout.paymentToken} instead of ${profile.ua.chainLabel} USDC. Prepare checkout again.`
    );
  }
  return checkout;
}

export function parsePreparedCheckoutJson(
  input: string,
  receiverFallback: string,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  const raw = JSON.parse(input) as Record<string, any>;
  if (raw.prepared?.permit?.execution?.evm) {
    return assertPreparedCheckoutMatchesProfile(
      normalizeWebCheckout(raw, receiverFallback, profile),
      profile
    );
  }
  throwIfCheckoutFailed(raw);
  if (!raw.checkout && (raw.checkout_id || raw.product_type === 'giftcard' || raw.direct_payment)) {
    throw new Error('Checkout JSON does not contain prepared EVM execution data yet.');
  }
  return assertPreparedCheckoutMatchesProfile(
    normalizeDirectPayload(raw, receiverFallback, profile),
    profile
  );
}

export async function fetchPreparedCheckout(
  receiver: string,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile(),
  intent?: GiftcardCheckoutIntent | null
) {
  if (!profile.checkoutEndpoint) {
    throw new Error('Checkout API path is not configured. Paste prepared checkout JSON instead.');
  }

  const response = await fetchWithTimeout(profile.checkoutEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(
      buildGiftcardCheckoutCreateRequest(
        receiver,
        profile,
        await selectCheckoutPaymentOption(profile, resolveCheckoutNetwork(profile, intent)),
        intent
      )
    )
  }, 20_000, 'Checkout preparation did not start within 20 seconds. Check the API connection and try again.');

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Checkout endpoint failed ${response.status}: ${body}`);
  }

  const body = (await response.json()) as Record<string, any>;
  if (body.status === 'prepared' && body.prepared?.permit?.execution?.evm) {
    return assertPreparedCheckoutMatchesProfile(normalizeWebCheckout(body, receiver, profile), profile);
  }
  if (body.checkout) {
    return assertPreparedCheckoutMatchesProfile(normalizeDirectPayload(body, receiver, profile), profile);
  }
  return pollPreparedCheckout(body, receiver, profile);
}

function getCheckoutStatusEndpoint(profile: RuntimeNetworkProfile, checkoutId: string) {
  const base = profile.apiBase.replace(/\/+$/, '');
  return `${base}/giftcard/checkout/${encodeURIComponent(checkoutId)}/status`;
}

function throwIfCheckoutFailed(raw: Record<string, any>) {
  if (raw.status !== 'failed') return;
  throw new Error(String(raw.error || raw.message || 'Giftcard checkout preparation failed.'));
}

async function pollPreparedCheckout(
  initial: Record<string, any>,
  receiver: string,
  profile: RuntimeNetworkProfile
) {
  const checkoutId = String(initial.checkout_id ?? initial.checkoutId ?? '');
  if (!checkoutId) {
    throw new Error('Checkout creation did not return checkout_id or prepared transaction data.');
  }
  throwIfCheckoutFailed(initial);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const response = await fetchWithTimeout(
      getCheckoutStatusEndpoint(profile, checkoutId),
      {},
      12_000,
      `Checkout ${checkoutId} status did not respond within 12 seconds.`
    );
    if (!response.ok) {
      throw new Error(`Checkout status failed ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as Record<string, any>;
    throwIfCheckoutFailed(body);
    if (body.status === 'prepared' && body.prepared?.permit?.execution?.evm) {
      return assertPreparedCheckoutMatchesProfile(
        normalizeWebCheckout(body, receiver, profile),
        profile
      );
    }
    if (body.checkout) {
      return assertPreparedCheckoutMatchesProfile(
        normalizeDirectPayload(body, receiver, profile),
        profile
      );
    }
  }

  throw new Error(`Giftcard checkout ${checkoutId} is still preparing after 30 seconds.`);
}

function buildGiftcardCheckoutCreateRequest(
  receiver: string,
  profile: RuntimeNetworkProfile,
  paymentOption: CheckoutPaymentOption,
  intent?: GiftcardCheckoutIntent | null
) {
  const amount = Number(intent?.amountDisplay ?? 0);
  const provider = (intent?.provider || 'internal') as 'internal' | 'reloadly' | 'partner';
  const brandId = intent?.merchantId || 'mogate_giftcard';
  const cluster = profile.mode === 'mainnet' ? 'mainnet' : 'testnet';
  const network = resolveCheckoutNetwork(profile, intent);
  const giftcardMode = intent?.giftcardMode ?? 'funded';
  const context: Record<string, unknown> = {
    provider,
    brand_id: brandId,
    giftcard_value: Number.isFinite(amount) ? amount : 0,
    card_value_usd: Number.isFinite(amount) ? amount : 0,
    quantity: 1,
    network,
    chain_id: profile.ua.targetChainId,
    receiver: {
      wallet_address: receiver
    },
    encryption_mode: 'fhenix_cofhe',
    payer_wallet: receiver,
    funding_mode: giftcardMode,
    mint_mode: intent?.mintMode ?? 'public',
    auto_mint: intent?.autoMint ?? true,
    auto_unwrap: intent?.autoUnwrap ?? false,
    region: intent?.region ?? 'GLOBAL'
  };

  if (intent?.productId != null) {
    context.product_id = intent.productId;
  }

  return {
    product_type: 'giftcard',
    giftcard_type: giftcardMode === 'funded' ? 'funded' : 'encrypted',
    flow: 'atomic_onchain',
    voucher_code: intent?.couponCode?.trim() || undefined,
    system: {
      backing_mode: giftcardMode === 'funded' ? 'onchain_funded' : 'encrypted_code',
      payment_path: 'direct',
      sponsored: false,
      security_mode: giftcardMode === 'funded' ? 'safe' : 'unsafe',
      cluster,
      payment_method: paymentOption.payment_method,
      payment_currency: paymentOption.payment_currency,
      token_address: paymentOption.token_address ?? null,
      token_decimals: paymentOption.token_decimals ?? (paymentOption.token_type === 'native' ? 18 : 6),
      token_type: paymentOption.token_type ?? 'erc20',
      is_confidential: Boolean(paymentOption.is_confidential),
      payment_execution_mode: paymentOption.execution_mode ?? 'atomic_checkout',
      reserved_gas: {
        enabled: intent?.reserveGas ?? true,
        source: intent?.reserveGas === false ? 'none' : 'direct'
      },
      funded: giftcardMode === 'funded'
        ? {
            value_policy: 'fixed',
            is_multi_token: false
          }
        : undefined
    },
    context
  };
}

export function resolveCheckoutNetwork(
  profile: RuntimeNetworkProfile,
  intent?: GiftcardCheckoutIntent | null
) {
  if (intent?.network) return intent.network;
  return profile.ua.networkName.startsWith('arbitrum') ? 'arbitrum' : 'ethereum';
}

async function selectCheckoutPaymentOption(
  profile: RuntimeNetworkProfile,
  network: 'ethereum' | 'arbitrum'
) {
  const options = await fetchCheckoutPaymentOptions(profile, network);
  const enabled = options.filter((option) => option.is_enabled !== false);
  const preferred = enabled.find(
    (option) =>
      option.payment_currency?.toUpperCase() === 'USDC' &&
      option.is_confidential !== true &&
      option.execution_mode === 'atomic_checkout'
  );

  if (!preferred) {
    throw new Error(
      `No direct USDC checkout option returned for ${network}/${profile.mode}. Check /giftcard/checkout/init before creating a checkout.`
    );
  }

  return preferred;
}

async function fetchCheckoutPaymentOptions(
  profile: RuntimeNetworkProfile,
  network: 'ethereum' | 'arbitrum'
): Promise<CheckoutPaymentOption[]> {
  if (!profile.checkoutInitEndpoint) return [];
  const params = new URLSearchParams({
    network,
    cluster: profile.mode
  });
  const response = await fetchWithTimeout(
    `${profile.checkoutInitEndpoint}?${params.toString()}`,
    {},
    12_000,
    'Payment options did not load within 12 seconds. Check the API connection and try again.'
  );
  if (!response.ok) {
    throw new Error(`Checkout init failed ${response.status}: ${await response.text()}`);
  }

  const body = (await response.json()) as any;
  const flatOptions = Array.isArray(body.payment_options) ? body.payment_options : [];
  const groupedOptions = flatOptions.flatMap((entry: any) =>
    Array.isArray(entry.payment_options) ? entry.payment_options : []
  );
  const nestedOptions =
    body.networks?.[network]?.[profile.mode]?.payment_options ??
    body.networks?.[profile.ua.networkName]?.[profile.mode]?.payment_options ??
    [];
  const directOptions = flatOptions.filter((entry: any) => !Array.isArray(entry.payment_options));

  return [...groupedOptions, ...nestedOptions, ...directOptions].filter(
    (option: any) => option && typeof option.payment_method === 'string'
  );
}

function buildUnsafeCheckoutCalls(
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  if (!checkout.encKey || !checkout.cipherRef) {
    throw new Error('V0 unsafeCheckout requires encKey and cipherRef.');
  }

  const gatewayInterface = new Interface(AUTHORITY_GATEWAY_V3_ABI);
  const erc20Interface = new Interface(ERC20_APPROVAL_ABI);
  const gatewayAddress = checkout.gatewayAddress ?? (
    isAddressConfigured(profile.gateway.legacyAddress)
      ? normalizeHex(profile.gateway.legacyAddress)
      : ARBITRUM_SEPOLIA_GIFTCARD.authorityGateway
  );

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
      gatewayAddress,
      checkout.amountAtomic
    ]) as HexString;
    transactions.push({
      to: checkout.paymentToken,
      data: approveData,
      value: '0x0'
    });
  }

  transactions.push({
    to: gatewayAddress,
    data: unsafeCheckoutData,
    value: isNative ? (toBeHex(checkout.amountAtomic) as HexString) : '0x0'
  });

  return {
    chainId: profile.ua.targetChainId,
    transactions
  };
}

function buildSignedFundedCheckoutCalls(
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  const gatewayAddress = checkout.gatewayAddress ?? normalizeHex(profile.gateway.signedAddress);
  if (!isAddressConfigured(gatewayAddress)) {
    throw new Error(`Signed funded gateway address is not configured for ${profile.label}.`);
  }
  if (!checkout.signedPermit) {
    throw new Error('Signed funded checkout is missing its permit tuple.');
  }
  if (checkout.chainId !== profile.ua.targetChainId) {
    throw new Error(
      `Signed checkout targets chain ${checkout.chainId}, not ${profile.ua.targetChainId}.`
    );
  }
  const fundedAssets = checkout.fundedAssets ?? [];
  if (fundedAssets.length === 0) {
    throw new Error('Signed funded checkout is missing value assets.');
  }

  const erc20Interface = new Interface(ERC20_APPROVAL_ABI);
  const gatewayInterface = new Interface(MOGATE_UA_FUNDED_GATEWAY_ABI);
  const transactions: UaTransactionCall[] = [];
  const paymentIsNative = checkout.paymentToken.toLowerCase() === ZERO_ADDRESS;

  if (!paymentIsNative && checkout.amountAtomic > 0n) {
    transactions.push({
      to: checkout.paymentToken,
      data: erc20Interface.encodeFunctionData('approve', [gatewayAddress, checkout.amountAtomic]) as HexString,
      value: '0x0'
    });
  }

  for (const asset of fundedAssets) {
    if (asset.token.toLowerCase() === ZERO_ADDRESS) continue;
    transactions.push({
      to: asset.token,
      data: erc20Interface.encodeFunctionData('approve', [checkout.collection, asset.amountAtomic]) as HexString,
      value: '0x0'
    });
  }

  const calculatedNativeValue =
    (paymentIsNative ? checkout.amountAtomic : 0n) +
    fundedAssets.reduce(
      (total, asset) => total + (asset.token.toLowerCase() === ZERO_ADDRESS ? asset.amountAtomic : 0n),
      checkout.signedPermit.gasReserveAmount
    );
  if (
    checkout.requiredNativeValue != null &&
    checkout.requiredNativeValue !== calculatedNativeValue
  ) {
    throw new Error('Backend required_native_value does not match signed checkout assets.');
  }

  const checkoutData = gatewayInterface.encodeFunctionData('checkout', [
    {
      orderId: checkout.orderId,
      collection: checkout.collection,
      to: checkout.to,
      uri: checkout.uri
    },
    {
      token: checkout.paymentToken,
      amount: checkout.amountAtomic
    },
    fundedAssets.map((asset) => ({ token: asset.token, amount: asset.amountAtomic })),
    {
      gasReserveAmount: checkout.signedPermit.gasReserveAmount,
      nonce: checkout.signedPermit.nonce,
      deadline: checkout.signedPermit.deadline
    },
    checkout.valuePolicyCode ?? 0,
    checkout.signedPermit.signature
  ]) as HexString;
  transactions.push({
    to: gatewayAddress,
    data: checkoutData,
    value: toBeHex(calculatedNativeValue) as HexString
  });

  return { chainId: profile.ua.targetChainId, transactions };
}

export function buildGiftcardMintCalls(
  checkout: PreparedUnsafeCheckout,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
) {
  if (checkout.gatewayVersion === 'v0') return buildUnsafeCheckoutCalls(checkout, profile);
  if (checkout.gatewayVersion === 'signed-v1') {
    throw new Error('This checkout uses the legacy funded signature. Prepare it again with gateway v2.');
  }
  if (checkout.gatewayVersion === 'signed-v2') {
    return buildSignedFundedCheckoutCalls(checkout, profile);
  }
  throw new Error(`Unsupported gateway version: ${checkout.gatewayVersion}`);
}

export function describeMintPlan(checkout: PreparedUnsafeCheckout) {
  const fundedAssets = checkout.fundedAssets ?? (checkout.funded ? [checkout.funded] : []);
  const fundedAmount = fundedAssets.reduce((total, asset) => total + asset.amountAtomic, 0n);
  const gasReserveAmount = checkout.gasReserve?.amountAtomic ?? 0n;
  return {
    gatewayVersion: checkout.gatewayVersion,
    payment: `${checkout.checkoutTotalDisplay ?? checkout.amountDisplay} ${checkout.currency}`,
    funded: fundedAmount > 0n
      ? fundedAssets.map((asset) => `${asset.amountDisplay} ${asset.currency}`).join(' + ')
      : 'disabled',
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
