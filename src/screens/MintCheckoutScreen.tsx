import { useEffect, useRef } from 'react';

import { MintCheckoutView } from '@/features/checkout/components/MintCheckoutView.ui';
import { hasParticleProjectConfig } from '@/config/networkProfiles';
import { useMintCheckoutForm } from '@/features/checkout/hooks/useMintCheckoutForm';
import { isSameEvmAddress } from '@/features/checkout/services/giftcardCheckout';
import type { AppScreenContext } from './types';

export function MintCheckoutScreen({ context }: { context: AppScreenContext }) {
  const { mint, wallet } = context;
  const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
  const balanceProbeStarted = useRef(false);

  useEffect(() => {
    if (
      balanceProbeStarted.current ||
      !ownerAddress ||
      mint.uaProbe ||
      !hasParticleProjectConfig(context.profile)
    ) return;
    balanceProbeStarted.current = true;
    void mint.probeUa();
  }, [context.profile, mint.probeUa, mint.uaProbe, ownerAddress]);

  const form = useMintCheckoutForm({
    selection: context.checkoutSelection,
    onChange: context.updateCheckoutSelection
  });
  const checkoutReceiverMatch = mint.preparedCheckout
    ? isSameEvmAddress(mint.preparedCheckout.to, context.checkoutSelection?.receiverAddress)
    : false;
  const directPayment = context.checkoutSelection?.paymentMode !== 'ua7702';
  const { paymentBalances } = context;
  const portfolio = paymentBalances.portfolio;
  const requestedAmount = context.checkoutSelection?.amount ?? 0;
  const hasSpendableBalance = directPayment
    ? paymentBalances.status === 'ready' && portfolio.targetUsdc >= requestedAmount
    : paymentBalances.status === 'ready' && portfolio.totalUsd >= requestedAmount;
  const hasTargetGas = !directPayment || (paymentBalances.targetNative?.amount ?? 0) > 0;
  const canMint =
    wallet.snapshot.status === 'connected' &&
    (directPayment ? Boolean(wallet.adapter?.getProvider) : context.productSignerReady) &&
    checkoutReceiverMatch &&
    hasSpendableBalance &&
    hasTargetGas &&
    Boolean(mint.preparedCheckout);

  return (
    <MintCheckoutView
      advancedOpen={form.advancedOpen}
      balanceErrors={paymentBalances.errors}
      balanceStatus={paymentBalances.status}
      canMint={canMint}
      checkoutSelection={context.checkoutSelection}
      mint={mint}
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
      receiverValid={form.receiverValid}
      regionOpen={form.regionOpen}
      regionOptions={form.regionOptions}
      targetNativeAmount={paymentBalances.targetNative?.amount ?? 0}
    />
  );
}
