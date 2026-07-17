import { ReceiveQrView } from '@/features/request/components/ReceiveQrView.ui';
import { useReceiveQr } from '@/features/request/hooks/useReceiveQr';
import type { AppScreenContext } from './types';

export function ReceiveQrScreen({ context, onBack }: { context: AppScreenContext; onBack: () => void }) {
  const ownerAddress = context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address || '';
  const qr = useReceiveQr(ownerAddress);

  return (
    <ReceiveQrView
      copied={qr.copied}
      networkLabel={context.profile.ua.chainLabel}
      onBack={onBack}
      onCopy={qr.copyAddress}
      ownerAddress={ownerAddress}
      payload={qr.payload}
    />
  );
}
