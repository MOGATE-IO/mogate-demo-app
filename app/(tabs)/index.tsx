import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { CatalogueScreen } from '@/screens/CatalogueScreen';

export default function CatalogueRoute() {
  const context = useMobileApp();
  return (
    <AppRouteFrame scroll={false} tabbed>
      <CatalogueScreen context={context} />
    </AppRouteFrame>
  );
}
