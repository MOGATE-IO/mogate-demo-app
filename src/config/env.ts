export type GatewayVersion = 'v0' | 'signed-v1' | 'signed-v2';
export type UaNetworkMode = 'testnet-proof' | 'mainnet-smoke';

export function readEnv(key: string, fallback = '') {
  const value = process.env[key];
  return value == null || value === '' ? fallback : value;
}

export function readBoolEnv(key: string, fallback: boolean) {
  const value = readEnv(key);
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function readGatewayVersion(): GatewayVersion {
  const value = readEnv('EXPO_PUBLIC_MINT_GATEWAY_VERSION', 'signed-v2');
  return value === 'v0' || value === 'signed-v1' || value === 'signed-v2'
    ? value
    : 'signed-v2';
}

export const EXPO_API_BASE = readEnv('EXPO_API_BASE', 'http://localhost:4000');

export const MOBILE_ENV = {
  apiBase: EXPO_API_BASE,
  simulatorPreview: {
    enabled: readBoolEnv('EXPO_PUBLIC_SIMULATOR_PREVIEW', false),
    ownerAddress: readEnv(
      'EXPO_PUBLIC_SIMULATOR_PREVIEW_ADDRESS',
      '0x3024C1E1D91Ab3730bed94610CC1CdD546702D80'
    ),
    solanaAddress: readEnv(
      'EXPO_PUBLIC_SIMULATOR_PREVIEW_SOLANA_ADDRESS',
      '4d52srue9oorS1UpnKVbbXkwRk2yhn4ggE8LaqmWZvZF'
    )
  },
  privy: {
    appId: readEnv('EXPO_PUBLIC_PRIVY_APP_ID'),
    clientId: readEnv('EXPO_PUBLIC_PRIVY_CLIENT_ID')
  },
  dynamic: {
    environmentId: readEnv('EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID')
  },
  particle: {
    projectId: readEnv('EXPO_PUBLIC_PARTICLE_PROJECT_ID'),
    clientKey: readEnv('EXPO_PUBLIC_PARTICLE_CLIENT_KEY'),
    appId: readEnv('EXPO_PUBLIC_PARTICLE_APP_ID'),
    env: readEnv('EXPO_PUBLIC_PARTICLE_ENV', 'production') === 'staging'
      ? 'staging'
      : 'production'
  },
  gateway: {
    version: readGatewayVersion(),
    signedAddress: readEnv('EXPO_PUBLIC_FUNDED_GATEWAY_ADDRESS'),
    fundedCollection: readEnv('EXPO_PUBLIC_FUNDED_GIFTCARD_COLLECTION')
  }
} as const;

export function hasPrivyConfig() {
  return Boolean(MOBILE_ENV.privy.appId && MOBILE_ENV.privy.clientId);
}
