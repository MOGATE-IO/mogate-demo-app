export type GatewayVersion = 'v0' | 'v2';
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

export const EXPO_API_BASE = readEnv('EXPO_API_BASE', 'http://localhost:4000');

export const MOBILE_ENV = {
  apiBase: EXPO_API_BASE,
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
  }
} as const;

export function hasPrivyConfig() {
  return Boolean(MOBILE_ENV.privy.appId && MOBILE_ENV.privy.clientId);
}
