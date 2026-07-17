import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';

export type GiftcardAction = 'view' | 'send' | 'claim' | 'payment-code';

export function getGiftcardActions(item: GiftcardInventoryItem): GiftcardAction[] {
  if (item.isUnwrapped) return ['view', 'claim'];
  return [
    'view',
    'send',
    'claim',
    'payment-code'
  ];
}

export function isGiftcardAction(value: string | undefined): value is GiftcardAction {
  return value === 'view' || value === 'send' || value === 'claim' || value === 'payment-code';
}

export function giftcardActionLabel(action: GiftcardAction) {
  switch (action) {
    case 'view': return 'NFT record';
    case 'send': return 'Send giftcard';
    case 'claim': return 'Claim code';
    case 'payment-code': return 'Generate code';
  }
}
