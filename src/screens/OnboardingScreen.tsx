import { useState } from 'react';

import { OnboardingPanel } from '@/features/auth/components/OnboardingPanel';
import type { AppScreenContext } from './types';

const ONBOARDING_STEPS = 3;

export function OnboardingScreen({ context }: { context: AppScreenContext }) {
  const [step, setStep] = useState(0);

  return (
    <OnboardingPanel
      error={context.wallet.snapshot.lastError}
      loading={context.wallet.snapshot.status === 'connecting'}
      onConnect={context.wallet.connect}
      onNext={() => setStep((current) => Math.min(current + 1, ONBOARDING_STEPS - 1))}
      step={step}
      totalSteps={ONBOARDING_STEPS}
      walletReady={context.wallet.isAdapterReady}
      walletStatus={context.wallet.snapshot.status}
    />
  );
}
