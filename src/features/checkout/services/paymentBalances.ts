import type {
  UnifiedAssetBreakdown,
  UnifiedBalance,
  UnifiedChainAssetBreakdown
} from '@/@web3/types/wallet';
import type { StablecoinRoute } from '@/config/networkProfiles';

export type StablecoinSymbol = 'USDC' | 'USDT';

export type StablecoinBalanceRow = {
  id: string;
  symbol: StablecoinSymbol;
  chainId: number | null;
  chainLabel: string;
  tokenAddress: string | null;
  amount: number;
  amountInUsd: number;
};

export type StablecoinPortfolio = {
  totalUsd: number;
  targetUsdc: number;
  rows: StablecoinBalanceRow[];
};

export type NativeBalanceRow = {
  chainId: number;
  chainLabel: string;
  symbol: 'ETH';
  amount: number;
};

export type StablecoinRouteBalances = {
  rows: StablecoinBalanceRow[];
  nativeRows: NativeBalanceRow[];
  errors: string[];
};

const CHAIN_LABELS: Record<number, string> = {
  1: 'Ethereum',
  137: 'Polygon',
  8453: 'Base',
  42161: 'Arbitrum',
  11155111: 'Ethereum Sepolia',
  421614: 'Arbitrum Sepolia'
};

function toFiniteNumber(value: unknown) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function encodeBalanceOf(ownerAddress: string) {
  const owner = ownerAddress.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
  return `0x70a08231${owner}`;
}

function atomicToNumber(raw: bigint, decimals: number) {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return Number(`${whole.toString()}${fraction ? `.${fraction}` : ''}`);
}

