import type { ReactNode } from 'react';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { WalletAdapter } from '@/types/wallet';

type PrivyBridgeProps = {
  profile: RuntimeNetworkProfile;
  children: (adapter: WalletAdapter | null) => ReactNode;
};

export function PrivyBridge({ children }: PrivyBridgeProps) {
  return <>{children(null)}</>;
}
