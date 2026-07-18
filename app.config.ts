import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mogate UA Lab',
  slug: 'mogate-ua-lab',
  scheme: 'mogate-ua',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  platforms: ['ios', 'android', 'web'],
  ios: {
    bundleIdentifier: 'io.mogate.ua.lab',
    supportsTablet: true,
    usesAppleSignIn: true,
    entitlements: {
      'keychain-access-groups': ['$(AppIdentifierPrefix)io.mogate.ua.lab']
    },
    infoPlist: {
      NSFaceIDUsageDescription: 'Mogate uses Face ID to protect wallet signing sessions.'
    }
  },
  android: {
    package: 'io.mogate.ua.lab'
  },
  web: {
    bundler: 'metro'
  },
  plugins: [
    'expo-router',
    'expo-apple-authentication',
    'expo-dev-client',
    'expo-secure-store',
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 24,
          compileSdkVersion: 36,
          targetSdkVersion: 35,
          kotlinVersion: '2.1.20'
        },
        ios: {
          deploymentTarget: '16.4'
        }
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    apiBase: process.env.EXPO_API_BASE ?? 'http://localhost:4000',
    currentWalletStack: 'privy',
    defaultNetworkMode: 'mainnet'
  }
};

export default config;
