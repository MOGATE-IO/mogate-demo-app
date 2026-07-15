import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { InventoryScreen } from '@/screens/InventoryScreen';

export default function InventoryRoute() {
  const context = useMobileApp();
  return (
    <AppRouteFrame scroll={false} tabbed>
      <InventoryScreen context={context} />
    </AppRouteFrame>
  );
}
