import { MOBILE_ENV, type GatewayVersion, type UaNetworkMode } from '@/config/env';
import type { HexString } from '@/@web3/types/wallet';

export type AppNetworkMode = 'testnet' | 'mainnet';

export const DEFAULT_NETWORK_MODE: AppNetworkMode = 'testnet';

export type ParticleProjectConfig = {
  projectId: string;
  clientKey: string;
  appId: string;
  env: 'production' | 'staging';
};

export type StablecoinRouteToken = {
  symbol: 'USDC' | 'USDT';
  address: HexString;
  decimals: number;
};

export type StablecoinRoute = {
  chainId: number;
  chainLabel: string;
  shortLabel: string;
  rpcUrl: string;
  nativeSymbol: 'ETH';
  tokens: StablecoinRouteToken[];
};

export type RuntimeNetworkProfile = {
  mode: AppNetworkMode;
  label: string;
  description: string;
  apiBase: string;
  paths: {
    checkoutInit: string;
    checkout: string;
    checkoutReconcile: string;
    catalogue: string;
    privyOnrampSession: string;
    transakSession: string;
  };
  checkoutInitEndpoint: string;
  checkoutEndpoint: string;
  checkoutReconcileEndpoint: string;
  catalogueEndpoint: string;
  privy: {
    appId: string;
    clientId: string;
  };
  particle: ParticleProjectConfig;
  stablecoinRoutes: StablecoinRoute[];
  ua: {
    targetChainId: number;
    chainLabel: string;
    networkName: string;
    rpcUrl: string;
    networkMode: UaNetworkMode;
    allowUnlistedTestnet: boolean;
    mode: 'eip7702-in-place';
    expectTokenType: string;
    expectTokenAmount: string;
  };
  gateway: {
    version: GatewayVersion;
    legacyAddress: HexString | '';
    legacyCollection: HexString | '';
    v2Address: HexString | '';
    fundedCollection: HexString | '';
  };
  onramp: {
    primaryProvider: 'privy';
    fallbackProvider: 'transak';
    defaultAmount: string;
    defaultAsset: 'USDC' | 'native-currency';
  };
};

const API_PATHS = {
  checkoutInit: '/giftcard/checkout/init',
  checkout: '/giftcard/checkout/create',
  checkoutReconcile: '/api/checkouts/reconcile',
  catalogue: '/mogate/giftcard/brands',
  privyOnrampSession: '/api/privy/onramp/session',
  transakSession: '/api/transak/session'
} as const;

const PARTICLE_UA_PROJECT: ParticleProjectConfig = {
  projectId: MOBILE_ENV.particle.projectId,
  clientKey: MOBILE_ENV.particle.clientKey,
  appId: MOBILE_ENV.particle.appId,
  env: MOBILE_ENV.particle.env
};

const TESTNET_STABLECOIN_ROUTES: StablecoinRoute[] = [
  {
    chainId: 11155111,
    chainLabel: 'Ethereum Sepolia',
    shortLabel: 'Ethereum',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    nativeSymbol: 'ETH',
    tokens: [
      {
        symbol: 'USDC',
        address: '0x16369CD4B9533795dCdc0D67DB3E4c621ef97D68',
        decimals: 6
      }
    ]
  },
  {
    chainId: 421614,
    chainLabel: 'Arbitrum Sepolia',
    shortLabel: 'Arbitrum',
    rpcUrl: 'https://arbitrum-sepolia-rpc.publicnode.com',
    nativeSymbol: 'ETH',
    tokens: [
      {
        symbol: 'USDC',
        address: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
        decimals: 6
      }
    ]
  }
];

