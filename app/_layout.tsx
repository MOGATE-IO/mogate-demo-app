import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { HeroUINativeProvider, type HeroUINativeConfig } from 'heroui-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

import '../global.css';

import { AppOverlays } from '@/components/AppOverlays.ui';
import { MobileAppProvider } from '@/providers/MobileAppProvider';

Uniwind.setTheme('light');

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)'
};

const HERO_UI_CONFIG: HeroUINativeConfig = {
  textProps: {
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.35
  },
  toast: false,
  devInfo: {
    stylingPrinciples: false
  }
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <HeroUINativeProvider config={HERO_UI_CONFIG}>
          <StatusBar style="dark" />
          <MobileAppProvider>
            <Stack screenOptions={{ contentStyle: { backgroundColor: '#f5f5f5' } }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="onboarding"
                options={{ animation: 'fade', headerShown: false, presentation: 'fullScreenModal' }}
              />
              <Stack.Screen
                name="mint/[merchantId]"
                options={{ animation: 'slide_from_right', headerShown: false, presentation: 'card' }}
              />
              <Stack.Screen name="profile/index" options={{ animation: 'slide_from_right', headerShown: false }} />
              <Stack.Screen name="profile/about" options={{ headerShown: false }} />
              <Stack.Screen name="account/[section]" options={{ animation: 'slide_from_right', headerShown: false }} />
              <Stack.Screen name="request/qr" options={{ animation: 'slide_from_right', headerShown: false }} />
              <Stack.Screen name="request/scan" options={{ animation: 'slide_from_right', headerShown: false }} />
              <Stack.Screen name="request/payment" options={{ animation: 'slide_from_right', headerShown: false }} />
              <Stack.Screen name="giftcard/[tokenId]" options={{ animation: 'slide_from_right', headerShown: false }} />
              <Stack.Screen
                name="giftcard/[tokenId]/[action]"
                options={{ animation: 'slide_from_right', headerShown: false, presentation: 'card' }}
              />
            </Stack>
            <AppOverlays />
          </MobileAppProvider>
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
