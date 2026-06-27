declare module '@particle-network/universal-account-sdk' {
  export enum SUPPORTED_TOKEN_TYPE {
    ETH = 'eth',
    USDT = 'usdt',
    USDC = 'usdc',
    BTC = 'btc',
    BNB = 'bnb',
    SOL = 'sol'
  }

  export enum SOLANA_ACCOUNT_INDEX {
    CLASSIC = 1,
    EIP7702 = 11
  }

  export const UNIVERSAL_ACCOUNT_VERSION: string;

  export type EvmUniversalTransaction = {
    to: string;
    data: string;
    value?: string;
  };

  export type SolanaUniversalTransaction = {
    accounts: Array<{
      pubkey: string;
      isSigner: boolean;
      isWritable: boolean;
    }>;
    programId: string;
    data: string;
  };

  export type UniversalTransactionCall = EvmUniversalTransaction | SolanaUniversalTransaction;

  export type UniversalAccountConfig = {
    projectId: string;
    projectClientKey: string;
    projectAppUuid: string;
    ownerAddress?: string;
    smartAccountOptions?: {
      name: string;
      version: string;
      ownerAddress: string;
      smartAccountAddress?: string;
      solanaSmartAccountAddress?: string;
      useEIP7702?: boolean;
      solanaAccountIndex?: SOLANA_ACCOUNT_INDEX;
      options?: unknown;
    };
    tradeConfig?: {
      slippageBps?: number;
      universalGas?: boolean;
      usePrimaryTokens?: SUPPORTED_TOKEN_TYPE[];
      [key: string]: unknown;
    };
    rpcUrl?: string;
  };

  export type ExpectToken = {
    type: SUPPORTED_TOKEN_TYPE;
    amount: string;
  };

  export type UniversalTransactionPayload = {
    chainId: number;
    expectTokens: ExpectToken[];
    transactions: UniversalTransactionCall[];
  };

  export type Eip7702Authorization = {
    userOpHash: string;
    signature: string;
  };

  export type UniversalAccountTransaction = {
    rootHash: string;
    transactionId?: string;
    userOps: Array<{
      chainId: number;
      userOpHash: string;
      eip7702Delegated?: boolean;
      eip7702Auth?: {
        chainId: number;
        nonce: number;
        address: string;
      };
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };

  export class UniversalAccount {
    constructor(args: UniversalAccountConfig);
    getSmartAccountOptions(): Promise<Record<string, unknown>>;
    getPrimaryAssets(): Promise<Record<string, unknown>>;
    getEIP7702Deployments(): Promise<Record<string, unknown>[]>;
    getEIP7702Auth(chainIds: number[]): Promise<Record<string, unknown>>;
    createUniversalTransaction(args: UniversalTransactionPayload): Promise<UniversalAccountTransaction>;
    sendTransaction(
      transaction: UniversalAccountTransaction,
      signature: string,
      authorizations?: Eip7702Authorization[]
    ): Promise<Record<string, unknown>>;
  }
}
