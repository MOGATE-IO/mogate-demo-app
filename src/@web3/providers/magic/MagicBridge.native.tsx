import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { WalletAdapter } from '@/@web3/types/wallet';
import { useMagicWalletAdapter } from './useMagicWalletAdapter';

type MagicBridgeProps = {
  profile: RuntimeNetworkProfile;
  children: (adapter: WalletAdapter | null) => ReactNode;
};

export function MagicBridge({ children, profile }: MagicBridgeProps) {
  const { adapter, relayer: Relayer, relayerInteractive } = useMagicWalletAdapter(profile);
  return (
    <>
      {Relayer ? (
        // Magic keeps its full-screen WebView mounted while hidden. Disable
        // native hit testing until a wallet operation actually needs it.
        <View
          pointerEvents={relayerInteractive ? 'box-none' : 'none'}
          style={[styles.relayer, relayerInteractive ? styles.relayerVisible : styles.relayerHidden]}
        >
          <Relayer backgroundColor="#ffffff" />
        </View>
      ) : null}
      {children(adapter)}
    </>
  );
}

const styles = StyleSheet.create({
  relayer: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0
  },
  relayerHidden: {
    elevation: 0,
    zIndex: -10_000
  },
  relayerVisible: {
    elevation: 10_000,
    zIndex: 10_000
  }
});
