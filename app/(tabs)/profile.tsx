import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { ProfileScreen } from '@/screens/ProfileScreen';

export default function ProfileRoute() {
  const context = useMobileApp();
  return (
    <AppRouteFrame tabbed>
      <ProfileScreen context={context} />
    </AppRouteFrame>
  );
}
