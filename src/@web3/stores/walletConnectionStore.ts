import { create } from 'zustand';

import { CURRENT_WALLET_STACK } from '@/@web3/config/walletStack';
import type { WalletSnapshot, WalletStack } from '@/@web3/types/wallet';

const defaultCapabilities = {
  eip712: 'unknown',
  eip7702Authorization: 'unknown',
  universalAccount: 'unknown',
  topUp: 'unknown'
} as const;

const initialSnapshot: WalletSnapshot = {
  stack: CURRENT_WALLET_STACK,
  status: 'idle',
  address: null,
  ownerAddress: null,
  evmUaAddress: null,
  solanaUaAddress: null,
  linkedSolanaAddress: null,
  balance: null,
  identity: null,
  capabilities: defaultCapabilities,
  lastError: null,
  lastUpdatedAt: null
};

type WalletConnectionState = {
  selectedStack: WalletStack;
  snapshot: WalletSnapshot;
  setSelectedStack: (stack: WalletStack) => void;
  setSnapshot: (snapshot: Partial<WalletSnapshot>) => void;
  resetSnapshot: () => void;
};

export const useWalletConnectionStore = create<WalletConnectionState>((set, get) => ({
  selectedStack: CURRENT_WALLET_STACK,
  snapshot: initialSnapshot,
  setSelectedStack: (stack) =>
    set({
      selectedStack: stack,
      snapshot: {
        ...initialSnapshot,
        stack
      }
    }),
  setSnapshot: (snapshot) =>
    set({
      snapshot: {
        ...get().snapshot,
        ...snapshot,
        stack: snapshot.stack ?? get().selectedStack,
        capabilities: {
          ...get().snapshot.capabilities,
          ...snapshot.capabilities
        },
        lastUpdatedAt: Date.now()
      }
    }),
  resetSnapshot: () =>
    set({
      snapshot: {
        ...initialSnapshot,
        stack: get().selectedStack
      }
    })
}));
