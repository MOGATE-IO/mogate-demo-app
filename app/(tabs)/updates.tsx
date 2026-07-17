import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { UpdatesScreen } from '@/screens/UpdatesScreen';

export default function UpdatesRoute() {
  const context = useMobileApp();
  return (
    <AppRouteFrame scroll={false} tabbed>
      <UpdatesScreen context={context} />
    </AppRouteFrame>
  );
}
