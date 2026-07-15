import { Redirect } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { ProfileAboutScreen } from '@/screens/ProfileAboutScreen';

export default function ProfileAboutRoute() {
  const context = useMobileApp();

  if (context.wallet.snapshot.status !== 'connected') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AppRouteFrame>
      <ProfileAboutScreen context={context} />
    </AppRouteFrame>
  );
}
