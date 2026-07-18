import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { WalletAdapter } from '@/@web3/types/wallet';
import {
  generateProgrammablePaymentCode,
  hasProgrammablePaymentCodePreset
} from '@/features/inventory/services/programmablePaymentCode';
import { pinCommerceCodeEnvelope } from '@/features/inventory/services/commerceCodeStorage';
import {
  loadGiftcardInventory,
  type GiftcardInventoryItem
} from '@/features/inventory/services/giftcardInventory';
import {
  transferGiftcard,
  unwrapGiftcard as executeGiftcardUnwrap,
  withdrawAllGiftcard as executeGiftcardWithdrawAll
} from '@/features/inventory/services/giftcardTransactions';
import { revealGiftcardCode } from '@/features/inventory/services/giftcardReveal';
import { toErrorMessage } from '@/utils/errors';

export function useGiftcardInventory({
  ownerAddress,
  profile,
  refreshKey,
  wallet
}: {
  ownerAddress?: string | null;
  profile: RuntimeNetworkProfile;
  refreshKey?: string | null;
  wallet?: WalletAdapter | null;
}) {
  const [items, setItems] = useState<GiftcardInventoryItem[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [unwrappingId, setUnwrappingId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [generatingCodeId, setGeneratingCodeId] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  const refresh = useCallback(async () => {
    if (!ownerAddress) {
      setItems([]);
      setStatus('idle');
      setLastError(null);
      return;
    }

    const generation = ++loadGeneration.current;
    setStatus('loading');
    setLastError(null);
    try {
      const loaded = await loadGiftcardInventory({
        ownerAddress,
        profile,
        onProgress: (item) => {
          if (generation !== loadGeneration.current) return;
          setItems((current) => current.some((candidate) => candidate.id === item.id)
            ? current
            : [...current, item].sort((a, b) => Number(BigInt(b.tokenId) - BigInt(a.tokenId))));
        }
      });
      if (generation !== loadGeneration.current) return;
      setItems(loaded);
      setStatus('ready');
    } catch (error) {
      if (generation !== loadGeneration.current) return;
      setLastError(toErrorMessage(error));
      setStatus('error');
    }
  }, [ownerAddress, profile]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  const sendGiftcard = useCallback(async (item: GiftcardInventoryItem, recipient: string) => {
    if (!ownerAddress) throw new Error('Connect the owning EVM wallet first.');
    if (!wallet) throw new Error('The connected wallet cannot send EVM transactions.');

    setSendingId(item.id);
    setLastError(null);
    try {
      const transactionHash = await transferGiftcard({
        item,
        ownerAddress,
        profile,
        recipient,
        wallet
      });
      await refresh();
      return transactionHash;
    } catch (error) {
      setLastError(toErrorMessage(error));
      throw error;
    } finally {
      setSendingId(null);
    }
  }, [ownerAddress, profile, refresh, wallet]);

  const totalValue = useMemo(
    () => items.reduce((total, item) => total + (item.value ?? 0), 0),
    [items]
  );

  const unwrapGiftcard = useCallback(async (item: GiftcardInventoryItem) => {
    if (!ownerAddress) throw new Error('Connect the owning EVM wallet first.');
    if (!wallet) throw new Error('The connected wallet cannot unwrap this giftcard.');

    setUnwrappingId(item.id);
    setLastError(null);
    try {
      const result = await executeGiftcardUnwrap({ item, ownerAddress, profile, wallet });
      const revealed = !item.isFunded && item.isEncrypted
        ? await revealGiftcardCode({ item, ownerAddress, profile, wallet })
        : null;
      return {
        ...result,
        code: revealed?.code ?? item.giftCode,
        pinCode: revealed?.pinCode
      };
    } catch (error) {
      setLastError(toErrorMessage(error));
      throw error;
    } finally {
      await refresh().catch(() => undefined);
      setUnwrappingId(null);
    }
  }, [ownerAddress, profile, refresh, wallet]);

  const createPaymentCode = useCallback(async (
    item: GiftcardInventoryItem,
    options?: { expirySeconds?: number; recipientAddress?: string; ua7702?: boolean }
  ) => {
    if (!ownerAddress) throw new Error('Connect the owning EVM wallet first.');
    if (!wallet) throw new Error('The connected wallet cannot sign payment codes.');

    setGeneratingCodeId(item.id);
    setLastError(null);
    try {
      const generated = await generateProgrammablePaymentCode({
        expirySeconds: options?.expirySeconds,
        item,
        ownerAddress,
        profile,
        recipientAddress: options?.recipientAddress,
        ua7702: options?.ua7702 ?? false,
        wallet
      });
      if (!options?.recipientAddress?.trim()) {
        return { ...generated, cid: null };
      }
      const pinned = await pinCommerceCodeEnvelope({ envelope: generated.envelope, profile });
      return { ...generated, cid: pinned.cid, ipfsUri: pinned.uri };
    } catch (error) {
      setLastError(toErrorMessage(error));
      throw error;
    } finally {
      setGeneratingCodeId(null);
    }
  }, [ownerAddress, profile, wallet]);

  const withdrawAllGiftcard = useCallback(async (item: GiftcardInventoryItem) => {
    if (!ownerAddress) throw new Error('Connect the owning EVM wallet first.');
    if (!wallet) throw new Error('The connected wallet cannot withdraw this giftcard.');

    setWithdrawingId(item.id);
    setLastError(null);
    try {
      const transactionHash = await executeGiftcardWithdrawAll({
        item,
        ownerAddress,
        profile,
        wallet
      });
      await refresh();
      return transactionHash;
    } catch (error) {
      setLastError(toErrorMessage(error));
      throw error;
    } finally {
      setWithdrawingId(null);
    }
  }, [ownerAddress, profile, refresh, wallet]);

  return {
    items,
    status,
    lastError,
    sendingId,
    unwrappingId,
    withdrawingId,
    generatingCodeId,
    paymentCodeConfigured: hasProgrammablePaymentCodePreset(profile.ua.targetChainId),
    totalValue,
    refresh,
    sendGiftcard,
    unwrapGiftcard,
    withdrawAllGiftcard,
    claimGiftcardCode: unwrapGiftcard,
    createPaymentCode
  };
}

export type GiftcardInventoryState = ReturnType<typeof useGiftcardInventory>;
