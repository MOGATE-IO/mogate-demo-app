export type WalletStack = 'privy' | 'magic' | 'dynamic' | 'particle';

export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'unsupported' | 'error';

export type CapabilityState = 'unknown' | 'supported' | 'unsupported' | 'blocked';

export type HexString = `0x${string}`;

export type UniversalWalletAddresses = {
  ownerAddress?: string | null;
  evmUaAddress?: string | null;
  solanaUaAddress?: string | null;
  linkedSolanaAddress?: string | null;
};

export type UnifiedChainToken = {
  chainId?: number;
  address?: string;
  symbol?: string;
  name?: string;
  decimals?: number;
  realDecimals?: number;
};

export type UnifiedChainAssetBreakdown = {
  token?: UnifiedChainToken;
  amount?: string | number;
  amountInUSD?: string | number;
  rawAmount?: string | number;
};

export type UnifiedAssetBreakdown = {
  tokenType?: string;
  amount?: string | number;
  amountInUSD?: string | number;
  chainAggregation?: UnifiedChainAssetBreakdown[];
};

export type UnifiedBalance = {
  totalAmountInUSD?: string | number;
  assets?: UnifiedAssetBreakdown[];
};

export type WalletCapabilities = {
  eip712: CapabilityState;
  eip7702Authorization: CapabilityState;
  universalAccount: CapabilityState;
  topUp: CapabilityState;
};

export type WalletIdentitySnapshot = {
  provider: WalletStack;
  providerUserId?: string | null;
  providerUserCreatedAt?: number | null;
  displayNames: string[];
  linkedAccountTypes: string[];
  loginMethods: string[];
  oauthSubjects: string[];
  oauthEmails: string[];
  embeddedEvmWallets: string[];
  embeddedSolanaWallets: string[];
  warnings: string[];
};

export type WalletSnapshot = UniversalWalletAddresses & {
  stack: WalletStack;
  status: WalletStatus;
  address?: string | null;
  balance?: UnifiedBalance | null;
  identity?: WalletIdentitySnapshot | null;
  capabilities: WalletCapabilities;
  lastError?: string | null;
  lastUpdatedAt?: number | null;
};

export type Eip7702AuthorizationRequest = {
  address: HexString;
  chainId: number;
  nonce: string | number | bigint;
};

export type SignedEip7702Authorization = {
  signature: HexString;
};

export type WalletTopUpRequest = {
  address: string;
  amount?: string;
  asset?: 'USDC' | 'native-currency';
  chainId?: number;
  chainLabel?: string;
  sandbox?: boolean;
};

export type WalletAdapter = {
  stack: WalletStack;
  label: string;
  autoConnect?: boolean;
  isReady?: boolean;
  readinessLabel?: string;
  connect: () => Promise<WalletSnapshot>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<Partial<WalletSnapshot>>;
  signMessage: (message: string) => Promise<HexString>;
  signTypedData?: (typedData: string) => Promise<HexString>;
  sign7702Authorization?: (
    authorization: Eip7702AuthorizationRequest
  ) => Promise<SignedEip7702Authorization>;
  fundWallet?: (request: WalletTopUpRequest) => Promise<void>;
  getProvider?: () => Promise<unknown>;
};
