import { useCallback, useMemo, useState } from 'react';
import { HeroUINativeProvider, type HeroUINativeConfig } from 'heroui-native';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Uniwind } from 'uniwind';

import '../global.css';

Uniwind.setTheme('light');

import { BottomTabBar, type MainTab } from '@/components/BottomTabBar';
import {
  DEFAULT_NETWORK_MODE,
  getNetworkProfile,
  type AppNetworkMode
} from '@/config/networkProfiles';
import { getSignerProviderInfo } from '@/@web3/config/signerProviders';
import { useBalance } from '@/@web3/hooks/useBalance';
import { useGiftcardCatalogue } from '@/features/catalogue/hooks/useGiftcardCatalogue';
import { useGiftcardInventory } from '@/features/inventory/hooks/useGiftcardInventory';
import { useUniversalAccountMint } from '@/features/checkout/hooks/useUniversalAccountMint';
import { usePaymentBalances } from '@/features/checkout/hooks/usePaymentBalances';
import { useUniversalWallet } from '@/@web3/hooks/useUniversalWallet';
import { PrivyBridge } from '@/@web3/providers/privy/PrivyBridge';
import { TopUpSheet } from '@/features/topup/components/TopUpSheet.ui';
import { useTopUpSheet, type TopUpProvider } from '@/features/topup/hooks/useTopUpSheet';
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
import type {
  AppScreenContext,
  CheckoutNetwork,
  CheckoutSelection,
  CheckoutSelectionInput
} from '@/screens/types';
import { toErrorMessage } from '@/utils/errors';

type HiddenRoute = 'checkout' | 'profile-about' | null;

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

