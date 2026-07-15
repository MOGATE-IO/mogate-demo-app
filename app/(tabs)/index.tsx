import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { HomeScreen } from '@/screens/HomeScreen';

export default function HomeRoute() {
  const context = useMobileApp();
  return (
    <AppRouteFrame tabbed>
      <HomeScreen context={context} />
    </AppRouteFrame>
  );
}
