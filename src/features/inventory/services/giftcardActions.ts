import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';

export type GiftcardAction =
  | 'view'
  | 'send'
  | 'claim'
  | 'unwrap'
  | 'payment-code'
  | 'withdraw-all';

export function getGiftcardActions(item: GiftcardInventoryItem): GiftcardAction[] {
  if (item.isFunded) {
    return item.isUnwrapped
      ? ['view', 'withdraw-all']
      : ['view', 'send', 'unwrap', 'payment-code'];
  }
  if (item.isUnwrapped) return ['view', 'claim'];
  return [
    'view',
    'send',
    'claim',
    'payment-code'
  ];
}

export function isGiftcardAction(value: string | undefined): value is GiftcardAction {
  return value === 'view' ||
    value === 'send' ||
    value === 'claim' ||
    value === 'unwrap' ||
    value === 'payment-code' ||
    value === 'withdraw-all';
}

export function giftcardActionLabel(action: GiftcardAction) {
  switch (action) {
    case 'view': return 'NFT record';
    case 'send': return 'Send giftcard';
    case 'claim': return 'Reveal code';
    case 'unwrap': return 'Unwrap';
    case 'payment-code': return 'Claim code';
    case 'withdraw-all': return 'Withdraw all';
  }
}
