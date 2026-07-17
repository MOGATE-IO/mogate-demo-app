import type { WalletAdapter, WalletSnapshot } from '@/@web3/types/wallet';

function previewSnapshot(ownerAddress: string, solanaAddress: string): WalletSnapshot {
  return {
    stack: 'privy',
    status: 'connected',
    address: ownerAddress,
    ownerAddress,
    evmUaAddress: null,
    solanaUaAddress: null,
    linkedSolanaAddress: solanaAddress,
    balance: null,
    identity: {
      provider: 'privy',
      providerUserId: 'simulator-preview',
      displayNames: ['dellryuzi@gmail.com'],
      linkedAccountTypes: ['google_oauth'],
      loginMethods: ['google'],
      oauthSubjects: [],
      oauthEmails: ['dellryuzi@gmail.com'],
      embeddedEvmWallets: [ownerAddress],
      embeddedSolanaWallets: [solanaAddress],
      warnings: ['Read-only simulator preview. Signing and funding are disabled.']
    },
    capabilities: {
      eip712: 'blocked',
      eip7702Authorization: 'blocked',
      universalAccount: 'unknown',
      topUp: 'blocked'
    },
    lastError: null
  };
}

export function createSimulatorPreviewAdapter(ownerAddress: string, solanaAddress: string): WalletAdapter {
  const snapshot = previewSnapshot(ownerAddress, solanaAddress);
  const readOnlyError = 'Signing is disabled in the read-only simulator preview.';

  return {
    stack: 'privy',
    label: 'Simulator preview wallet',
    autoConnect: true,
    isReady: true,
    readinessLabel: 'Read-only preview',
    async connect() {
      return snapshot;
    },
    async disconnect() {},
    async refresh() {
      return snapshot;
    },
    async signMessage() {
      throw new Error(readOnlyError);
    },
    async signTypedData() {
      throw new Error(readOnlyError);
    }
  };
}
