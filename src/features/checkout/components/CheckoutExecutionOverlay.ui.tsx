import { useEffect, useRef } from 'react';
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

export function CheckoutExecutionOverlay({
  amountLabel,
  error,
  onComplete,
  onRetry,
  onReturn,
  step
}: {
  amountLabel: string;
  error: string | null;
  onComplete: () => void;
  onRetry: () => void | Promise<void>;
  onReturn: () => void;
  step: CheckoutExecutionStep;
}) {
  const insets = useSafeAreaInsets();
  const completionScheduled = useRef(false);
  const visible = step !== 'idle';

  useEffect(() => {
    if (step !== 'complete') {
      completionScheduled.current = false;
      return undefined;
    }
    if (completionScheduled.current) return undefined;
    completionScheduled.current = true;
    const timer = setTimeout(onComplete, 1100);
    return () => clearTimeout(timer);
  }, [onComplete, step]);

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
            <PreparationState />
          ) : step === 'error' ? (
            <ErrorState error={error} onRetry={onRetry} onReturn={onReturn} />
          ) : step === 'complete' ? (
            <CompleteState />
          ) : (
            <PaymentProgress step={step} />
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

function PreparationState() {
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
      </View>
    </View>
  );
}

function PaymentProgress({ step }: { step: CheckoutExecutionStep }) {
  const activeIndex = step === 'confirming-payment' ? 0 : step === 'minting' ? 1 : 2;
  const steps = [
    { label: 'Confirm payment', detail: 'Approve the USDC transaction in your wallet.' },
    { label: 'Minting giftcard', detail: 'The gateway is finalizing the giftcard NFT.' },
    { label: 'Syncing inventory', detail: 'Confirming ownership and the latest card state.' }
  ];

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
    </View>
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
  }
});