const MAINNET_STABLECOIN_ROUTES: StablecoinRoute[] = [
  {
    chainId: 1,
    chainLabel: 'Ethereum',
    shortLabel: 'Ethereum',
    rpcUrl: 'https://ethereum.publicnode.com',
    nativeSymbol: 'ETH',
    tokens: [
      { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
      { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 }
    ]
  },
  {
    chainId: 8453,
    chainLabel: 'Base',
    shortLabel: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    nativeSymbol: 'ETH',
    tokens: [
      { symbol: 'USDC', address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', decimals: 6 },
      { symbol: 'USDT', address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', decimals: 6 }
    ]
  },
  {
    chainId: 42161,
    chainLabel: 'Arbitrum',
    shortLabel: 'Arbitrum',
    rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
    nativeSymbol: 'ETH',
    tokens: [
      { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6 },
      { symbol: 'USDT', address: '0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9', decimals: 6 }
    ]
  }
];

function apiUrl(path: string) {
  return `${MOBILE_ENV.apiBase.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

const TESTNET_GATEWAY = {
  version: 'v2',
  legacyAddress: '0xA91D70aE85af28Efc23D5d90348a72A08C56056A' as HexString,
  legacyCollection: '0x4cf031C2ecf8ee6b08bF7ab16a49636A0FADBF9D' as HexString,
  v2Address: '' as HexString | '',
  fundedCollection: '' as HexString | ''
} as const;

const MAINNET_GATEWAY = {
  version: 'v2',
  legacyAddress: '' as HexString | '',
  legacyCollection: '' as HexString | '',
  v2Address: '' as HexString | '',
  fundedCollection: '' as HexString | ''
} as const;

export const NETWORK_PROFILES: Record<AppNetworkMode, RuntimeNetworkProfile> = {
  testnet: {
    mode: 'testnet',
    label: 'Testnet',
    description: 'Sandbox profile for Privy login, direct USDC payment, and Ethereum Sepolia voucher minting.',
    apiBase: MOBILE_ENV.apiBase,
    paths: API_PATHS,
    checkoutInitEndpoint: apiUrl(API_PATHS.checkoutInit),
    checkoutEndpoint: apiUrl(API_PATHS.checkout),
    checkoutReconcileEndpoint: apiUrl(API_PATHS.checkoutReconcile),
    catalogueEndpoint: apiUrl(API_PATHS.catalogue),
    privy: MOBILE_ENV.privy,
    particle: PARTICLE_UA_PROJECT,
    stablecoinRoutes: TESTNET_STABLECOIN_ROUTES,
    ua: {
      targetChainId: 11155111,
      chainLabel: 'Ethereum Sepolia',
      networkName: 'ethereum-sepolia',
      rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
      networkMode: 'testnet-proof',
      allowUnlistedTestnet: true,
      mode: 'eip7702-in-place',
      expectTokenType: '',
      expectTokenAmount: ''
    },
    gateway: TESTNET_GATEWAY,
    onramp: {
      primaryProvider: 'privy',
      fallbackProvider: 'transak',
      defaultAmount: '25',
      defaultAsset: 'USDC'
    }
  },
  mainnet: {
    mode: 'mainnet',
    label: 'Mainnet',
    description: 'Manual mainnet-smoke profile for Privy login, Privy top-up, and Arbitrum One checkout routing.',
    apiBase: MOBILE_ENV.apiBase,
    paths: API_PATHS,
    checkoutInitEndpoint: apiUrl(API_PATHS.checkoutInit),
    checkoutEndpoint: apiUrl(API_PATHS.checkout),
    checkoutReconcileEndpoint: apiUrl(API_PATHS.checkoutReconcile),
    catalogueEndpoint: apiUrl(API_PATHS.catalogue),
    privy: MOBILE_ENV.privy,
    particle: PARTICLE_UA_PROJECT,
    stablecoinRoutes: MAINNET_STABLECOIN_ROUTES,
    ua: {
      targetChainId: 42161,
      chainLabel: 'Arbitrum One',
      networkName: 'arbitrum',
      rpcUrl: 'https://arbitrum-one-rpc.publicnode.com',
      networkMode: 'mainnet-smoke',
      allowUnlistedTestnet: false,
      mode: 'eip7702-in-place',
      expectTokenType: '',
      expectTokenAmount: ''
    },
    gateway: MAINNET_GATEWAY,
    onramp: {
      primaryProvider: 'privy',
      fallbackProvider: 'transak',
      defaultAmount: '50',
      defaultAsset: 'USDC'
    }
  }
};

export function getNetworkProfile(mode: AppNetworkMode) {
  return NETWORK_PROFILES[mode];
}

export function getDefaultNetworkProfile() {
  return getNetworkProfile(DEFAULT_NETWORK_MODE);
}

export function hasPrivyProfileConfig(profile: RuntimeNetworkProfile) {
  return Boolean(profile.privy.appId && profile.privy.clientId);
}

export function hasParticleProjectConfig(profile: RuntimeNetworkProfile) {
  return Boolean(profile.particle.projectId && profile.particle.clientKey && profile.particle.appId);
}
