import { Redirect, useRouter } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { ReceiveQrScreen } from '@/screens/ReceiveQrScreen';

export default function ReceiveQrRoute() {
  const context = useMobileApp();
  const router = useRouter();
  if (context.wallet.snapshot.status !== 'connected') return <Redirect href="/onboarding" />;
  return (
    <AppRouteFrame scroll={false}>
      <ReceiveQrScreen context={context} onBack={() => router.back()} />
    </AppRouteFrame>
  );
}
