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
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="request" options={{ title: 'Request' }} />
      <Tabs.Screen name="inventory" options={{ title: 'Cards' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
