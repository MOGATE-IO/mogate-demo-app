import { Linking } from 'react-native';

import { GiftcardDetailView } from '@/features/inventory/components/GiftcardDetailView.ui';
import { getGiftcardActions } from '@/features/inventory/services/giftcardActions';
import { getGiftcardExplorerUrl } from '@/features/inventory/services/giftcardLinks';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import type { AppScreenContext } from './types';

export function GiftcardDetailScreen({
  context,
  item,
  onBack
}: {
  context: AppScreenContext;
  item: GiftcardInventoryItem;
  onBack: () => void;
}) {
  const explorerUrl = getGiftcardExplorerUrl(context.profile, item);

  return (
    <GiftcardDetailView
      actions={getGiftcardActions(item)}
      item={item}
      onAction={(action) => context.goToGiftcardAction(item.tokenId, action)}
      onBack={onBack}
      onOpenExplorer={() => Linking.openURL(explorerUrl)}
    />
  );
}