async function rpcCall(rpcUrl: string, method: string, params: unknown[]) {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${method}-${Date.now()}-${Math.random()}`,
      method,
      params
    })
  });
  if (!response.ok) throw new Error(`RPC request failed ${response.status}.`);

  const body = await response.json() as {
    error?: { message?: string };
    result?: `0x${string}`;
  };
  if (body.error) throw new Error(body.error.message || 'RPC returned an error.');
  return BigInt(body.result || '0x0');
}

async function loadStablecoinRoute(route: StablecoinRoute, ownerAddress: string) {
  const nativePromise = rpcCall(route.rpcUrl, 'eth_getBalance', [ownerAddress, 'latest']);
  const tokenPromises: Array<Promise<StablecoinBalanceRow>> = route.tokens.map(async (token) => {
    const raw = await rpcCall(route.rpcUrl, 'eth_call', [
      {
        to: token.address,
        data: encodeBalanceOf(ownerAddress)
      },
      'latest'
    ]);
    const amount = atomicToNumber(raw, token.decimals);
    return {
      id: `${token.symbol}-${route.chainId}-${token.address}`,
      symbol: token.symbol,
      chainId: route.chainId,
      chainLabel: route.chainLabel,
      tokenAddress: token.address,
      amount,
      amountInUsd: amount
    } satisfies StablecoinBalanceRow;
  });
  const [nativeResult, ...tokenResults] = await Promise.allSettled([
    nativePromise,
    ...tokenPromises
  ]);
  const errors = tokenResults
    .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    .map((result) => `${route.chainLabel}: ${String(result.reason)}`);
  if (nativeResult.status === 'rejected') {
    errors.push(`${route.chainLabel} gas: ${String(nativeResult.reason)}`);
  }

  return {
    rows: tokenResults
      .filter((result): result is PromiseFulfilledResult<StablecoinBalanceRow> => result.status === 'fulfilled')
      .map((result) => result.value),
    native: nativeResult.status === 'fulfilled'
      ? {
          chainId: route.chainId,
          chainLabel: route.chainLabel,
          symbol: route.nativeSymbol,
          amount: atomicToNumber(nativeResult.value, 18)
        } satisfies NativeBalanceRow
      : null,
    errors
  };
}

export async function loadStablecoinRouteBalances(
  routes: StablecoinRoute[],
  ownerAddress: string
): Promise<StablecoinRouteBalances> {
  const results = await Promise.all(routes.map((route) => loadStablecoinRoute(route, ownerAddress)));
  return {
    rows: results.flatMap((result) => result.rows),
    nativeRows: results
      .map((result) => result.native)
      .filter((row): row is NativeBalanceRow => Boolean(row)),
    errors: results.flatMap((result) => result.errors)
  };
}

function toStablecoinSymbol(value: unknown): StablecoinSymbol | null {
  const symbol = String(value ?? '').toUpperCase();
  return symbol === 'USDC' || symbol === 'USDT' ? symbol : null;
}

function chainLabel(chainId: number | null) {
  if (chainId == null) return 'Supported networks';
  return CHAIN_LABELS[chainId] ?? `Chain ${chainId}`;
}

function buildChainRow(
  symbol: StablecoinSymbol,
  aggregation: UnifiedChainAssetBreakdown,
  index: number
): StablecoinBalanceRow | null {
  const amount = toFiniteNumber(aggregation.amount);
  const amountInUsd = toFiniteNumber(aggregation.amountInUSD) || amount;
  if (amount <= 0 && amountInUsd <= 0) return null;

  const chainId = Number.isFinite(Number(aggregation.token?.chainId))
    ? Number(aggregation.token?.chainId)
    : null;
  const tokenAddress = aggregation.token?.address || null;

  return {
    id: `${symbol}-${chainId ?? 'all'}-${tokenAddress ?? index}`,
    symbol,
    chainId,
    chainLabel: chainLabel(chainId),
    tokenAddress,
    amount,
    amountInUsd
  };
}

function buildAssetRows(asset: UnifiedAssetBreakdown, index: number) {
  const symbol = toStablecoinSymbol(asset.tokenType);
  if (!symbol) return [];

  const chainRows = (asset.chainAggregation ?? [])
    .map((aggregation, aggregationIndex) => buildChainRow(symbol, aggregation, aggregationIndex))
    .filter((row): row is StablecoinBalanceRow => Boolean(row));
  if (chainRows.length > 0) return chainRows;

  const amount = toFiniteNumber(asset.amount);
  const amountInUsd = toFiniteNumber(asset.amountInUSD) || amount;
  if (amount <= 0 && amountInUsd <= 0) return [];

  return [{
    id: `${symbol}-all-${index}`,
    symbol,
    chainId: null,
    chainLabel: chainLabel(null),
    tokenAddress: null,
    amount,
    amountInUsd
  } satisfies StablecoinBalanceRow];
}

export function normalizeUnifiedBalance(value: unknown): UnifiedBalance | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as UnifiedBalance;
  return Array.isArray(candidate.assets) ? candidate : null;
}

export function getStablecoinPortfolio(
  assets: UnifiedAssetBreakdown[],
  targetChainId: number
): StablecoinPortfolio {
  const rows = assets.flatMap(buildAssetRows);

  return {
    rows,
    totalUsd: rows.reduce((total, row) => total + row.amountInUsd, 0),
    targetUsdc: rows
      .filter((row) => row.symbol === 'USDC' && row.chainId === targetChainId)
      .reduce((total, row) => total + row.amount, 0)
  };
}

export function mergeStablecoinPortfolio(input: {
  particleAssets: UnifiedAssetBreakdown[];
  exactRows: StablecoinBalanceRow[];
  targetChainId: number;
}): StablecoinPortfolio {
  const particle = getStablecoinPortfolio(input.particleAssets, input.targetChainId);
  const exactKeys = new Set(
    input.exactRows.map((row) => `${row.symbol}:${row.chainId}`)
  );
  const rows = [
    ...input.exactRows,
    ...particle.rows.filter((row) => !exactKeys.has(`${row.symbol}:${row.chainId}`))
  ];
  return {
    rows,
    totalUsd: rows.reduce((total, row) => total + row.amountInUsd, 0),
    targetUsdc: rows
      .filter((row) => row.symbol === 'USDC' && row.chainId === input.targetChainId)
      .reduce((total, row) => total + row.amount, 0)
  };
}

export function withTargetUsdcBalance(
  portfolio: StablecoinPortfolio,
  input: {
    amount: number;
    chainId: number;
    chainLabel: string;
    tokenAddress: string;
  }
): StablecoinPortfolio {
  const otherRows = portfolio.rows.filter(
    (row) => !(row.symbol === 'USDC' && row.chainId === input.chainId)
  );
  const removedUsd = portfolio.rows
    .filter((row) => row.symbol === 'USDC' && row.chainId === input.chainId)
    .reduce((total, row) => total + row.amountInUsd, 0);
  const amount = Number.isFinite(input.amount) && input.amount > 0 ? input.amount : 0;

  return {
    rows: amount > 0
      ? [
          ...otherRows,
          {
            id: `USDC-${input.chainId}-${input.tokenAddress}`,
            symbol: 'USDC',
            chainId: input.chainId,
            chainLabel: input.chainLabel,
            tokenAddress: input.tokenAddress,
            amount,
            amountInUsd: amount
          }
        ]
      : otherRows,
    totalUsd: Math.max(0, portfolio.totalUsd - removedUsd) + amount,
    targetUsdc: amount
  };
}

export function formatUsdAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  }).format(value);
}

export function formatTokenAmount(value: number) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6
  }).format(value);
}
