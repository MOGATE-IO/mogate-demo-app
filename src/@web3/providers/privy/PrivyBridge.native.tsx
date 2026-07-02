import type { ReactNode } from 'react';
import { PrivyProvider } from '@privy-io/expo';
import { PrivyElements } from '@privy-io/expo/ui';

import { hasPrivyProfileConfig, type RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { WalletAdapter } from '@/@web3/types/wallet';
import { usePrivyWalletAdapter } from './usePrivyWalletAdapter';

type PrivyBridgeProps = {
  profile: RuntimeNetworkProfile;
  children: (adapter: WalletAdapter | null) => ReactNode;
};

function PrivyBound({ children }: { children: (adapter: WalletAdapter | null) => ReactNode }) {
  const adapter = usePrivyWalletAdapter();
  return <>{children(adapter)}</>;
}

export function PrivyBridge({ children, profile }: PrivyBridgeProps) {
  if (!hasPrivyProfileConfig(profile)) return <>{children(null)}</>;

  return (
    <PrivyProvider
      key={`${profile.mode}:${profile.privy.appId}:${profile.privy.clientId}`}
      appId={profile.privy.appId}
      clientId={profile.privy.clientId}
      config={{
        embedded: {
          ethereum: {
            createOnLogin: 'users-without-wallets'
          }
        }
      }}
    >
      <PrivyElements
        config={{
          appearance: {
            accentColor: '#171512',
            colorScheme: 'light'
          }
        }}
      />
      <PrivyBound>{children}</PrivyBound>
    </PrivyProvider>
  );
}
