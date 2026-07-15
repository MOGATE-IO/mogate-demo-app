import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserProvider, Contract, getAddress, isAddress, toBeHex } from 'ethers';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { WalletAdapter } from '@/@web3/types/wallet';
import {
  loadGiftcardInventory,
  type GiftcardInventoryItem
} from '@/features/inventory/services/giftcardInventory';
import { toErrorMessage } from '@/utils/errors';

const TRANSFER_ABI = [
  'function safeTransferFrom(address from, address to, uint256 tokenId)'
] as const;

type Eip1193Provider = {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
};

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
    setItems([]);
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
    if (!ownerAddress || !isAddress(ownerAddress)) throw new Error('Connect the owning EVM wallet first.');
    if (!isAddress(recipient)) throw new Error('Enter a valid EVM recipient address.');
    if (getAddress(recipient) === getAddress(ownerAddress)) throw new Error('The recipient already owns this wallet.');
    if (!wallet?.getProvider) throw new Error('The connected wallet cannot send EVM transactions.');

    setSendingId(item.id);
    setLastError(null);
    try {
      const rawProvider = await wallet.getProvider() as Eip1193Provider;
      const chainHex = toBeHex(profile.ua.targetChainId).toLowerCase();
      try {
        await rawProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainHex }]
        });
      } catch (error) {
        const current = String(await rawProvider.request({ method: 'eth_chainId' })).toLowerCase();
        if (current !== chainHex) throw error;
      }

      const provider = new BrowserProvider(rawProvider);
      const signer = await provider.getSigner(ownerAddress);
      const collection = new Contract(item.collection, TRANSFER_ABI, signer);
      const transaction = await collection['safeTransferFrom(address,address,uint256)'](
        getAddress(ownerAddress),
        getAddress(recipient),
        BigInt(item.tokenId)
      );
      const receipt = await transaction.wait();
      if (!receipt || receipt.status !== 1) throw new Error('Giftcard transfer reverted.');
      await refresh();
      return transaction.hash as string;
    } catch (error) {
      setLastError(toErrorMessage(error));
      throw error;
    } finally {
      setSendingId(null);
    }
  }, [ownerAddress, profile.ua.targetChainId, refresh, wallet]);

  const totalValue = useMemo(
    () => items.reduce((total, item) => total + (item.value ?? 0), 0),
    [items]
  );

  return {
    items,
    status,
    lastError,
    sendingId,
    totalValue,
    refresh,
    sendGiftcard
  };
}

export type GiftcardInventoryState = ReturnType<typeof useGiftcardInventory>;
