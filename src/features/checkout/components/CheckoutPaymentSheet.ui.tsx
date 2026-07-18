import { useEffect, useState } from 'react';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Button,
  Input,
  Label,
  Separator,
  Surface,
  TextField,
  Typography
} from 'heroui-native';
import { Check, CircleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { HeroBottomSheet } from '@/components/HeroBottomSheet.ui';
import { CheckoutExecutionOverlay } from '@/features/checkout/components/CheckoutExecutionOverlay.ui';
import { StablecoinPortfolioCard } from '@/features/checkout/components/StablecoinPortfolioCard.ui';
import type { UniversalAccountMintState } from '@/features/checkout/hooks/useUniversalAccountMint';
import {
  formatUsdAmount,
  type StablecoinPortfolio,
  type StablecoinSymbol
} from '@/features/checkout/services/paymentBalances';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { CheckoutSelection } from '@/screens/types';

export function CheckoutPaymentSheet({
  balanceErrors,
  balanceStatus,
  canMint,
  checkoutSelection,
  mint,
  onClose,
  onComplete,
  onCouponCodeChange,
  onRefreshBalances,
  onReopen,
  onSelectStablecoin,
  onTopUp,
  portfolio,
  profile,
  receiverValid,
  selectedStablecoin,
  targetNativeAmount,
  visible
}: {
  balanceErrors: string[];
  balanceStatus: 'idle' | 'loading' | 'ready' | 'error';
  canMint: boolean;
  checkoutSelection: CheckoutSelection | null;
  mint: UniversalAccountMintState;
  onClose: () => void;
  onComplete: () => void;
  onCouponCodeChange: (couponCode: string) => void;
  onRefreshBalances: () => void | Promise<void>;
  onReopen: () => void;
  onSelectStablecoin: (symbol: StablecoinSymbol) => void;
  onTopUp: () => void | Promise<void>;
  portfolio: StablecoinPortfolio;
  profile: RuntimeNetworkProfile;
  receiverValid: boolean;
  selectedStablecoin: StablecoinSymbol;
  targetNativeAmount: number;
  visible: boolean;
}) {
  const [couponDraft, setCouponDraft] = useState(checkoutSelection?.couponCode ?? '');
  const [mintQueued, setMintQueued] = useState(false);
  const amount = checkoutSelection?.amount ?? 0;
  const quotedTotal = mint.preparedCheckout
    ? Number(mint.preparedCheckout.checkoutTotalDisplay ?? mint.preparedCheckout.amountDisplay)
    : amount;
  const safeTotal = Number.isFinite(quotedTotal) ? quotedTotal : amount;
  const discount = Math.max(0, amount - safeTotal);
  const directPayment = profile.gatewayExecutionMode === 'direct';
  const loadingCheckout = mint.stage === 'loading-checkout';
  const paying = mint.stage === 'building';
  const insufficientDirectBalance = directPayment && balanceStatus === 'ready' && portfolio.targetUsdc < safeTotal;
  const insufficientUaBalance = !directPayment && balanceStatus === 'ready' && portfolio.totalUsd < safeTotal;
  const missingDirectGas = directPayment && balanceStatus === 'ready' && targetNativeAmount <= 0;

  useEffect(() => {
    if (visible) setCouponDraft(checkoutSelection?.couponCode ?? '');
  }, [checkoutSelection?.couponCode, visible]);

  useEffect(() => {
    if (!mintQueued || visible) return undefined;
    const timer = setTimeout(() => {
      setMintQueued(false);
      void mint.executeMint();
    }, 350);
    return () => clearTimeout(timer);
  }, [mint.executeMint, mintQueued, visible]);

  const beginMint = () => {
    if (mintQueued || paying) return;
    setMintQueued(true);
    onClose();
  };

  const returnToCheckout = () => {
    mint.dismissExecutionError();
    setTimeout(onReopen, 300);
  };

  const retryCheckout = mint.mintResult
    ? mint.retryReconciliation
    : mint.preparedCheckout
      ? mint.executeMint
      : mint.loadCheckoutFromBackend;

  return (
    <>
      <HeroBottomSheet
        description={directPayment ? `Direct USDC on ${profile.ua.chainLabel}` : 'UA7702 stablecoin route'}
        footer={(
          <View style={styles.footer}>
            {mint.mintResult ? (
              <Button
                className="w-full rounded-lg"
                onPress={mint.retryReconciliation}
                variant="primary"
              >
                <Button.Label>Check mint status</Button.Label>
              </Button>
            ) : mint.preparedCheckout ? (
              <Button
                className="w-full rounded-lg"
                isDisabled={!canMint || !receiverValid || paying || mintQueued}
                onPress={beginMint}
                variant="primary"
              >
                <Button.Label>{mintQueued ? 'Opening checkout...' : `Pay ${formatUsdAmount(safeTotal)}`}</Button.Label>
              </Button>
            ) : (
              <Button
                className="w-full rounded-lg"
                isDisabled={!amount || loadingCheckout}
                onPress={mint.loadCheckoutFromBackend}
                variant="primary"
              >
                <Button.Label>{loadingCheckout ? 'Preparing checkout...' : 'Review payment'}</Button.Label>
              </Button>
            )}
          </View>
        )}
        onClose={() => {
          if (mint.executionStep === 'idle') onClose();
        }}
        title="Checkout"
        visible={visible && mint.executionStep === 'idle'}
      >
        <View style={styles.sheetBody}>
          <BottomSheetScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Typography.Heading type="h5">Order summary</Typography.Heading>
            <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
              <SummaryRow label="Giftcard value" value={formatUsdAmount(amount)} />
              <Separator />
              <View style={styles.couponBlock}>
                <Typography color="muted" type="body-xs" weight="semibold">Coupon</Typography>
                <View style={styles.couponRow}>
                  <TextField style={styles.couponField}>
                    <Label className="sr-only">Coupon code</Label>
                    <Input
                      autoCapitalize="characters"
                      autoCorrect={false}
                      className="rounded-lg"
                      onChangeText={setCouponDraft}
                      placeholder="Enter promo or gift code"
                      value={couponDraft}
                    />
                  </TextField>
                  <Button
                    accessibilityLabel="Apply coupon"
                    className="h-12 w-12 rounded-lg"
                    isIconOnly
                    onPress={() => onCouponCodeChange(couponDraft.trim())}
                    variant={checkoutSelection?.couponCode === couponDraft.trim() && couponDraft.trim() ? 'primary' : 'secondary'}
                  >
                    <Check
                      color={checkoutSelection?.couponCode === couponDraft.trim() && couponDraft.trim() ? '#ffffff' : '#18181b'}
                      size={19}
                    />
                  </Button>
                </View>
              </View>
              <Separator />
              <SummaryRow label="Discount" value={discount > 0 ? `-${formatUsdAmount(discount)}` : formatUsdAmount(0)} />
              <View style={styles.totalRow}>
                <Typography weight="semibold">Total</Typography>
                <Typography.Heading type="h4">{formatUsdAmount(safeTotal)}</Typography.Heading>
              </View>
            </Surface>

            <Typography.Heading type="h5">Payment method</Typography.Heading>
            <StablecoinPortfolioCard
              detailFooter={(
                <>
                  {insufficientDirectBalance ? (
                    <InlineAlert>
                      Add {formatUsdAmount(safeTotal - portfolio.targetUsdc)} USDC on {profile.ua.chainLabel} for this direct payment.
                    </InlineAlert>
                  ) : null}
                  {insufficientUaBalance ? (
                    <InlineAlert>
                      Add {formatUsdAmount(safeTotal - portfolio.totalUsd)} in USDC or USDT to a Particle-supported chain.
                    </InlineAlert>
                  ) : null}
                  {missingDirectGas ? (
                    <InlineAlert>
                      Add testnet ETH on {profile.ua.chainLabel} for gas.
                    </InlineAlert>
                  ) : null}
                </>
              )}
              errors={balanceErrors}
              onRefresh={onRefreshBalances}
              onSelect={onSelectStablecoin}
              onTopUp={onTopUp}
              portfolio={portfolio}
              selected={selectedStablecoin}
              status={balanceStatus}
            />

            {mint.lastError && mint.executionStep === 'idle' ? <InlineAlert>{mint.lastError}</InlineAlert> : null}
            {mint.uaConfigurationError ? <InlineAlert>{mint.uaConfigurationError}</InlineAlert> : null}
          </BottomSheetScrollView>
        </View>
      </HeroBottomSheet>

      <CheckoutExecutionOverlay
        amountLabel={formatUsdAmount(safeTotal)}
        error={mint.lastError}
        onComplete={onComplete}
        onRetry={retryCheckout}
        onReturn={returnToCheckout}
        paymentMode={profile.gatewayExecutionMode}
        step={mint.executionStep}
      />
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Typography color="muted" type="body-sm">{label}</Typography>
      <Typography type="body-sm" weight="semibold">{value}</Typography>
    </View>
  );
}

function InlineAlert({ children }: { children: React.ReactNode }) {
  return (
    <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
      <View style={styles.alertRow}>
        <CircleAlert color="#c43d45" size={18} />
        <Typography style={styles.alertText} type="body-xs">{children}</Typography>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  sheetBody: {
    flex: 1
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 112,
    paddingHorizontal: 18
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44
  },
  couponBlock: {
    gap: 8,
    paddingVertical: 12
  },
  couponRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  couponField: {
    flex: 1
  },
  totalRow: {
    alignItems: 'center',
    borderTopColor: '#e4e4e7',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
    paddingTop: 14
  },
  alertRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8
  },
  alertText: {
    color: '#a12f37',
    flex: 1
  },
  footer: {
    borderTopColor: '#e4e4e7',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 12
  }
});
