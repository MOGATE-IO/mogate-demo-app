import { describe, expect, it } from 'vitest';

import type { HexString } from '../src/@web3/types/wallet';
import {
  getGiftcardActions,
  giftcardActionLabel,
  isGiftcardAction
} from '../src/features/inventory/services/giftcardActions';
import type { GiftcardInventoryItem } from '../src/features/inventory/services/giftcardInventory';
import { hasReservedGas } from '../src/features/inventory/services/giftcardTransactions';

const collection = '0x1111111111111111111111111111111111111111' as HexString;

function item(overrides: Partial<GiftcardInventoryItem> = {}): GiftcardInventoryItem {
  return {
    id: `${collection}:1`,
    collection,
    collectionName: 'Mogate Funded Giftcard',
    tokenId: '1',
    title: 'Funded Giftcard',
    brandName: 'Mogate',
    category: 'Giftcard',
    value: 10,
    currency: 'USD',
    region: 'GLOBAL',
    imageUrl: null,
    metadataUri: null,
    externalUrl: null,
    networkLabel: 'Arbitrum One',
    isUnwrapped: false,
    isEncrypted: false,
    encryptionType: null,
    giftCode: null,
    isFunded: true,
    fundBalances: [],
    gasReserveAtomic: '100000000000000',
    gasReserveDisplay: '0.0001',
    attributes: [],
    discovery: 'enumerable',
    ...overrides
  };
}

describe('giftcard detail actions', () => {
  it('offers funded ownership, unwrap, and Commerce Code actions while wrapped', () => {
    expect(getGiftcardActions(item())).toEqual([
      'view',
      'send',
      'unwrap',
      'payment-code'
    ]);
    expect(giftcardActionLabel('payment-code')).toBe('Claim code');
  });

  it('only offers balance withdrawal after a funded giftcard is unwrapped', () => {
    expect(getGiftcardActions(item({ isUnwrapped: true }))).toEqual([
      'view',
      'withdraw-all'
    ]);
  });

  it('preserves encrypted voucher reveal actions', () => {
    const encrypted = item({ isFunded: false, isEncrypted: true });
    expect(getGiftcardActions(encrypted)).toEqual([
      'view',
      'send',
      'claim',
      'payment-code'
    ]);
    expect(getGiftcardActions({ ...encrypted, isUnwrapped: true })).toEqual(['view', 'claim']);
  });

  it('recognizes the new protected routes', () => {
    expect(isGiftcardAction('unwrap')).toBe(true);
    expect(isGiftcardAction('withdraw-all')).toBe(true);
  });

  it('routes only positive per-card reserves through sponsored execution', () => {
    expect(hasReservedGas(item())).toBe(true);
    expect(hasReservedGas(item({ gasReserveAtomic: '0' }))).toBe(false);
    expect(hasReservedGas(item({ gasReserveAtomic: null }))).toBe(false);
  });
});
