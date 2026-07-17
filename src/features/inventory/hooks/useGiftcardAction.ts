import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';

import type { GiftcardInventoryState } from '@/features/inventory/hooks/useGiftcardInventory';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';

export function useGiftcardAction({
  inventory,
  item,
  onSent
}: {
  inventory: GiftcardInventoryState;
  item: GiftcardInventoryItem;
  onSent: () => void;
}) {
  const [recipient, setRecipient] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [claimedCode, setClaimedCode] = useState<string | null>(item.giftCode);
  const [claimedPinCode, setClaimedPinCode] = useState<string | null>(null);
  const [claimComplete, setClaimComplete] = useState(
    item.isFunded ? item.isUnwrapped : Boolean(item.giftCode)
  );
  const [paymentCode, setPaymentCode] = useState<string | null>(null);
  const [paymentCodeExpiry, setPaymentCodeExpiry] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const send = useCallback(async () => {
    setError(null);
    try {
      await inventory.sendGiftcard(item, recipient.trim());
      setRecipient('');
      onSent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Giftcard transfer failed.');
    }
  }, [inventory, item, onSent, recipient]);

  const claim = useCallback(async () => {
    setError(null);
    try {
      const result = await inventory.claimGiftcardCode(item);
      setClaimComplete(true);
      setClaimedCode(result.code);
      setClaimedPinCode(result.pinCode ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Giftcard claim failed.');
    }
  }, [inventory, item]);

  const generatePaymentCode = useCallback(async () => {
    setError(null);
    setCopied(false);
    try {
      const result = await inventory.createPaymentCode(item, {
        expirySeconds: 15 * 60,
        ua7702: false
      });
      setPaymentCode(result.code);
      setPaymentCodeExpiry(result.expiresAtUnixSeconds);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment-code generation failed.');
    }
  }, [inventory, item]);

  const copyPaymentCode = useCallback(async () => {
    if (!paymentCode) return;
    await Clipboard.setStringAsync(paymentCode);
    setCopied(true);
  }, [paymentCode]);

  return {
    claim,
    claimComplete,
    claimedCode,
    claimedPinCode,
    claiming: inventory.unwrappingId === item.id,
    copied,
    copyPaymentCode,
    error,
    generatePaymentCode,
    generatingPaymentCode: inventory.generatingCodeId === item.id,
    paymentCode,
    paymentCodeExpiry,
    recipient,
    send,
    sending: inventory.sendingId === item.id,
    unwrap: claim,
    unwrapping: inventory.unwrappingId === item.id,
    setRecipient
  };
}
