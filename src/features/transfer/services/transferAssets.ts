import type { UnifiedAssetBreakdown } from '@/@web3/types/wallet';
import { ZERO_ADDRESS } from '@/config/contracts';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type {
  NativeBalanceRow,
  StablecoinPortfolio
} from '@/features/checkout/services/paymentBalances';

export type TransferAsset = {
  id: string;
  chainId: number;
  chainLabel: string;
  networkFamily: 'evm' | 'solana';
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  amount: number;
  amountUsd: number | null;
  kind: 'native' | 'token';
};

export type TransferNetwork = {
  chainId: number;
  label: string;
  shortLabel: string;
  networkFamily: TransferAsset['networkFamily'];
};

const NATIVE_DECIMALS: Record<string, number> = {
  ETH: 18,
  SOL: 9,
  BNB: 18
};

const CHAIN_PRIORITY: Record<number, number> = {
  42161: 0,
  421614: 0,
  1: 1,
  11155111: 1,
  8453: 2,
  101: 3,
  103: 3
};

function finiteNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getConfiguredNetwork(profile: RuntimeNetworkProfile, chainId: number): TransferNetwork | null {
  const evm = profile.stablecoinRoutes.find((route) => route.chainId === chainId);
  if (evm) {
    return {
      chainId,
      label: evm.chainLabel,
      shortLabel: evm.shortLabel,
      networkFamily: 'evm'
    };
  }
  if (profile.solanaBalanceRoute.chainId === chainId) {
    return {
      chainId,
      label: profile.solanaBalanceRoute.chainLabel,
      shortLabel: 'Solana',
      networkFamily: 'solana'
    };
  }
  return null;
}

function particleAssetRows(
  profile: RuntimeNetworkProfile,
  assets: UnifiedAssetBreakdown[]
): TransferAsset[] {
  return assets.flatMap((asset) => {
    const symbol = String(asset.tokenType ?? '').toUpperCase();
    return (asset.chainAggregation ?? []).flatMap((aggregation, index) => {
      const chainId = Number(aggregation.token?.chainId);
      const network = Number.isFinite(chainId)
        ? getConfiguredNetwork(profile, chainId)
        : null;
      if (!network) return [];

      const address = aggregation.token?.address || ZERO_ADDRESS;
      const amount = finiteNumber(aggregation.amount);
      const amountUsd = finiteNumber(aggregation.amountInUSD);
      const native = address.toLowerCase() === ZERO_ADDRESS;
      return [{
        id: `${chainId}:${address.toLowerCase()}:${symbol || index}`,
        chainId,
        chainLabel: network.label,
        networkFamily: network.networkFamily,
        symbol: symbol || aggregation.token?.symbol || 'TOKEN',
        name: aggregation.token?.name || symbol || 'Token',
        address,
        decimals: aggregation.token?.realDecimals ?? aggregation.token?.decimals ?? NATIVE_DECIMALS[symbol] ?? 18,
        amount,
        amountUsd: amountUsd > 0 ? amountUsd : null,
        kind: native ? 'native' : 'token'
      } satisfies TransferAsset];
    });
  });
}

function exactStablecoinRows(
  profile: RuntimeNetworkProfile,
  portfolio: StablecoinPortfolio
): TransferAsset[] {
  return portfolio.rows.flatMap((row) => {
    if (row.chainId == null || !row.tokenAddress) return [];
    const network = getConfiguredNetwork(profile, row.chainId);
    if (!network) return [];
    const token = profile.stablecoinRoutes
      .find((route) => route.chainId === row.chainId)
      ?.tokens.find((candidate) => candidate.address.toLowerCase() === row.tokenAddress?.toLowerCase())
      ?? (profile.solanaBalanceRoute.chainId === row.chainId
        ? profile.solanaBalanceRoute.tokens.find((candidate) => candidate.mint === row.tokenAddress)
        : undefined);

    return [{
      id: `${row.chainId}:${row.tokenAddress.toLowerCase()}:${row.symbol}`,
      chainId: row.chainId,
      chainLabel: row.chainLabel,
      networkFamily: network.networkFamily,
      symbol: row.symbol,
      name: row.symbol === 'USDC' ? 'USD Coin' : 'Tether USD',
      address: row.tokenAddress,
      decimals: token?.decimals ?? 6,
      amount: row.amount,
      amountUsd: row.amountInUsd,
      kind: 'token'
    } satisfies TransferAsset];
  });
}