export default function App() {
  const [networkMode, setNetworkMode] = useState<AppNetworkMode>(DEFAULT_NETWORK_MODE);
  const profile = getNetworkProfile(networkMode);

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <HeroUINativeProvider config={HERO_UI_CONFIG}>
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
        </HeroUINativeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
  const topUpSheet = useTopUpSheet();
  const providerInfo = getSignerProviderInfo(wallet.selectedStack);
  const productSignerReady = providerInfo.productEnabled && Boolean(wallet.adapter?.sign7702Authorization);
  const mint = useUniversalAccountMint({
    wallet: wallet.snapshot,
    adapter: wallet.adapter,
    profile,
    receiverAddress: checkoutSelection?.receiverAddress,
    paymentMode: checkoutSelection?.paymentMode ?? 'direct',
    intent: checkoutSelection
      ? {
          merchantId: checkoutSelection.merchant.backendBrandId,
          provider: checkoutSelection.merchant.provider,
          productId: checkoutSelection.merchant.productId,
          merchantName: checkoutSelection.merchant.name,
          amountDisplay: String(checkoutSelection.amount),
          currency: checkoutSelection.merchant.currency,
          region: checkoutSelection.region,
          network: checkoutSelection.network,
          giftcardMode: checkoutSelection.giftcardMode,
          mintMode: checkoutSelection.mintMode,
          autoMint: checkoutSelection.autoMint,
          autoUnwrap: checkoutSelection.autoUnwrap,
          reserveGas: checkoutSelection.reserveGas,
          couponCode: checkoutSelection.couponCode
        }
      : null
  });
  const paymentBalances = usePaymentBalances({
    ownerAddress: wallet.snapshot.ownerAddress || wallet.snapshot.address,
    particleBalance: mint.uaProbe?.primaryAssets ?? balance.balance,
    profile
  });
  const inventory = useGiftcardInventory({
    ownerAddress: wallet.snapshot.ownerAddress || wallet.snapshot.address,
    profile,
    refreshKey: mint.mintResult?.transactionHash ?? mint.mintResult?.tokenId,
    wallet: wallet.adapter
  });

  const openTopUpSheet = useCallback(() => {
    topUpSheet.open();
  }, [topUpSheet]);

  const executeTopUp = useCallback(async (provider: TopUpProvider) => {
    const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
    if (!ownerAddress) return;

    setTopUpStatus({
      status: 'opening',
      message: provider === 'moonpay' ? 'Opening MoonPay.' : 'Opening Transak.'
    });

    try {
      if (provider === 'moonpay') {
        if (!wallet.adapter?.fundWallet) {
          throw new Error('Card top-up is not available for this wallet yet.');
        }
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
          message: 'MoonPay opened. Funds can take a few minutes after provider confirmation.'
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
        message: 'Transak opened. Funds can take a few minutes after provider confirmation.'
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

  function goToCheckout(selection: CheckoutSelectionInput) {
    const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
    const network: CheckoutNetwork = profile.ua.networkName.startsWith('arbitrum')
      ? 'arbitrum'
      : 'ethereum';
    setCheckoutSelection({
      merchant: selection.merchant,
      amount: selection.amount,
      region: selection.region ?? selection.merchant.country ?? selection.merchant.regions[0] ?? 'GLOBAL',
      receiverType: selection.receiverType ?? 'wallet',
      receiverAddress: selection.receiverAddress ?? ownerAddress,
      receiverContact: selection.receiverContact ?? '',
      network: selection.network ?? network,
      paymentMode: selection.paymentMode ?? 'direct',
      giftcardMode: selection.giftcardMode ?? 'voucher',
      mintMode: selection.mintMode ?? 'public',
      autoMint: selection.autoMint ?? true,
      autoUnwrap: selection.autoUnwrap ?? false,
      reserveGas: selection.reserveGas ?? false,
      couponCode: selection.couponCode ?? ''
    });
    setHiddenRoute('checkout');
  }

  function updateCheckoutSelection(selection: Partial<CheckoutSelection>) {
    setCheckoutSelection((current) => current ? { ...current, ...selection } : current);
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
      paymentBalances,
      catalogue,
      inventory,
      mint,
      productSignerReady,
      topUpStatus,
      topUp: openTopUpSheet,
      goToTab,
      goToProfileAbout,
      goToCheckout,
      updateCheckoutSelection,
      checkoutSelection
    }),
    [
      balance,
      catalogue,
      checkoutSelection,
      inventory,
      mint,
      networkMode,
      paymentBalances,
      productSignerReady,
      profile,
      setNetworkMode,
      openTopUpSheet,
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
  const screenOwnsScroll = connected && (
    hiddenRoute === 'checkout' || (!hiddenRoute && (activeTab === 'search' || activeTab === 'inventory'))
  );
  const webNotice = Platform.OS === 'web' ? (
    <View style={styles.webNotice}>
      <Text style={styles.webNoticeText}>
        Web mode is for UI review only. Native Privy signing, Particle native auth, and mobile funding require an Expo development build.
      </Text>
    </View>
  ) : null;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: 'padding', android: undefined })}
        style={styles.keyboard}
      >
        {screenOwnsScroll ? (
          <View style={styles.contentFill}>
            {webNotice}
            {screen}
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {webNotice}
            {screen}
          </ScrollView>
        )}
        {hiddenRoute || !connected ? null : <BottomTabBar activeTab={activeTab} onChange={goToTab} />}
      </KeyboardAvoidingView>
      <TopUpSheet
        copied={topUpSheet.copied}
        evmAddress={wallet.snapshot.ownerAddress || wallet.snapshot.address}
        onClose={topUpSheet.close}
        onCopyAddress={topUpSheet.copyAddress}
        onProviderTopUp={executeTopUp}
        solanaAddress={wallet.snapshot.linkedSolanaAddress || wallet.snapshot.solanaUaAddress}
        status={topUpStatus}
        visible={topUpSheet.visible && connected}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  safe: {
    backgroundColor: '#f5f5f5',
    flex: 1
  },
  keyboard: {
    flex: 1
  },
  content: {
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 96
  },
  contentFill: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 12
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
