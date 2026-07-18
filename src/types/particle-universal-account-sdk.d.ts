declare module '@particle-network/universal-account-sdk' {
  export enum SUPPORTED_TOKEN_TYPE {
    ETH = 'eth',
    USDT = 'usdt',
    USDC = 'usdc',
    BNB = 'bnb',
    SOL = 'sol'
  }

  export enum PREFER_TOKEN_TYPE {
    USD = 0,
    NATIVE = 1
  }

  export const UNIVERSAL_ACCOUNT_VERSION: string;

  export type IExpectToken = {
    type: SUPPORTED_TOKEN_TYPE;
    amount: string;
  };

  export type IUniversalAccountConfig = {
    projectId: string;
    projectClientKey: string;
    projectAppUuid: string;
    smartAccountOptions?: {
      name: string;
      version: string;
      ownerAddress: string;
      useEIP7702?: boolean;
    };
    tradeConfig?: {
      slippageBps?: number;
      usePrimaryTokens?: SUPPORTED_TOKEN_TYPE[];
      preferTokenType?: PREFER_TOKEN_TYPE;
    };
    rpcUrl?: string;
  };

  export type ITransaction = {
    rootHash: string;
    transactionId: string;
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

  export type EIP7702Authorization = {
    userOpHash: string;
    signature: string;
  };

  export class UniversalAccount {
    constructor(config: IUniversalAccountConfig);
    getSmartAccountOptions(): Promise<Record<string, unknown>>;
    getPrimaryAssets(): Promise<any>;
    getEIP7702Deployments(): Promise<Record<string, unknown>[]>;
    createUniversalTransaction(payload: {
      chainId: number;
      expectTokens: IExpectToken[];
      transactions: Array<{
        to: string;
        data: string;
        value?: string;
      }>;
    }): Promise<ITransaction>;
    sendTransaction(
      transaction: ITransaction,
      signature: string,
      authorizations?: EIP7702Authorization[]
    ): Promise<Record<string, any>>;
    getTransaction(transactionId: string): Promise<Record<string, any>>;
  }
}
