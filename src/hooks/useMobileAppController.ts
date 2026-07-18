import { useCallback, useMemo, useState } from 'react';
import { useRouter, type Href } from 'expo-router';

import { getSignerProviderInfo } from '@/@web3/config/signerProviders';
import { useBalance } from '@/@web3/hooks/useBalance';
import { useUniversalWallet } from '@/@web3/hooks/useUniversalWallet';
import type { WalletAdapter } from '@/@web3/types/wallet';
import type { AppNetworkMode, RuntimeNetworkProfile } from '@/config/networkProfiles';
import { useGiftcardCatalogue } from '@/features/catalogue/hooks/useGiftcardCatalogue';
import { usePaymentBalances } from '@/features/checkout/hooks/usePaymentBalances';
import { useUniversalAccountMint } from '@/features/checkout/hooks/useUniversalAccountMint';
import { useGiftcardInventory } from '@/features/inventory/hooks/useGiftcardInventory';
import type { GiftcardAction } from '@/features/inventory/services/giftcardActions';
import { useTopUpSheet, type TopUpProvider } from '@/features/topup/hooks/useTopUpSheet';
import type { AccountSection } from '@/navigation/account';
import { REQUEST_TOOL_PATHS, type RequestTool } from '@/navigation/request';
import { MAIN_TAB_PATHS, type MainTab } from '@/navigation/tabs';
import type {
  AppScreenContext,
  CheckoutNetwork,
  CheckoutSelection,
  CheckoutSelectionInput
} from '@/screens/types';
import { openTransakTopUp } from '@/services/transak';
import { toErrorMessage } from '@/utils/errors';

export type MobileAppController = AppScreenContext & {
  executeTopUp: (provider: TopUpProvider) => Promise<void>;
  topUpSheet: ReturnType<typeof useTopUpSheet>;
};

export function useMobileAppController({
  networkMode,
  magicAdapter,
  profile,
  setNetworkMode
}: {
  networkMode: AppNetworkMode;
  magicAdapter?: WalletAdapter | null;
  profile: RuntimeNetworkProfile;
  setNetworkMode: (mode: AppNetworkMode) => void;
}): MobileAppController {
  const router = useRouter();
  const [checkoutSelection, setCheckoutSelection] = useState<CheckoutSelection | null>(null);
  const [topUpStatus, setTopUpStatus] = useState<AppScreenContext['topUpStatus']>({
    status: 'idle',
    message: null
  });
  const wallet = useUniversalWallet({ magicAdapter });
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
    solanaAddress:
      wallet.snapshot.linkedSolanaAddress || wallet.snapshot.solanaUaAddress,
    particleBalance: mint.uaProbe?.primaryAssets ?? balance.balance,
    profile
  });
  const inventory = useGiftcardInventory({
    ownerAddress: wallet.snapshot.ownerAddress || wallet.snapshot.address,
    profile,
    refreshKey: mint.lastSuccessfulMintResult?.transactionHash ?? mint.lastSuccessfulMintResult?.tokenId,
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

  const prepareCheckout = useCallback((selection: CheckoutSelectionInput) => {
    const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
    const network: CheckoutNetwork = profile.ua.networkName.startsWith('arbitrum')
      ? 'arbitrum'
      : 'ethereum';
    const next: CheckoutSelection = {
      merchant: selection.merchant,
      amount: selection.amount,
      region: selection.region ?? selection.merchant.country ?? selection.merchant.regions[0] ?? 'GLOBAL',
      receiverType: selection.receiverType ?? 'wallet',
      receiverAddress: selection.receiverAddress ?? ownerAddress,
      receiverContact: selection.receiverContact ?? '',
      network: selection.network ?? network,
      paymentMode: profile.gatewayExecutionMode,
      giftcardMode: selection.giftcardMode ?? 'funded',
      mintMode: selection.mintMode ?? 'public',
      autoMint: selection.autoMint ?? true,
      autoUnwrap: selection.autoUnwrap ?? false,
      reserveGas: selection.reserveGas ?? true,
      couponCode: selection.couponCode ?? ''
    };

    setCheckoutSelection(next);
    return next;
  }, [profile.gatewayExecutionMode, profile.ua.networkName, wallet.snapshot.address, wallet.snapshot.ownerAddress]);

  const goToCheckout = useCallback((selection: CheckoutSelectionInput) => {
    const next = prepareCheckout(selection);
    router.push({
      pathname: '/mint/[merchantId]',
      params: {
        merchantId: next.merchant.id,
        amount: String(next.amount),
        region: next.region
      }
    });
  }, [prepareCheckout, router]);

  const updateCheckoutSelection = useCallback((selection: Partial<CheckoutSelection>) => {
    setCheckoutSelection((current) => current
      ? { ...current, ...selection, paymentMode: profile.gatewayExecutionMode }
      : current);
  }, [profile.gatewayExecutionMode]);

  const goToTab = useCallback((tab: MainTab) => {
    router.replace(MAIN_TAB_PATHS[tab]);
  }, [router]);

  const goToProfileAbout = useCallback(() => {
    router.push('/profile/about');
  }, [router]);

  const goToProfile = useCallback(() => {
    router.push('/profile');
  }, [router]);

  const goToAccountSection = useCallback((section: AccountSection) => {
    router.push({
      pathname: '/account/[section]',
      params: { section }
    });
  }, [router]);

  const goToGiftcardDetails = useCallback((tokenId: string) => {
    router.push({
      pathname: '/giftcard/[tokenId]',
      params: { tokenId }
    });
  }, [router]);

  const goToRequestTool = useCallback((tool: RequestTool) => {
    router.push(REQUEST_TOOL_PATHS[tool]);
  }, [router]);

  const goToGiftcardAction = useCallback((tokenId: string, action: GiftcardAction) => {
    router.push(`/giftcard/${encodeURIComponent(tokenId)}/${action}` as Href);
  }, [router]);

  return useMemo(
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
      topUpSheet,
      executeTopUp,
      goToTab,
      goToProfile,
      goToAccountSection,
      goToGiftcardDetails,
      goToGiftcardAction,
      goToRequestTool,
      goToProfileAbout,
      goToCheckout,
      prepareCheckout,
      updateCheckoutSelection,
      checkoutSelection
    }),
    [
      balance,
      catalogue,
      checkoutSelection,
      executeTopUp,
      goToCheckout,
      goToAccountSection,
      goToGiftcardDetails,
      goToGiftcardAction,
      goToRequestTool,
      goToProfile,
      goToProfileAbout,
      goToTab,
      inventory,
      mint,
      networkMode,
      openTopUpSheet,
      paymentBalances,
      prepareCheckout,
      productSignerReady,
      profile,
      setNetworkMode,
      topUpSheet,
      topUpStatus,
      updateCheckoutSelection,
      wallet
    ]
  );
}
