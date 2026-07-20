import { Linking } from 'react-native';

import { GiftcardActionView } from '@/features/inventory/components/GiftcardActionView.ui';
import { useGiftcardAction } from '@/features/inventory/hooks/useGiftcardAction';
import type { GiftcardAction } from '@/features/inventory/services/giftcardActions';
import { getGiftcardExplorerUrl } from '@/features/inventory/services/giftcardLinks';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import type { AppScreenContext } from './types';

export function GiftcardActionScreen({
  action,
  context,
  item,
  onBack
}: {
  action: GiftcardAction;
  context: AppScreenContext;
  item: GiftcardInventoryItem;
  onBack: () => void;
}) {
  const state = useGiftcardAction({
    inventory: context.inventory,
    item,
    onSent: () => context.goToTab('inventory')
  });
  const explorerUrl = getGiftcardExplorerUrl(context.profile, item);

  return (
    <GiftcardActionView
      action={action}
      claimComplete={state.claimComplete}
      claimedCode={state.claimedCode}
      claimedPinCode={state.claimedPinCode}
      claiming={state.claiming}
      copied={state.copied}
      error={state.error}
      generatingPaymentCode={state.generatingPaymentCode}
      item={item}
      onBack={onBack}
      onClaim={state.claim}
      onCopyPaymentCode={state.copyPaymentCode}
      onGeneratePaymentCode={state.generatePaymentCode}
      onOpenExplorer={() => Linking.openURL(explorerUrl)}
      onRecipientChange={state.setRecipient}
      onSend={state.send}
      onUnwrap={state.unwrap}
      onWithdrawAll={state.withdrawAll}
      paymentCode={state.paymentCode}
      paymentCodeConfigured={state.paymentCodeConfigured}
      paymentCodeExpiry={state.paymentCodeExpiry}
      recipient={state.recipient}
      sending={state.sending}
      unwrapping={state.unwrapping}
      withdrawing={state.withdrawing}
    />
  );
}
