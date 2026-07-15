import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { RequestPaymentScreen } from '@/screens/RequestPaymentScreen';

export default function RequestRoute() {
  const context = useMobileApp();
  return (
    <AppRouteFrame tabbed>
      <RequestPaymentScreen context={context} />
    </AppRouteFrame>
  );
}
