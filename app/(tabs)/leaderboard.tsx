import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { LeaderboardScreen } from '@/screens/LeaderboardScreen';

export default function LeaderboardRoute() {
  return (
    <AppRouteFrame scroll={false} tabbed>
      <LeaderboardScreen />
    </AppRouteFrame>
  );
}
