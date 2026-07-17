import { Redirect, useRouter } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { RequestPaymentScreen } from '@/screens/RequestPaymentScreen';

export default function RequestPaymentRoute() {
  const context = useMobileApp();
  const router = useRouter();
  if (context.wallet.snapshot.status !== 'connected') return <Redirect href="/onboarding" />;
  return (
    <AppRouteFrame scroll={false}>
      <RequestPaymentScreen context={context} onBack={() => router.back()} />
    </AppRouteFrame>
  );
}
