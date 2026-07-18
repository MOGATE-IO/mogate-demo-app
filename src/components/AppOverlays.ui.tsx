import { TopUpSheet } from '@/features/topup/components/TopUpSheet.ui';
import { useMobileApp } from '@/providers/MobileAppProvider';

export function AppOverlays() {
  const controller = useMobileApp();
  const { topUpSheet, wallet } = controller;
  const connected = wallet.snapshot.status === 'connected';

  return (
    <TopUpSheet
      copied={topUpSheet.copied}
      copyError={topUpSheet.copyError}
      evmAddress={wallet.snapshot.ownerAddress || wallet.snapshot.address}
      onClose={topUpSheet.close}
      onCopyAddress={topUpSheet.copyAddress}
      onProviderTopUp={controller.executeTopUp}
      solanaAddress={wallet.snapshot.linkedSolanaAddress || wallet.snapshot.solanaUaAddress}
      status={controller.topUpStatus}
      visible={topUpSheet.visible && connected}
    />
  );
}
