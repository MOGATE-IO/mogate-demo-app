import { Redirect } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { OnboardingScreen } from '@/screens/OnboardingScreen';

export default function OnboardingRoute() {
  const context = useMobileApp();

  if (context.wallet.snapshot.status === 'connected') {
    return <Redirect href="/" />;
  }

  return (
    <AppRouteFrame>
      <OnboardingScreen context={context} />
    </AppRouteFrame>
  );
}
