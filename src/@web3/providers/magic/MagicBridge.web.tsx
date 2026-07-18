import type { ReactNode } from 'react';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { WalletAdapter } from '@/@web3/types/wallet';

type MagicBridgeProps = {
  profile: RuntimeNetworkProfile;
  children: (adapter: WalletAdapter | null) => ReactNode;
};

export function MagicBridge({ children }: MagicBridgeProps) {
  return <>{children(null)}</>;
}
