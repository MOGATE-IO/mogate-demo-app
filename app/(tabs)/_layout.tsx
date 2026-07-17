import { Redirect, Tabs } from 'expo-router';

import { BottomTabBar } from '@/components/BottomTabBar.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';

export default function TabLayout() {
  const { wallet } = useMobileApp();

  if (wallet.snapshot.status !== 'connected') {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <BottomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Catalogue' }} />
      <Tabs.Screen name="updates" options={{ title: 'Updates' }} />
      <Tabs.Screen name="request" options={{ title: 'Request' }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Cards' }} />
    </Tabs>
  );
}
