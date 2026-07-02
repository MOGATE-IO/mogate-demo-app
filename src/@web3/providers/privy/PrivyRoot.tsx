import type { PropsWithChildren } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { PrivyProvider } from '@privy-io/expo';

import { MOBILE_ENV, hasPrivyConfig } from '@/config/env';

export function PrivyRoot({ children }: PropsWithChildren) {
  if (!hasPrivyConfig()) {
    return (
      <View style={styles.missing}>
        <Text style={styles.title}>Privy is not configured</Text>
        <Text style={styles.body}>
          Fill EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID to run the Privy RN
          probe.
        </Text>
        {children}
      </View>
    );
  }

  return (
    <PrivyProvider appId={MOBILE_ENV.privy.appId} clientId={MOBILE_ENV.privy.clientId}>
      {children}
    </PrivyProvider>
  );
}

const styles = StyleSheet.create({
  missing: {
    flex: 1,
    backgroundColor: '#070707'
  },
  title: {
    color: '#f5f2ea',
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 20
  },
  body: {
    color: '#bcb7ad',
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 20,
    paddingTop: 6
  }
});
