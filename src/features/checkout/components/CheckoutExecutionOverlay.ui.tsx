import { useEffect, useRef, useState } from 'react';
import { Button, Chip, Surface, Typography } from 'heroui-native';
import {
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  CreditCard,
  LoaderCircle,
  PackageCheck
} from 'lucide-react-native';
import { ActivityIndicator, Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { CheckoutExecutionStep } from '@/features/checkout/hooks/useUniversalAccountMint';
import type { GatewayExecutionMode } from '@/config/networkProfiles';

export function CheckoutExecutionOverlay({
  amountLabel,
  error,
  onComplete,
  onRetry,
  onReturn,
  paymentMode,
  step
}: {
  amountLabel: string;
  error: string | null;
  onComplete: () => void;
  onRetry: () => void | Promise<void>;
  onReturn: () => void;
  paymentMode: GatewayExecutionMode;
  step: CheckoutExecutionStep;
}) {
  const insets = useSafeAreaInsets();
  const completionScheduled = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const visible = step !== 'idle';
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setElapsedSeconds(0);
    if (!visible || step === 'complete' || step === 'error') return undefined;
    const timer = setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [step, visible]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (step !== 'complete') {
      completionScheduled.current = false;
      return undefined;
    }
    if (completionScheduled.current) return undefined;
    completionScheduled.current = true;
    onCompleteRef.current();
    return undefined;
  }, [step]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => undefined}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View
        style={[
          styles.screen,
          {
            paddingBottom: Math.max(insets.bottom, 24),
            paddingTop: Math.max(insets.top, 24)
          }
        ]}
      >
        <View style={styles.topBar}>
          <View style={styles.brandMark}>
            <CreditCard color="#e9680c" size={22} />
          </View>
          <View style={styles.topCopy}>
            <Typography color="muted" type="body-xs" weight="semibold">MOGATE CHECKOUT</Typography>
            <Typography type="body-sm" weight="semibold">{amountLabel}</Typography>
          </View>
          <Chip color="accent" size="sm" variant="soft">
            <Chip.Label>{step === 'complete' ? 'Complete' : step === 'error' ? 'Action needed' : 'In progress'}</Chip.Label>
          </Chip>
        </View>

        <View style={styles.center}>
          {step === 'preparing' ? (
            <PreparationState elapsedSeconds={elapsedSeconds} />
          ) : step === 'error' ? (
            <ErrorState error={error} onRetry={onRetry} onReturn={onReturn} />
          ) : step === 'complete' ? (
            <CompleteState />
          ) : (
            <PaymentProgress elapsedSeconds={elapsedSeconds} paymentMode={paymentMode} step={step} />
          )}
        </View>

        {step !== 'error' && step !== 'complete' ? (
          <Typography color="muted" style={styles.lockedCopy} type="body-xs">
            Keep Mogate open while the wallet and network finish this checkout.
          </Typography>
        ) : null}
      </View>
    </Modal>
  );
}

function PreparationState({ elapsedSeconds }: { elapsedSeconds: number }) {
  return (
    <View style={styles.stateStack}>
      <View style={styles.loaderWell}>
        <ActivityIndicator color="#e9680c" size="large" />
      </View>
      <View style={styles.stateCopy}>
        <Typography.Heading style={styles.centerText} type="h3">Preparing checkout</Typography.Heading>
        <Typography color="muted" style={styles.centerText}>
          Requesting the payment quote and mint parameters.
        </Typography>
        <Typography color="muted" style={styles.elapsed} type="body-xs">
          {elapsedSeconds}s
        </Typography>
      </View>
      {elapsedSeconds >= 12 ? <WaitingNotice step="preparing" /> : null}
    </View>
  );
}

function PaymentProgress({
  elapsedSeconds,
  paymentMode,
  step
}: {
  elapsedSeconds: number;
  paymentMode: GatewayExecutionMode;
  step: CheckoutExecutionStep;
}) {
  const steps = paymentMode === 'ua7702'
    ? [
        { id: 'routing', label: 'Route stablecoins', detail: 'Particle is preparing USDC or USDT liquidity and destination gas.' },
        { id: 'authorizing', label: 'Authorize account', detail: 'Privy confirms the inline EIP-7702 authorization and UA root hash.' },
        { id: 'submitting', label: 'Submit checkout', detail: 'Particle is sending the Universal Transaction to Arbitrum One.' },
        { id: 'minting', label: 'Mint giftcard', detail: 'The funded gateway is finalizing the giftcard NFT.' },
        { id: 'reconciling', label: 'Sync inventory', detail: 'Mogate is reconciling the Particle transaction and minted token.' }
      ]
    : [
        { id: 'confirming-payment', label: 'Confirm payment', detail: 'Approve the USDC transaction in your wallet.' },
        { id: 'minting', label: 'Mint giftcard', detail: 'The gateway is finalizing the giftcard NFT.' },
        { id: 'reconciling', label: 'Sync inventory', detail: 'Confirming ownership and the latest card state.' }
      ];
  const activeIndex = Math.max(0, steps.findIndex((item) => item.id === step));

  return (
    <View style={styles.progressWrap}>
      <View style={styles.stateCopy}>
        <Typography.Heading style={styles.centerText} type="h3">Checkout in progress</Typography.Heading>
        <Typography color="muted" style={styles.centerText}>
          This screen stays locked until the payment result is known.
        </Typography>
      </View>
      <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
        {steps.map((item, index) => {
          const done = index < activeIndex;
          const active = index === activeIndex;
          return (
            <View key={item.label} style={styles.stepRow}>
              <View style={[styles.stepIcon, active && styles.stepIconActive, done && styles.stepIconDone]}>
                {done ? (
                  <Check color="#ffffff" size={17} />
                ) : active ? (
                  <LoaderCircle color="#e9680c" size={18} />
                ) : (
                  <Circle color="#a1a1aa" size={17} />
                )}
              </View>
              <View style={styles.stepCopy}>
                <Typography type="body-sm" weight={active || done ? 'semibold' : undefined}>
                  {item.label}
                </Typography>
                <Typography color="muted" type="body-xs">{item.detail}</Typography>
              </View>
              {active ? <ActivityIndicator color="#e9680c" size="small" /> : null}
            </View>
          );
        })}
      </Surface>
      <Typography color="muted" style={styles.elapsed} type="body-xs">
        Current stage: {elapsedSeconds}s
      </Typography>
      {elapsedSeconds >= 12 ? <WaitingNotice step={step} /> : null}
    </View>
  );
}

