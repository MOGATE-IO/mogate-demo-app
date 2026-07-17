import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import { PrivyBridge } from '@/@web3/providers/privy/PrivyBridge';
import { createSimulatorPreviewAdapter } from '@/@web3/providers/preview/simulatorPreviewAdapter';
import type { WalletAdapter } from '@/@web3/types/wallet';
import { MOBILE_ENV } from '@/config/env';
import {
  DEFAULT_NETWORK_MODE,
  getNetworkProfile,
  type AppNetworkMode
} from '@/config/networkProfiles';
import {
  useMobileAppController,
  type MobileAppController
} from '@/hooks/useMobileAppController';

const MobileAppContext = createContext<MobileAppController | null>(null);
const simulatorPreviewAdapter = MOBILE_ENV.simulatorPreview.enabled && process.env.NODE_ENV !== 'production'
  ? createSimulatorPreviewAdapter(
      MOBILE_ENV.simulatorPreview.ownerAddress,
      MOBILE_ENV.simulatorPreview.solanaAddress
    )
  : null;

export function MobileAppProvider({ children }: PropsWithChildren) {
  const [networkMode, setNetworkMode] = useState<AppNetworkMode>(DEFAULT_NETWORK_MODE);
  const profile = getNetworkProfile(networkMode);

  return (
    <PrivyBridge profile={profile}>
      {(privyAdapter) => (
        <MobileAppControllerProvider
          key={profile.mode}
          networkMode={networkMode}
          privyAdapter={simulatorPreviewAdapter ?? privyAdapter}
          profile={profile}
          setNetworkMode={setNetworkMode}
        >
          {children}
        </MobileAppControllerProvider>
      )}
    </PrivyBridge>
  );
}

function MobileAppControllerProvider({
  children,
  networkMode,
  privyAdapter,
  profile,
  setNetworkMode
}: PropsWithChildren<{
  networkMode: AppNetworkMode;
  privyAdapter?: WalletAdapter | null;
  profile: ReturnType<typeof getNetworkProfile>;
  setNetworkMode: (mode: AppNetworkMode) => void;
}>) {
  const controller = useMobileAppController({
    networkMode,
    privyAdapter,
    profile,
    setNetworkMode
  });

  return (
    <MobileAppContext.Provider value={controller}>
      {children}
    </MobileAppContext.Provider>
  );
}

export function useMobileApp() {
  const context = useContext(MobileAppContext);
  if (!context) {
    throw new Error('useMobileApp must be used inside MobileAppProvider.');
  }
  return context;
}
