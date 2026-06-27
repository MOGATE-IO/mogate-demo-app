import type { WalletAdapter, WalletSnapshot, WalletStack } from '@/types/wallet';

type PlannedStack = Extract<WalletStack, 'dynamic' | 'magic' | 'particle'>;

const PROVIDER_COPY: Record<PlannedStack, string> = {
  magic:
    'Magic is a reference signer for Particle UA EIP-7702, but its Expo RN packages are not installed in the default product app until the native dependency tree is Expo SDK 56 clean.',
  dynamic:
    'Dynamic WaaS is planned for this build. Add Dynamic RN client/WaaS and map waasConnector.signAuthorization() into the WalletAdapter before enabling UA sends.',
  particle:
    'Particle RN Auth is disabled in the default Privy login/top-up development build. Re-enable the Particle native packages only for the Particle Auth probe.'
};

export function createPlannedSignerAdapter(stack: PlannedStack): WalletAdapter {
  const message = PROVIDER_COPY[stack];

  async function connect(): Promise<WalletSnapshot> {
    return {
      stack,
      status: 'unsupported',
      address: null,
      ownerAddress: null,
      evmUaAddress: null,
      solanaUaAddress: null,
      balance: null,
      capabilities: {
        eip712: 'unknown',
        eip7702Authorization: 'blocked',
        universalAccount: 'blocked',
        topUp: 'unknown'
      },
      lastError: message
    };
  }

  return {
    stack,
    label: `${stack} EIP-7702 signer`,
    connect,
    async disconnect() {},
    async refresh() {
      return connect();
    },
    async signMessage() {
      throw new Error(message);
    }
  };
}
