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
  const [claimComplete, setClaimComplete] = useState(Boolean(item.giftCode));
  const [paymentCode, setPaymentCode] = useState<string | null>(null);
  const [fullPaymentCode, setFullPaymentCode] = useState<string | null>(null);
  const [paymentCodeExpiry, setPaymentCodeExpiry] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedFullPaymentCode, setCopiedFullPaymentCode] = useState(false);

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

  const unwrap = useCallback(async () => {
    setError(null);
    try {
      await inventory.unwrapGiftcard(item);
      onSent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Giftcard unwrap failed.');
    }
  }, [inventory, item, onSent]);

  const withdrawAll = useCallback(async () => {
    setError(null);
    try {
      await inventory.withdrawAllGiftcard(item);
      onSent();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Giftcard withdrawal failed.');
    }
  }, [inventory, item, onSent]);

  const generatePaymentCode = useCallback(async () => {
    setError(null);
    setCopied(false);
    setCopiedFullPaymentCode(false);
    try {
      if (!recipient.trim()) {
        throw new Error('Enter the recipient wallet before publishing a Commerce Code CID.');
      }
      const result = await inventory.createPaymentCode(item, {
        expirySeconds: 15 * 60,
        recipientAddress: recipient.trim(),
        ua7702: true
      });
      if (!result.cid) {
        throw new Error('Commerce Code CID was not returned by the pinning service.');
      }
      setPaymentCode(result.cid);
      setFullPaymentCode(result.code);
      setPaymentCodeExpiry(result.expiresAtUnixSeconds);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment-code generation failed.');
    }
  }, [inventory, item, recipient]);

  const copyPaymentCode = useCallback(async () => {
    if (!paymentCode) return;
    await Clipboard.setStringAsync(paymentCode);
    setCopied(true);
  }, [paymentCode]);

  const copyFullPaymentCode = useCallback(async () => {
    if (!fullPaymentCode) return;
    await Clipboard.setStringAsync(fullPaymentCode);
    setCopiedFullPaymentCode(true);
  }, [fullPaymentCode]);

  return {
    claim,
    claimComplete,
    claimedCode,
    claimedPinCode,
    claiming: inventory.unwrappingId === item.id,
    copied,
    copiedFullPaymentCode,
    copyFullPaymentCode,
    copyPaymentCode,
    error,
    generatePaymentCode,
    generatingPaymentCode: inventory.generatingCodeId === item.id,
    paymentCode,
    fullPaymentCode,
    paymentCodeConfigured: inventory.paymentCodeConfigured,
    paymentCodeExpiry,
    recipient,
    send,
    sending: inventory.sendingId === item.id,
    unwrap,
    unwrapping: inventory.unwrappingId === item.id,
    withdrawAll,
    withdrawing: inventory.withdrawingId === item.id,
    setRecipient
  };
}
