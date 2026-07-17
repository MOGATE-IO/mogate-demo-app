import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { RequestHubScreen } from '@/screens/RequestHubScreen';

export default function RequestRoute() {
  const context = useMobileApp();
  return (
    <AppRouteFrame scroll={false} tabbed>
      <RequestHubScreen context={context} />
    </AppRouteFrame>
  );
}