function exactNativeRows(
  profile: RuntimeNetworkProfile,
  rows: NativeBalanceRow[]
): TransferAsset[] {
  return rows.flatMap((row) => {
    const network = getConfiguredNetwork(profile, row.chainId);
    if (!network) return [];
    return [{
      id: `${row.chainId}:${ZERO_ADDRESS}:${row.symbol}`,
      chainId: row.chainId,
      chainLabel: row.chainLabel,
      networkFamily: network.networkFamily,
      symbol: row.symbol,
      name: row.symbol === 'SOL' ? 'Solana' : 'Ether',
      address: ZERO_ADDRESS,
      decimals: NATIVE_DECIMALS[row.symbol],
      amount: row.amount,
      amountUsd: null,
      kind: 'native'
    } satisfies TransferAsset];
  });
}

/**
 * Exact RPC balances win over Particle's aggregation. Particle rows then add
 * supported primary assets and USD valuations that are not in the RPC set.
 */
export function buildTransferAssets(input: {
  profile: RuntimeNetworkProfile;
  portfolio: StablecoinPortfolio;
  nativeRows: NativeBalanceRow[];
  particleAssets: UnifiedAssetBreakdown[];
}) {
  const merged = new Map<string, TransferAsset>();
  for (const asset of particleAssetRows(input.profile, input.particleAssets)) {
    merged.set(asset.id, asset);
  }
  for (const asset of exactNativeRows(input.profile, input.nativeRows)) {
    const particle = merged.get(asset.id);
    merged.set(asset.id, {
      ...asset,
      amountUsd: particle?.amountUsd ?? asset.amountUsd
    });
  }
  for (const asset of exactStablecoinRows(input.profile, input.portfolio)) {
    merged.set(asset.id, asset);
  }
  return Array.from(merged.values()).sort((left, right) => {
    const priority = (CHAIN_PRIORITY[left.chainId] ?? 99) - (CHAIN_PRIORITY[right.chainId] ?? 99);
    if (priority !== 0) return priority;
    if (left.chainId !== right.chainId) return left.chainId - right.chainId;
    return (right.amountUsd ?? right.amount) - (left.amountUsd ?? left.amount);
  });
}

export function getTransferNetworks(
  profile: RuntimeNetworkProfile,
  _assets: TransferAsset[]
) {
  const configuredChainIds = [
    ...profile.stablecoinRoutes.map((route) => route.chainId),
    profile.solanaBalanceRoute.chainId
  ];
  return configuredChainIds
    .map((chainId) => getConfiguredNetwork(profile, chainId))
    .filter((network): network is TransferNetwork => network != null)
    .sort((left, right) => {
      const priority = (CHAIN_PRIORITY[left.chainId] ?? 99) - (CHAIN_PRIORITY[right.chainId] ?? 99);
      return priority || left.chainId - right.chainId;
    });
}

export function isSmallTransferAsset(asset: TransferAsset, thresholdUsd = 0.01) {
  if (asset.amount <= 0) return true;
  const comparableUsd = asset.amountUsd ?? (isStablecoinTransferAsset(asset) ? asset.amount : null);
  return comparableUsd != null && comparableUsd + Number.EPSILON < thresholdUsd;
}

export function isStablecoinTransferAsset(asset: TransferAsset) {
  return asset.symbol === 'USDC' || asset.symbol === 'USDT';
}

export function validateTransferRecipient(asset: TransferAsset, recipient: string) {
  const value = recipient.trim();
  if (asset.networkFamily === 'evm') {
    return /^0x[a-fA-F0-9]{40}$/.test(value)
      ? null
      : 'Enter a valid 0x wallet address.';
  }
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
    ? null
    : 'Enter a valid Solana wallet address.';
}

export function validateTransferAmount(asset: TransferAsset, amount: string) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) return 'Enter an amount greater than zero.';
  if (parsed > asset.amount) return `Maximum available is ${asset.amount} ${asset.symbol}.`;
  const decimals = amount.split('.')[1]?.length ?? 0;
  if (decimals > asset.decimals) return `${asset.symbol} supports up to ${asset.decimals} decimals.`;
  return null;
}

export function formatTransferAmount(
  value: number,
  maximumFractionDigits = 6,
  minimumFractionDigits = 0
) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
    minimumFractionDigits
  }).format(value);
}

export function formatTransferAssetAmount(asset: TransferAsset) {
  if (isStablecoinTransferAsset(asset)) {
    return formatTransferAmount(asset.amount, 2, 2);
  }
  if (asset.kind === 'native') {
    return formatTransferAmount(asset.amount, Math.min(asset.decimals, 10));
  }
  return formatTransferAmount(asset.amount, Math.min(asset.decimals, 6));
}
