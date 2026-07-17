import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';

import { AppRouteFrame } from '@/components/AppRouteFrame.ui';
import { RouteState } from '@/components/RouteState.ui';
import { isAccountSection } from '@/navigation/account';
import { useMobileApp } from '@/providers/MobileAppProvider';
import { AccountSectionScreen } from '@/screens/AccountSectionScreen';

export default function AccountSectionRoute() {
  const context = useMobileApp();
  const router = useRouter();
  const params = useLocalSearchParams<{ section?: string | string[] }>();
  const sectionValue = Array.isArray(params.section) ? params.section[0] : params.section;

  if (context.wallet.snapshot.status !== 'connected') {
    return <Redirect href="/onboarding" />;
  }

  if (!sectionValue || !isAccountSection(sectionValue)) {
    return (
      <AppRouteFrame scroll={false}>
        <RouteState
          actionLabel="Back to catalogue"
          body="This account section is unavailable."
          onAction={() => context.goToTab('catalogue')}
          title="Account page not found"
        />
      </AppRouteFrame>
    );
  }

  return (
    <AppRouteFrame scroll={false}>
      <AccountSectionScreen onBack={() => router.back()} section={sectionValue} />
    </AppRouteFrame>
  );
}
