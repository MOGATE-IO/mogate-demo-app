import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BottomTabBar, type MainTab } from '@/components/BottomTabBar';
import {
  DEFAULT_NETWORK_MODE,
  getNetworkProfile,
  type AppNetworkMode
} from '@/config/networkProfiles';
import { getSignerProviderInfo } from '@/@web3/config/signerProviders';
import { useBalance } from '@/@web3/hooks/useBalance';
import { useGiftcardCatalogue } from '@/features/catalogue/hooks/useGiftcardCatalogue';
import { useUniversalAccountMint } from '@/features/checkout/hooks/useUniversalAccountMint';
import { useUniversalWallet } from '@/@web3/hooks/useUniversalWallet';
import { PrivyBridge } from '@/@web3/providers/privy/PrivyBridge';
import { openTransakTopUp } from '@/services/transak';
import type { WalletAdapter } from '@/@web3/types/wallet';
import { HomeScreen } from '@/screens/HomeScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { MintCheckoutScreen } from '@/screens/MintCheckoutScreen';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { ProfileAboutScreen } from '@/screens/ProfileAboutScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { RequestPaymentScreen } from '@/screens/RequestPaymentScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import type { AppScreenContext, CheckoutSelection } from '@/screens/types';
import { toErrorMessage } from '@/utils/errors';

type HiddenRoute = 'checkout' | 'profile-about' | null;

export default function App() {
  const [networkMode, setNetworkMode] = useState<AppNetworkMode>(DEFAULT_NETWORK_MODE);
  const profile = getNetworkProfile(networkMode);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <PrivyBridge profile={profile}>
        {(privyAdapter) => (
          <MobileShell
            key={profile.mode}
            networkMode={networkMode}
            privyAdapter={privyAdapter}
            profile={profile}
            setNetworkMode={setNetworkMode}
          />
        )}
      </PrivyBridge>
    </SafeAreaProvider>
  );
}

