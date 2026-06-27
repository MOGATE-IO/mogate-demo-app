import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Mogate UA Lab',
  slug: 'mogate-ua-lab',
  scheme: 'mogate-ua',
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  platforms: ['ios', 'android', 'web'],
  ios: {
    bundleIdentifier: 'io.mogate.ua.lab',
    supportsTablet: true,
    usesAppleSignIn: true,
    infoPlist: {
      NSFaceIDUsageDescription: 'Mogate uses Face ID to protect wallet signing sessions.'
    }
  },
  android: {
    package: 'io.mogate.ua.lab'
  },
  plugins: [
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
  extra: {
    apiBase: process.env.EXPO_API_BASE ?? 'http://localhost:4000',
    currentWalletStack: 'privy',
    defaultNetworkMode: 'mainnet'
  }
};

export default config;
