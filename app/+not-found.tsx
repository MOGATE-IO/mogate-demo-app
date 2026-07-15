import { useRouter } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { RouteState } from '@/components/RouteState.ui';

export default function NotFoundRoute() {
  const router = useRouter();
  return (
    <AppRouteFrame scroll={false}>
      <RouteState
        actionLabel="Go home"
        body="The requested mobile route does not exist."
        onAction={() => router.replace('/')}
        title="Screen not found"
      />
    </AppRouteFrame>
  );
}
