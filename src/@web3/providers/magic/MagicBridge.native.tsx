import type { ReactNode } from 'react';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { WalletAdapter } from '@/@web3/types/wallet';
import { useMagicWalletAdapter } from './useMagicWalletAdapter';

type MagicBridgeProps = {
  profile: RuntimeNetworkProfile;
  children: (adapter: WalletAdapter | null) => ReactNode;
};

export function MagicBridge({ children, profile }: MagicBridgeProps) {
  const { adapter, relayer: Relayer } = useMagicWalletAdapter(profile);
  return <>{Relayer ? <Relayer backgroundColor="#ffffff" /> : null}{children(adapter)}</>;
}
