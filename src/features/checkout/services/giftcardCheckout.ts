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
import type { HexString } from '@/@web3/types/wallet';

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
        collection:
          profile.gateway.legacyCollection ||
          profile.gateway.fundedCollection ||
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

  const response = await fetch(profile.checkoutEndpoint, {
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
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Checkout endpoint failed ${response.status}: ${body}`);
  }

  const body = (await response.json()) as Record<string, any>;
  if (body.prepared?.permit?.execution?.evm) {
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

    const response = await fetch(getCheckoutStatusEndpoint(profile, checkoutId));
    if (!response.ok) {
      throw new Error(`Checkout status failed ${response.status}: ${await response.text()}`);
    }

    const body = (await response.json()) as Record<string, any>;
    throwIfCheckoutFailed(body);
    if (body.prepared?.permit?.execution?.evm) {
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
    funding_mode: intent?.giftcardMode ?? 'voucher',
    mint_mode: intent?.mintMode ?? 'public',
    auto_mint: intent?.autoMint ?? true,
    auto_unwrap: intent?.autoUnwrap ?? false,
    reserved_gas: intent?.reserveGas ?? false,
    region: intent?.region ?? 'GLOBAL'
  };

  if (intent?.productId != null) {
    context.product_id = intent.productId;
  }

  return {
    product_type: 'giftcard',
    flow: 'atomic_onchain',
    voucher_code: intent?.couponCode?.trim() || undefined,
    system: {
      payment_path: 'direct',
      sponsored: false,
      security_mode: 'unsafe',
      cluster,
      payment_method: paymentOption.payment_method,
      payment_currency: paymentOption.payment_currency,
      token_address: paymentOption.token_address ?? null,
      token_decimals: paymentOption.token_decimals ?? (paymentOption.token_type === 'native' ? 18 : 6),
      token_type: paymentOption.token_type ?? 'erc20',
      is_confidential: Boolean(paymentOption.is_confidential),
      payment_execution_mode: paymentOption.execution_mode ?? 'atomic_checkout'
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
  const response = await fetch(`${profile.checkoutInitEndpoint}?${params.toString()}`);
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
  if (checkout.gatewayVersion === 'v0') return buildUnsafeCheckoutCalls(checkout, profile);
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
