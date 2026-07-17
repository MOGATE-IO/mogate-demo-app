import { Redirect } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { ProfileScreen } from '@/screens/ProfileScreen';

export default function ProfileRoute() {
  const context = useMobileApp();

  if (context.wallet.snapshot.status !== 'connected') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <AppRouteFrame scroll={false}>
      <ProfileScreen context={context} />
    </AppRouteFrame>
  );
}
