import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { SearchScreen } from '@/screens/SearchScreen';

export default function SearchRoute() {
  const context = useMobileApp();
  return (
    <AppRouteFrame scroll={false} tabbed>
      <SearchScreen context={context} />
    </AppRouteFrame>
  );
}
