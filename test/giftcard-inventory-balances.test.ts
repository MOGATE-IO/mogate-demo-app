import { describe, expect, it } from 'vitest';

import { parseGiftcardBalanceView } from '../src/features/inventory/services/giftcardInventory';

const native = '0x0000000000000000000000000000000000000000';

describe('funded giftcard balance decoding', () => {
  it('decodes the funded collection struct returned by ethers', () => {
    const parsed = parseGiftcardBalanceView([
      [[native, 5n]],
      7n,
      2n,
      false
    ]);

    expect(parsed).toEqual({
      values: [[native, 5n]],
      gasReserve: 7n
    });
  });

  it('accepts an ABI result container around the returned struct', () => {
    const parsed = parseGiftcardBalanceView([[
      [[native, 10n]],
      12n,
      0n,
      false
    ]]);

    expect(parsed?.gasReserve).toBe(12n);
    expect(parsed?.values).toHaveLength(1);
  });

  it('does not classify an unavailable legacy read as funded', () => {
    expect(parseGiftcardBalanceView(null)).toBeNull();
    expect(parseGiftcardBalanceView([])).toBeNull();
  });
});
