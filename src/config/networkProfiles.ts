import { MOBILE_ENV, type GatewayVersion, type UaNetworkMode } from '@/config/env';
import type { HexString } from '@/types/wallet';

export type AppNetworkMode = 'testnet' | 'mainnet';

export const DEFAULT_NETWORK_MODE: AppNetworkMode = 'mainnet';

export type ParticleProjectConfig = {
  projectId: string;
  clientKey: string;
  appId: string;
  env: 'production' | 'staging';
};

export type RuntimeNetworkProfile = {
  mode: AppNetworkMode;
  label: string;
  description: string;
  apiBase: string;
  paths: {
    checkout: string;
    checkoutReconcile: string;
    catalogue: string;
    privyOnrampSession: string;
    transakSession: string;
  };
  checkoutEndpoint: string;
  checkoutReconcileEndpoint: string;
  catalogueEndpoint: string;
  privy: {
    appId: string;
    clientId: string;
  };
  particle: ParticleProjectConfig;
  ua: {
    targetChainId: number;
    chainLabel: string;
    networkName: string;
    networkMode: UaNetworkMode;
    allowUnlistedTestnet: boolean;
    mode: 'eip7702-in-place';
    expectTokenType: string;
    expectTokenAmount: string;
  };
  gateway: {
    version: GatewayVersion;
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
  checkout: '/api/checkouts/unsafe-arbitrum',
  checkoutReconcile: '/api/checkouts/reconcile',
  catalogue: '/api/giftcards/catalogue',
  privyOnrampSession: '/api/privy/onramp/session',
  transakSession: '/api/transak/session'
} as const;

const PARTICLE_UA_PROJECT: ParticleProjectConfig = {
  projectId: '',
  clientKey: '',
  appId: '',
  env: 'production'
};

function apiUrl(path: string) {
  return `${MOBILE_ENV.apiBase.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

const TESTNET_GATEWAY = {
  version: 'v2',
  v2Address: '' as HexString | '',
  fundedCollection: '' as HexString | ''
} as const;

const MAINNET_GATEWAY = {
  version: 'v2',
  v2Address: '' as HexString | '',
  fundedCollection: '' as HexString | ''
} as const;

export const NETWORK_PROFILES: Record<AppNetworkMode, RuntimeNetworkProfile> = {
  testnet: {
    mode: 'testnet',
    label: 'Testnet',
    description: 'Sandbox profile for Privy login, Privy top-up, Particle UA proof, and Arbitrum Sepolia minting.',
    apiBase: MOBILE_ENV.apiBase,
    paths: API_PATHS,
    checkoutEndpoint: apiUrl(API_PATHS.checkout),
    checkoutReconcileEndpoint: apiUrl(API_PATHS.checkoutReconcile),
    catalogueEndpoint: apiUrl(API_PATHS.catalogue),
    privy: MOBILE_ENV.privy,
    particle: PARTICLE_UA_PROJECT,
    ua: {
      targetChainId: 421614,
      chainLabel: 'Arbitrum Sepolia',
      networkName: 'arbitrum-sepolia',
      networkMode: 'testnet-proof',
      allowUnlistedTestnet: false,
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
    description: 'Default profile for Privy login, Privy top-up, and Arbitrum One checkout routing.',
    apiBase: MOBILE_ENV.apiBase,
    paths: API_PATHS,
    checkoutEndpoint: apiUrl(API_PATHS.checkout),
    checkoutReconcileEndpoint: apiUrl(API_PATHS.checkoutReconcile),
    catalogueEndpoint: apiUrl(API_PATHS.catalogue),
    privy: MOBILE_ENV.privy,
    particle: PARTICLE_UA_PROJECT,
    ua: {
      targetChainId: 42161,
      chainLabel: 'Arbitrum One',
      networkName: 'arbitrum',
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
