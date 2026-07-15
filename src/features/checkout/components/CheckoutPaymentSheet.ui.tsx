import { useEffect, useState } from 'react';
import {
  Accordion,
  Button,
  Input,
  Label,
  Separator,
  Surface,
  TextField,
  Typography
} from 'heroui-native';
import { Check, CircleAlert, RefreshCw, Wallet } from 'lucide-react-native';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { HeroBottomSheet } from '@/components/HeroBottomSheet.ui';
import { CheckoutExecutionOverlay } from '@/features/checkout/components/CheckoutExecutionOverlay.ui';
import { StablecoinBalanceList, TokenLogo } from '@/features/checkout/components/StablecoinBalanceList.ui';
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
  onSelectStablecoin: (symbol: StablecoinSymbol) => void;
  onTopUp: () => void | Promise<void>;
  portfolio: StablecoinPortfolio;
  profile: RuntimeNetworkProfile;
  receiverValid: boolean;
  selectedStablecoin: StablecoinSymbol;
  targetNativeAmount: number;
  visible: boolean;
}) {
  const [balanceOpen, setBalanceOpen] = useState(false);
  const [couponDraft, setCouponDraft] = useState(checkoutSelection?.couponCode ?? '');
  const amount = checkoutSelection?.amount ?? 0;
  const quotedTotal = mint.preparedCheckout ? Number(mint.preparedCheckout.amountDisplay) : amount;
  const safeTotal = Number.isFinite(quotedTotal) ? quotedTotal : amount;
  const discount = Math.max(0, amount - safeTotal);
  const directPayment = checkoutSelection?.paymentMode !== 'ua7702';
  const loadingCheckout = mint.stage === 'loading-checkout';
  const paying = mint.stage === 'building';
  const insufficientDirectBalance = balanceStatus === 'ready' && portfolio.targetUsdc < safeTotal;
  const missingDirectGas = directPayment && balanceStatus === 'ready' && targetNativeAmount <= 0;

  useEffect(() => {
    if (visible) setCouponDraft(checkoutSelection?.couponCode ?? '');
  }, [checkoutSelection?.couponCode, visible]);

  const retryCheckout = mint.preparedCheckout ? mint.executeMint : mint.loadCheckoutFromBackend;

  return (
    <>
      <HeroBottomSheet
        description={directPayment ? `Direct USDC on ${profile.ua.chainLabel}` : 'UA7702 stablecoin route'}
        onClose={() => {
          if (mint.executionStep === 'idle') onClose();
        }}
        title="Checkout"
        visible={visible && mint.executionStep === 'idle'}
      >
        <View style={styles.sheetBody}>
          <ScrollView
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
            <Accordion
              className="rounded-lg"
              hideSeparator
              onValueChange={(value: string | undefined) => setBalanceOpen(value === 'usd-balance')}
              selectionMode="single"
              value={balanceOpen ? 'usd-balance' : undefined}
              variant="surface"
            >
              <Accordion.Item value="usd-balance">
                <Accordion.Trigger>
                  <View style={styles.balanceSummary}>
                    <View style={styles.tokenPair}>
                      <TokenLogo size={30} symbol="USDC" />
                      <View style={styles.overlapToken}>
                        <TokenLogo size={30} symbol="USDT" />
                      </View>
                    </View>
                    <View style={styles.balanceCopy}>
                      <Typography color="muted" type="body-xs" weight="semibold">USDC + USDT</Typography>
                      <Typography.Heading numberOfLines={1} type="h5">
                        {formatUsdAmount(portfolio.totalUsd)}
                      </Typography.Heading>
                    </View>
                    <View style={styles.targetCopy}>
                      <Typography color="muted" numberOfLines={1} type="body-xs">{profile.ua.chainLabel}</Typography>
                      <Typography type="body-sm" weight="semibold">{formatUsdAmount(portfolio.targetUsdc)}</Typography>
                    </View>
                  </View>
                  <Accordion.Indicator />
                </Accordion.Trigger>
                <Accordion.Content>
                  <View style={styles.balanceDetails}>
                    <StablecoinBalanceList
                      onSelect={onSelectStablecoin}
                      rows={portfolio.rows}
                      selected={selectedStablecoin}
                      status={balanceStatus}
                    />

                    {insufficientDirectBalance ? (
                      <InlineAlert>
                        Add {formatUsdAmount(safeTotal - portfolio.targetUsdc)} USDC on {profile.ua.chainLabel} for this direct payment.
                      </InlineAlert>
                    ) : null}
                    {missingDirectGas ? (
                      <InlineAlert>
                        Add testnet ETH on {profile.ua.chainLabel} for gas.
                      </InlineAlert>
                    ) : null}
                    {balanceErrors.length > 0 ? <InlineAlert>{balanceErrors[0]}</InlineAlert> : null}

                    <View style={styles.balanceActions}>
                      <Button className="flex-1 rounded-lg" onPress={onTopUp} variant="secondary">
                        <Wallet color="#18181b" size={17} />
                        <Button.Label>Top up balance</Button.Label>
                      </Button>
                      <Button
                        accessibilityLabel="Refresh balances"
                        className="h-12 w-12 rounded-lg"
                        isIconOnly
                        onPress={onRefreshBalances}
                        variant="secondary"
                      >
                        {balanceStatus === 'loading' ? (
                          <ActivityIndicator color="#18181b" size="small" />
                        ) : (
                          <RefreshCw color="#18181b" size={18} />
                        )}
                      </Button>
                    </View>
                  </View>
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>

            {mint.lastError && mint.executionStep === 'idle' ? <InlineAlert>{mint.lastError}</InlineAlert> : null}
          </ScrollView>

          <View style={styles.footer}>
            {mint.preparedCheckout ? (
              <Button
                className="w-full rounded-lg"
                isDisabled={!canMint || !receiverValid || paying}
                onPress={mint.executeMint}
                variant="primary"
              >
                <Button.Label>Pay {formatUsdAmount(safeTotal)}</Button.Label>
              </Button>
            ) : (
              <Button
                className="w-full rounded-lg"
                isDisabled={!amount || loadingCheckout}
                onPress={mint.loadCheckoutFromBackend}
                variant="primary"
              >
                <Button.Label>Review payment</Button.Label>
              </Button>
            )}
          </View>
        </View>
      </HeroBottomSheet>

      <CheckoutExecutionOverlay
        amountLabel={formatUsdAmount(safeTotal)}
        error={mint.lastError}
        onComplete={onComplete}
        onRetry={retryCheckout}
        onReturn={mint.dismissExecutionError}
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
    paddingBottom: 18,
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
  balanceSummary: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0
  },
  tokenPair: {
    flexDirection: 'row',
    width: 48
  },
  overlapToken: {
    marginLeft: -12
  },
  balanceCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  targetCopy: {
    alignItems: 'flex-end',
    gap: 2,
    maxWidth: 108
  },
  balanceDetails: {
    gap: 12,
    paddingBottom: 6
  },
  balanceActions: {
    flexDirection: 'row',
    gap: 8
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
    backgroundColor: '#fafafa',
    borderTopColor: '#e4e4e7',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingTop: 12
  }
});