function WaitingNotice({ step }: { step: CheckoutExecutionStep }) {
  const message = step === 'preparing'
    ? 'The checkout service is taking longer than expected. Mogate will show an error automatically if the request reaches its deadline.'
    : step === 'reconciling'
      ? 'The payment result is known, but Inventory is still syncing. Do not submit another payment.'
      : 'Still waiting for the embedded wallet or network. Check for a wallet confirmation prompt and keep Mogate open.';

  return (
    <Surface className="rounded-lg bg-warning-soft p-3 shadow-none" variant="transparent">
      <Typography style={styles.warningText} type="body-xs">{message}</Typography>
    </Surface>
  );
}

function CompleteState() {
  return (
    <View style={styles.stateStack}>
      <View style={[styles.loaderWell, styles.completeWell]}>
        <PackageCheck color="#2f8f5b" size={42} />
      </View>
      <View style={styles.stateCopy}>
        <Typography.Heading style={styles.centerText} type="h3">Giftcard ready</Typography.Heading>
        <Typography color="muted" style={styles.centerText}>
          Payment and mint completed. Opening your inventory.
        </Typography>
      </View>
      <View style={styles.successLine}>
        <CheckCircle2 color="#2f8f5b" size={18} />
        <Typography style={styles.successText} type="body-sm" weight="semibold">Checkout complete</Typography>
      </View>
    </View>
  );
}

function ErrorState({
  error,
  onRetry,
  onReturn
}: {
  error: string | null;
  onRetry: () => void | Promise<void>;
  onReturn: () => void;
}) {
  return (
    <View style={styles.stateStack}>
      <View style={[styles.loaderWell, styles.errorWell]}>
        <CircleAlert color="#c43d45" size={40} />
      </View>
      <View style={styles.stateCopy}>
        <Typography.Heading style={styles.centerText} type="h3">Checkout needs attention</Typography.Heading>
        <Typography color="muted" style={styles.centerText}>{error ?? 'The checkout could not finish.'}</Typography>
      </View>
      <View style={styles.errorActions}>
        <Button className="flex-1 rounded-lg" onPress={onReturn} variant="secondary">
          <Button.Label>Return</Button.Label>
        </Button>
        <Button className="flex-1 rounded-lg" onPress={onRetry} variant="primary">
          <Button.Label>Try again</Button.Label>
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#f5f5f5',
    flex: 1,
    paddingHorizontal: 22
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 54
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  topCopy: {
    flex: 1,
    gap: 2
  },
  center: {
    flex: 1,
    justifyContent: 'center'
  },
  stateStack: {
    alignItems: 'center',
    gap: 24
  },
  loaderWell: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 48,
    height: 96,
    justifyContent: 'center',
    width: 96
  },
  completeWell: {
    backgroundColor: '#eaf7ef'
  },
  errorWell: {
    backgroundColor: '#fdecee'
  },
  stateCopy: {
    gap: 8,
    maxWidth: 330
  },
  centerText: {
    textAlign: 'center'
  },
  elapsed: {
    textAlign: 'center'
  },
  progressWrap: {
    gap: 24
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 70
  },
  stepIcon: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 20,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  stepIconActive: {
    backgroundColor: '#fff1e8',
    borderColor: '#e9680c',
    borderWidth: 1
  },
  stepIconDone: {
    backgroundColor: '#2f8f5b'
  },
  stepCopy: {
    flex: 1,
    gap: 3
  },
  successLine: {
    alignItems: 'center',
    backgroundColor: '#eaf7ef',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  successText: {
    color: '#257448'
  },
  errorActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%'
  },
  lockedCopy: {
    textAlign: 'center'
  },
  warningText: {
    color: '#7b5812',
    lineHeight: 18,
    textAlign: 'center'
  }
});
