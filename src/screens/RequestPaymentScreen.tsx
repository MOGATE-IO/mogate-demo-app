import { RequestPaymentView } from '@/features/request/components/RequestPaymentView.ui';
import { usePaymentRequest } from '@/features/request/hooks/usePaymentRequest';
import type { AppScreenContext } from './types';

export function RequestPaymentScreen({
  context,
  onBack
}: {
  context: AppScreenContext;
  onBack: () => void;
}) {
  const ownerAddress = context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address || '';
  const request = usePaymentRequest({
    networkMode: context.profile.mode,
    ownerAddress
  });

  return (
    <RequestPaymentView
      amount={request.amount}
      memo={request.memo}
      onBack={onBack}
      onAmountChange={request.setAmount}
      onCreate={request.create}
      onMemoChange={request.setMemo}
      ownerAddress={ownerAddress}
      requestId={request.requestId}
    />
  );
}
