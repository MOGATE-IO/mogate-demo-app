import type { GatewayExecutionMode } from '@/config/networkProfiles';

export function getCheckoutFundingReadiness(input: {
  executionMode: GatewayExecutionMode;
  balanceStatus: 'idle' | 'loading' | 'ready' | 'error';
  requestedAmount: number;
  targetNativeAmount: number;
  targetUsdcAmount: number;
  unifiedStablecoinAmount: number;
}) {
  const uaExecution = input.executionMode === 'ua7702';

  return {
    hasSpendableBalance:
      input.balanceStatus === 'ready' &&
      (uaExecution
        ? input.unifiedStablecoinAmount >= input.requestedAmount
        : input.targetUsdcAmount >= input.requestedAmount),
    hasTargetGas: uaExecution || input.targetNativeAmount > 0
  };
}