function MobileShell({
  networkMode,
  privyAdapter,
  profile,
  setNetworkMode
}: {
  networkMode: AppNetworkMode;
  privyAdapter?: WalletAdapter | null;
  profile: ReturnType<typeof getNetworkProfile>;
  setNetworkMode: (mode: AppNetworkMode) => void;
}) {
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [hiddenRoute, setHiddenRoute] = useState<HiddenRoute>(null);
  const [checkoutSelection, setCheckoutSelection] = useState<CheckoutSelection | null>(null);
  const [topUpStatus, setTopUpStatus] = useState<AppScreenContext['topUpStatus']>({
    status: 'idle',
    message: null
  });
  const wallet = useUniversalWallet({ privyAdapter });
  const balance = useBalance();
  const catalogue = useGiftcardCatalogue(profile);
  const providerInfo = getSignerProviderInfo(wallet.selectedStack);
  const productSignerReady = providerInfo.productEnabled && Boolean(wallet.adapter?.sign7702Authorization);
  const mint = useUniversalAccountMint({
    wallet: wallet.snapshot,
    adapter: wallet.adapter,
    profile,
    intent: checkoutSelection
      ? {
          merchantId: checkoutSelection.merchant.id,
          merchantName: checkoutSelection.merchant.name,
          amountDisplay: String(checkoutSelection.amount),
          currency: checkoutSelection.merchant.currency
        }
      : null
  });

  const topUp = useCallback(async () => {
    const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
    if (!ownerAddress) return;

    setTopUpStatus({
      status: 'opening',
      message: `Opening ${profile.onramp.primaryProvider} USDC top-up for ${profile.ua.chainLabel}.`
    });

    try {
      if (profile.onramp.primaryProvider === 'privy' && wallet.adapter?.fundWallet) {
        await wallet.adapter.fundWallet({
          address: ownerAddress,
          amount: profile.onramp.defaultAmount,
          asset: profile.onramp.defaultAsset,
          chainId: profile.ua.targetChainId,
          chainLabel: profile.ua.chainLabel,
          sandbox: profile.mode === 'testnet'
        });
        setTopUpStatus({
          status: 'success',
          message: 'Top-up flow opened. Funds can take a few minutes to arrive after provider confirmation.'
        });
        await wallet.refresh();
        return;
      }

      await openTransakTopUp({
        profile,
        walletAddress: ownerAddress,
        fiatAmount: profile.onramp.defaultAmount,
        partnerOrderId: `mogate-mobile-${profile.mode}-${Date.now()}`
      });
      setTopUpStatus({
        status: 'success',
        message: 'Fallback top-up opened.'
      });
    } catch (error) {
      setTopUpStatus({
        status: 'error',
        message: toErrorMessage(error)
      });
    }
  }, [profile, wallet]);

  function goToTab(tab: MainTab) {
    setHiddenRoute(null);
    setActiveTab(tab);
  }

  function goToCheckout(selection: CheckoutSelection) {
    setCheckoutSelection(selection);
    setHiddenRoute('checkout');
  }

  function goToProfileAbout() {
    setActiveTab('profile');
    setHiddenRoute('profile-about');
  }

  const context = useMemo<AppScreenContext>(
    () => ({
      profile,
      networkMode,
      setNetworkMode,
      wallet,
      balance,
      catalogue,
      mint,
      productSignerReady,
      topUpStatus,
      topUp,
      goToTab,
      goToProfileAbout,
      goToCheckout,
      checkoutSelection
    }),
    [
      balance,
      catalogue,
      checkoutSelection,
      mint,
      networkMode,
      productSignerReady,
      profile,
      setNetworkMode,
      topUp,
      topUpStatus,
      wallet
    ]
  );

  const connected = wallet.snapshot.status === 'connected';
  const screen = !connected ? (
    <OnboardingScreen context={context} />
  ) : hiddenRoute === 'checkout' ? (
      <MintCheckoutScreen context={context} />
    ) : hiddenRoute === 'profile-about' ? (
      <ProfileAboutScreen context={context} />
    ) : activeTab === 'home' ? (
      <HomeScreen context={context} />
    ) : activeTab === 'search' ? (
      <SearchScreen context={context} />
    ) : activeTab === 'request' ? (
      <RequestPaymentScreen context={context} />
    ) : activeTab === 'inventory' ? (
      <InventoryScreen context={context} />
    ) : (
      <ProfileScreen context={context} />
    );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboard}
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>Mogate mobile</Text>
            <Text style={styles.h1}>{profile.label} UA</Text>
          </View>
          <View style={styles.statusBox}>
            <Text style={styles.statusLabel}>{profile.ua.chainLabel}</Text>
            <Text style={styles.statusValue}>{wallet.selectedStack}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {Platform.OS === 'web' ? (
            <View style={styles.webNotice}>
              <Text style={styles.webNoticeText}>
                Web mode is for UI review only. Native Privy signing, Particle native auth, and mobile funding require an Expo development build.
              </Text>
            </View>
          ) : null}
          {screen}
        </ScrollView>
        {hiddenRoute || !connected ? null : <BottomTabBar activeTab={activeTab} onChange={goToTab} />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: '#f6f5f2',
    flex: 1
  },
  keyboard: {
    flex: 1
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8
  },
  headerCopy: {
    flex: 1
  },
  kicker: {
    color: '#8b7461',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  h1: {
    color: '#171512',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 0,
    marginTop: 2
  },
  statusBox: {
    alignItems: 'flex-end',
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd3',
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  statusLabel: {
    color: '#7d746a',
    fontSize: 11,
    fontWeight: '800'
  },
  statusValue: {
    color: '#171512',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase'
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 96
  },
  webNotice: {
    backgroundColor: '#fff8e9',
    borderColor: '#edd49a',
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  webNoticeText: {
    color: '#7b5812',
    fontSize: 13,
    lineHeight: 18
  }
});
