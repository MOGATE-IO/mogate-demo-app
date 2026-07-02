export type PortfolioNetworkKey = 'arbitrum' | 'ethereum' | 'base' | 'solana';

export type TokenBalance = {
  symbol: 'USDC' | 'USDT';
  amount: number;
  amountDisplay: string;
  usdValue: number;
};

export type NetworkBalance = {
  key: PortfolioNetworkKey;
  label: string;
  address: string;
  tokens: TokenBalance[];
  totalUsd: number;
  loadedAt: number;
};

type EvmTokenConfig = {
  symbol: TokenBalance['symbol'];
  address: `0x${string}`;
  decimals: number;
};

type EvmNetworkConfig = {
  key: Exclude<PortfolioNetworkKey, 'solana'>;
  label: string;
  rpcUrl: string;
  tokens: EvmTokenConfig[];
};

type SolanaTokenConfig = {
  symbol: TokenBalance['symbol'];
  mint: string;
};

const EVM_NETWORKS: Record<EvmNetworkConfig['key'], EvmNetworkConfig> = {
  arbitrum: {
    key: 'arbitrum',
    label: 'Arbitrum One',
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    tokens: [
      { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9', decimals: 6 }
    ]
  },
  ethereum: {
    key: 'ethereum',
    label: 'Ethereum',
    rpcUrl: 'https://ethereum.publicnode.com',
    tokens: [
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 }
    ]
  },
  base: {
    key: 'base',
    label: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    tokens: [
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 }
    ]
  }
};

const SOLANA_NETWORK = {
  key: 'solana' as const,
  label: 'Solana',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  tokens: [
    { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkYDPwYbXxQ4nM1vK' }
  ] satisfies SolanaTokenConfig[]
};

export const PORTFOLIO_NETWORK_ORDER: PortfolioNetworkKey[] = ['arbitrum', 'ethereum', 'base', 'solana'];

export function getPortfolioNetworkLabel(key: PortfolioNetworkKey) {
  return key === 'solana' ? SOLANA_NETWORK.label : EVM_NETWORKS[key].label;
}

function ensureAddress(value: string, network: string) {
  if (!value) throw new Error(`Connect a ${network} wallet first.`);
}

async function rpcCall<T>(url: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `${method}-${Date.now()}`,
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(`RPC request failed ${response.status}.`);
  }

  const body = (await response.json()) as { error?: { message?: string }; result?: T };
  if (body.error) throw new Error(body.error.message || 'RPC returned an error.');
  return body.result as T;
}

function encodeBalanceOf(owner: string) {
  const normalized = owner.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
  return `0x70a08231${normalized}` as `0x${string}`;
}

function bigintToDecimal(raw: bigint, decimals: number) {
  const sign = raw < 0n ? '-' : '';
  const value = raw < 0n ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const fraction = (value % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return Number(`${sign}${whole.toString()}${fraction ? `.${fraction}` : ''}`);
}

function formatStableAmount(amount: number) {
  if (!Number.isFinite(amount)) return '0.00';
  if (amount > 0 && amount < 0.0001) return '<0.0001';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: amount < 1 ? 6 : 2,
    minimumFractionDigits: 2
  }).format(amount);
}

function tokenBalance(symbol: TokenBalance['symbol'], amount: number): TokenBalance {
  return {
    symbol,
    amount,
    amountDisplay: formatStableAmount(amount),
    usdValue: amount
  };
}

async function loadEvmNetworkBalance(key: EvmNetworkConfig['key'], address: string): Promise<NetworkBalance> {
  ensureAddress(address, EVM_NETWORKS[key].label);
  const network = EVM_NETWORKS[key];
  const tokens = await Promise.all(
    network.tokens.map(async (token) => {
      const raw = await rpcCall<`0x${string}`>(network.rpcUrl, 'eth_call', [
        {
          to: token.address,
          data: encodeBalanceOf(address)
        },
        'latest'
      ]);
      const amount = bigintToDecimal(BigInt(raw || '0x0'), token.decimals);
      return tokenBalance(token.symbol, amount);
    })
  );
  const totalUsd = tokens.reduce((sum, token) => sum + token.usdValue, 0);
  return {
    key,
    label: network.label,
    address,
    tokens,
    totalUsd,
    loadedAt: Date.now()
  };
}

async function loadSolanaTokenBalance(address: string, token: SolanaTokenConfig) {
  const result = await rpcCall<any>(SOLANA_NETWORK.rpcUrl, 'getTokenAccountsByOwner', [
    address,
    { mint: token.mint },
    { encoding: 'jsonParsed' }
  ]);
  const rows = Array.isArray(result?.value) ? result.value : [];
  const amount = rows.reduce((sum: number, row: any) => {
    const next = Number(row?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString ?? 0);
    return Number.isFinite(next) ? sum + next : sum;
  }, 0);
  return tokenBalance(token.symbol, amount);
}

async function loadSolanaNetworkBalance(address: string): Promise<NetworkBalance> {
  ensureAddress(address, SOLANA_NETWORK.label);
  const tokens = await Promise.all(
    SOLANA_NETWORK.tokens.map((token) => loadSolanaTokenBalance(address, token))
  );
  const totalUsd = tokens.reduce((sum, token) => sum + token.usdValue, 0);
  return {
    key: 'solana',
    label: SOLANA_NETWORK.label,
    address,
    tokens,
    totalUsd,
    loadedAt: Date.now()
  };
}

export async function loadNetworkBalance(input: {
  network: PortfolioNetworkKey;
  evmAddress?: string | null;
  solanaAddress?: string | null;
}) {
  if (input.network === 'solana') {
    return loadSolanaNetworkBalance(input.solanaAddress || '');
  }
  return loadEvmNetworkBalance(input.network, input.evmAddress || '');
}
