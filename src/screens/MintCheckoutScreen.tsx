import { useEffect, useRef } from 'react';

import { MintCheckoutView } from '@/features/checkout/components/MintCheckoutView.ui';
import { hasParticleProjectConfig } from '@/config/networkProfiles';
import { useMintCheckoutForm } from '@/features/checkout/hooks/useMintCheckoutForm';
import { getCheckoutFundingReadiness } from '@/features/checkout/services/checkoutReadiness';
import { isSameEvmAddress } from '@/features/checkout/services/giftcardCheckout';
import type { AppScreenContext } from './types';

export function MintCheckoutScreen({ context }: { context: AppScreenContext }) {
  const { mint, wallet } = context;
  const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
  const lastUaProbeKey = useRef<string | null>(null);
  const uaProbeKey = [
    context.profile.mode,
    context.profile.ua.targetChainId,
    context.profile.particle.projectId,
    context.profile.particle.appId,
    ownerAddress.toLowerCase()
  ].join(':');

  useEffect(() => {
    if (
      context.profile.gatewayExecutionMode !== 'ua7702' ||
      !ownerAddress ||
      !hasParticleProjectConfig(context.profile)
    ) {
      lastUaProbeKey.current = null;
      return;
    }
    if (mint.uaProbe) {
      lastUaProbeKey.current = uaProbeKey;
      return;
    }
    if (lastUaProbeKey.current === uaProbeKey) return;
    lastUaProbeKey.current = uaProbeKey;
    void mint.probeUa();
  }, [context.profile, mint.probeUa, mint.uaProbe, ownerAddress, uaProbeKey]);

  const form = useMintCheckoutForm({
    selection: context.checkoutSelection,
    onChange: context.updateCheckoutSelection
  });
  useEffect(() => {
    if (
      context.checkoutSelection?.receiverType === 'wallet' &&
      !context.checkoutSelection.receiverAddress.trim() &&
      ownerAddress
    ) {
      context.updateCheckoutSelection({ receiverAddress: ownerAddress });
    }
  }, [context.checkoutSelection, context.updateCheckoutSelection, ownerAddress]);
  const checkoutReceiver = context.checkoutSelection?.receiverAddress?.trim() || ownerAddress;
  const receiverValid = form.receiverValid || (
    context.checkoutSelection?.receiverType === 'wallet' &&
    !context.checkoutSelection.receiverAddress.trim() &&
    Boolean(ownerAddress)
  );
  const checkoutReceiverMatch = mint.preparedCheckout
    ? isSameEvmAddress(mint.preparedCheckout.to, checkoutReceiver)
    : false;
  const { paymentBalances } = context;
  const portfolio = paymentBalances.portfolio;
  const requestedAmount = context.checkoutSelection?.amount ?? 0;
  const { hasSpendableBalance, hasTargetGas } = getCheckoutFundingReadiness({
    executionMode: context.profile.gatewayExecutionMode,
    balanceStatus: paymentBalances.status,
    requestedAmount,
    targetNativeAmount: paymentBalances.targetNative?.amount ?? 0,
    targetUsdcAmount: portfolio.targetUsdc,
    unifiedStablecoinAmount: portfolio.totalUsd
  });
  const directPayment = context.profile.gatewayExecutionMode === 'direct';
  const uaReady = directPayment || (
    hasParticleProjectConfig(context.profile) &&
    Boolean(mint.uaProbe)
  );
  const canMint =
    wallet.snapshot.status === 'connected' &&
    (directPayment ? Boolean(wallet.adapter?.getProvider) : context.productSignerReady) &&
    receiverValid &&
    checkoutReceiverMatch &&
    hasSpendableBalance &&
    hasTargetGas &&
    uaReady &&
    Boolean(mint.preparedCheckout);
  const mintBlockedReason = !mint.preparedCheckout || canMint
    ? null
    : wallet.snapshot.status !== 'connected'
      ? 'Connect the wallet that will receive the giftcard.'
      : !directPayment && !context.productSignerReady
        ? 'The connected wallet cannot sign the required EIP-7702 authorization.'
        : !receiverValid
          ? 'Enter a valid giftcard receiver wallet.'
          : !checkoutReceiverMatch
          ? 'The prepared checkout receiver does not match the connected wallet. Prepare the checkout again.'
          : paymentBalances.status !== 'ready'
            ? 'Payment balances are still loading. Refresh balances before paying.'
            : !hasSpendableBalance
              ? 'The available payment balance is below the checkout total.'
              : !hasTargetGas
                ? `Native gas is required on ${context.profile.ua.chainLabel} for this direct checkout.`
                : !uaReady
                  ? mint.lastError || 'Particle Universal Account routing is not ready. Refresh the route before paying.'
                  : 'Checkout is not ready. Prepare it again before paying.';

  return (
    <MintCheckoutView
      advancedOpen={form.advancedOpen}
      balanceErrors={paymentBalances.errors}
      balanceStatus={paymentBalances.status}
      canMint={canMint}
      checkoutSelection={context.checkoutSelection}
      mint={mint}
      mintBlockedReason={mintBlockedReason}
      onBack={() => context.goToTab('catalogue')}
      onCheckoutComplete={() => context.goToTab('inventory')}
      onRefreshBalances={paymentBalances.refresh}
      onSelectAmount={form.selectAmount}
      onSelectRegion={form.selectRegion}
      onSetAutoMint={form.setAutoMint}
      onSetAutoUnwrap={form.setAutoUnwrap}
      onSetCouponCode={form.setCouponCode}
      onSetGiftcardMode={form.setGiftcardMode}
      onSetReceiverAddress={form.setReceiverAddress}
      onSetReceiverContact={form.setReceiverContact}
      onSetReceiverType={form.setReceiverType}
      onSetReserveGas={form.setReserveGas}
      onToggleAdvanced={form.toggleAdvanced}
      onToggleRegion={form.toggleRegion}
      onTopUp={context.topUp}
      ownerAddress={ownerAddress}
      portfolio={portfolio}
      profile={context.profile}
      receiverError={form.receiverError}
      receiverValid={receiverValid}
      regionOpen={form.regionOpen}
      regionOptions={form.regionOptions}
      targetNativeAmount={paymentBalances.targetNative?.amount ?? 0}
    />
  );
}
