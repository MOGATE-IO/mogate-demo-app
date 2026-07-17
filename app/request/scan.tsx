import { Redirect, useRouter } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { ScanCodeScreen } from '@/screens/ScanCodeScreen';

export default function ScanCodeRoute() {
  const context = useMobileApp();
  const router = useRouter();
  if (context.wallet.snapshot.status !== 'connected') return <Redirect href="/onboarding" />;
  return (
    <AppRouteFrame scroll={false}>
      <ScanCodeScreen onBack={() => router.back()} />
    </AppRouteFrame>
  );
}
