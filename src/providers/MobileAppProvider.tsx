import { createContext, useContext, useState, type PropsWithChildren } from 'react';

import { MagicBridge } from '@/@web3/providers/magic/MagicBridge';
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
    <MagicBridge profile={profile}>
      {(magicAdapter) => (
        <MobileAppControllerProvider
          key={profile.mode}
          networkMode={networkMode}
          magicAdapter={simulatorPreviewAdapter ?? magicAdapter}
          profile={profile}
          setNetworkMode={setNetworkMode}
        >
          {children}
        </MobileAppControllerProvider>
      )}
    </MagicBridge>
  );
}

function MobileAppControllerProvider({
  children,
  networkMode,
  magicAdapter,
  profile,
  setNetworkMode
}: PropsWithChildren<{
  networkMode: AppNetworkMode;
  magicAdapter?: WalletAdapter | null;
  profile: ReturnType<typeof getNetworkProfile>;
  setNetworkMode: (mode: AppNetworkMode) => void;
}>) {
  const controller = useMobileAppController({
    networkMode,
    magicAdapter,
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
