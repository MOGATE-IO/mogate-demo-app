import { useCallback, useMemo } from 'react';

import {
  useEmbeddedEthereumWallet,
  useEmbeddedSolanaWallet,
  useLoginWithOAuth,
  usePrivy,
  useSign7702Authorization
} from '@privy-io/expo';
import { useFundWallet } from '@privy-io/expo/ui';
import { arbitrum, arbitrumSepolia, base, baseSepolia, mainnet, sepolia } from '@privy-io/chains';
import { Signature } from 'ethers';

import type {
  Eip7702AuthorizationRequest,
  HexString,
  WalletAdapter,
  WalletSnapshot
} from '@/@web3/types/wallet';
import { CapabilityBlockedError } from '@/utils/errors';
import { summarizePrivyIdentity } from './privyIdentity';

function findEmbeddedEvmWallet(wallets: any[]) {
  return wallets.find((wallet) => wallet?.address) ?? wallets[0] ?? null;
}

function findEmbeddedEvmAddressFromUser(user: any) {
  const account = user?.linked_accounts?.find(
    (linked: any) =>
      linked?.type === 'wallet' &&
      linked?.chain_type === 'ethereum' &&
      linked?.connector_type === 'embedded' &&
      linked?.address
  );
  return account?.address ?? null;
}

function findEmbeddedSolanaAddressFromUser(user: any) {
  const account = user?.linked_accounts?.find(
    (linked: any) =>
      linked?.type === 'wallet' &&
      linked?.chain_type === 'solana' &&
      linked?.connector_type === 'embedded' &&
      linked?.address
  );
  return account?.address ?? null;
}

function findEmbeddedSolanaWallet(walletState: any) {
  return walletState?.wallets?.find((wallet: any) => wallet?.address) ?? null;
}

function findEmbeddedSolanaAddress(user: any, walletState: any) {
  return findEmbeddedSolanaWallet(walletState)?.address ?? findEmbeddedSolanaAddressFromUser(user) ?? null;
}

function getSolanaProviderAddress(provider: any) {
  if (!provider) return null;
  if (typeof provider.address === 'string') return provider.address;
  if (typeof provider.publicKey === 'string') return provider.publicKey;
  if (typeof provider.publicKey?.toBase58 === 'function') return provider.publicKey.toBase58();
  return null;
}

async function ensureEmbeddedSolanaAddress(user: any, walletState: any) {
  const existing = findEmbeddedSolanaAddress(user, walletState);
  if (existing) return existing;
  if (typeof walletState?.create !== 'function') return null;

  const created = await walletState.create().catch(() => null);
  const createdAddress = getSolanaProviderAddress(created);
  if (createdAddress) return createdAddress;

  const provider = await walletState.getProvider?.().catch(() => null);
  return getSolanaProviderAddress(provider) ?? findEmbeddedSolanaAddress(user, walletState);
}

function getSolanaWalletError(walletState: any) {
  const error = walletState?.error;
  if (!error) return null;
  return typeof error === 'string' ? error : error.message ?? String(error);
}

function normalize7702Signature(result: any): HexString {
  const authorization = result?.data?.authorization ?? result?.authorization ?? result;
  const signature = authorization?.signature ?? authorization;
  if (typeof signature === 'string') return signature as HexString;
  return Signature.from({
    r: authorization.r,
    s: authorization.s,
    yParity: authorization.yParity ?? authorization.y_parity ?? (authorization.v === 28 ? 1 : 0)
  }).serialized as HexString;
}

async function getPrivyProvider(wallets: any[]) {
  const wallet = findEmbeddedEvmWallet(wallets);
  const provider = wallet ? await wallet.getProvider?.() : null;
  if (!provider) throw new Error('Privy embedded Ethereum wallet is not ready.');
  return { provider, wallet };
}

async function requestPrivyAddress(provider: any, wallet: any) {
  const accounts =
    (await provider?.request?.({
      method: 'eth_requestAccounts'
    })) ?? [];
  return wallet?.address ?? accounts[0] ?? null;
}

function getFundingChain(chainId?: number) {
  if (chainId === arbitrum.id) return arbitrum;
  if (chainId === arbitrumSepolia.id) return arbitrumSepolia;
  if (chainId === base.id) return base;
  if (chainId === baseSepolia.id) return baseSepolia;
  if (chainId === sepolia.id) return sepolia;
  if (chainId === mainnet.id) return mainnet;
  return undefined;
}

export function usePrivyWalletAdapter(): WalletAdapter {
  const privy = usePrivy();
  const oauth = useLoginWithOAuth();
  const { wallets, create } = useEmbeddedEthereumWallet();
  const solanaWallet = useEmbeddedSolanaWallet();
  const { signAuthorization } = useSign7702Authorization();
  const { fundWallet } = useFundWallet();

  const connect = useCallback(async (): Promise<WalletSnapshot> => {
    if (!privy.isReady) {
      return {
        stack: 'privy',
        status: 'idle',
        address: null,
        ownerAddress: null,
        evmUaAddress: null,
        solanaUaAddress: null,
        linkedSolanaAddress: findEmbeddedSolanaAddress(privy.user, solanaWallet),
        balance: null,
        identity: summarizePrivyIdentity({
          user: privy.user,
          evmWallets: wallets,
          solanaWallets: solanaWallet?.wallets,
          solanaWalletStatus: solanaWallet?.status,
          solanaWalletError: getSolanaWalletError(solanaWallet)
        }),
        capabilities: {
          eip712: 'unknown',
          eip7702Authorization: 'unknown',
          universalAccount: 'unknown',
          topUp: 'unknown'
        },
        lastError: null
      };
    }

    let activeUser = privy.user;
    if (!activeUser) {
      activeUser = (await oauth.login({ provider: 'google' })) ?? null;
    }

    let wallet = findEmbeddedEvmWallet(wallets);
    if (!wallet) {
      const created = await create();
      activeUser = created.user ?? activeUser;
      wallet = findEmbeddedEvmWallet(wallets);
      if (!wallet && !findEmbeddedEvmAddressFromUser(activeUser)) {
        return {
          stack: 'privy',
          status: 'unsupported',
          address: null,
          ownerAddress: null,
          evmUaAddress: null,
          solanaUaAddress: null,
          linkedSolanaAddress: findEmbeddedSolanaAddress(activeUser, solanaWallet),
          balance: null,
          identity: summarizePrivyIdentity({
            user: activeUser,
            evmWallets: wallets,
            solanaWallets: solanaWallet?.wallets,
            solanaWalletStatus: solanaWallet?.status,
            solanaWalletError: getSolanaWalletError(solanaWallet)
          }),
          capabilities: {
            eip712: 'unknown',
            eip7702Authorization: 'unsupported',
            universalAccount: 'unsupported',
            topUp: 'unknown'
          },
          lastError:
            'Privy embedded Ethereum wallet creation was requested. Wait for Privy state to refresh, then connect again.'
        };
      }
    }

    const provider = wallet ? await wallet.getProvider?.() : null;
    const address =
      provider ? await requestPrivyAddress(provider, wallet) : wallet?.address ?? findEmbeddedEvmAddressFromUser(activeUser);
    const linkedSolanaAddress = await ensureEmbeddedSolanaAddress(activeUser ?? privy.user, solanaWallet);

    return {
      stack: 'privy',
      status: address ? 'connected' : 'unsupported',
      address,
      ownerAddress: address,
      evmUaAddress: null,
      solanaUaAddress: null,
      linkedSolanaAddress,
      balance: null,
      identity: summarizePrivyIdentity({
        user: activeUser ?? privy.user,
        evmWallets: wallets,
        solanaWallets: solanaWallet?.wallets,
        solanaWalletStatus: solanaWallet?.status,
        solanaWalletError: getSolanaWalletError(solanaWallet)
      }),
      capabilities: {
        eip712: provider ? 'supported' : 'unknown',
        eip7702Authorization: provider ? 'supported' : 'unknown',
        universalAccount: provider ? 'supported' : 'unknown',
        topUp: address ? 'supported' : 'unknown'
      },
      lastError: address
        ? provider
          ? null
          : 'Privy login found the embedded EOA. Wallet provider is still refreshing; top-up is available, signing may need Refresh.'
        : 'Privy RN login succeeded, but no embedded Ethereum wallet was found.'
    };
  }, [create, oauth, privy.isReady, privy.user, signAuthorization, solanaWallet, wallets]);

  const refresh = useCallback(async () => {
    if (!privy.isReady) {
      return {
        status: 'idle',
        lastError: null
      } satisfies Partial<WalletSnapshot>;
    }

    const wallet = findEmbeddedEvmWallet(wallets);
    const linkedSolanaAddress = findEmbeddedSolanaAddress(privy.user, solanaWallet);
    return {
      status: wallet?.address ? 'connected' : 'idle',
      address: wallet?.address ?? null,
      ownerAddress: wallet?.address ?? null,
      linkedSolanaAddress,
      identity: summarizePrivyIdentity({
        user: privy.user,
        evmWallets: wallets,
        solanaWallets: solanaWallet?.wallets,
        solanaWalletStatus: solanaWallet?.status,
        solanaWalletError: getSolanaWalletError(solanaWallet)
      }),
      capabilities: {
        eip712: wallet ? 'supported' : 'unknown',
        eip7702Authorization: wallet ? 'supported' : 'unsupported',
        universalAccount: wallet ? 'supported' : 'unsupported',
        topUp: wallet ? 'supported' : 'unknown'
      }
    } satisfies Partial<WalletSnapshot>;
  }, [privy.isReady, privy.user, signAuthorization, solanaWallet, wallets]);

  return useMemo(
    () => ({
      stack: 'privy',
      label: 'Privy RN embedded wallet',
      isReady: privy.isReady,
      readinessLabel: privy.isReady ? 'Ready' : 'Preparing Privy',
      connect,
      async disconnect() {
        await privy.logout?.();
      },
      refresh,
      async getProvider() {
        const wallet = findEmbeddedEvmWallet(wallets);
        return wallet?.getProvider?.();
      },
      async signMessage(message: string) {
        const { provider, wallet } = await getPrivyProvider(wallets);
        const address = await requestPrivyAddress(provider, wallet);
        if (!address) throw new Error('Privy embedded Ethereum wallet is not ready.');
        return provider.request({
          method: 'personal_sign',
          params: [message, address]
        }) as Promise<HexString>;
      },
      async signTypedData(typedData: string) {
        const { provider, wallet } = await getPrivyProvider(wallets);
        const address = await requestPrivyAddress(provider, wallet);
        if (!address) throw new Error('Privy embedded Ethereum wallet is not ready.');
        return provider.request({
          method: 'eth_signTypedData_v4',
          params: [address, typedData]
        }) as Promise<HexString>;
      },
      async sign7702Authorization(authorization: Eip7702AuthorizationRequest) {
        try {
          const wallet = findEmbeddedEvmWallet(wallets);
          const result = await signAuthorization({
            contractAddress: authorization.address,
            chainId: Number(authorization.chainId),
            nonce: authorization.nonce == null ? undefined : Number(authorization.nonce)
          }, {
            address: wallet?.address
          });
          return { signature: normalize7702Signature(result) };
        } catch (error) {
          throw new CapabilityBlockedError(
            `Privy embedded wallet did not sign the EIP-7702 authorization: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      },
      async fundWallet(request) {
        await fundWallet({
          address: request.address,
          amount: request.amount,
          asset: request.asset ?? 'USDC',
          chain: getFundingChain(request.chainId),
          defaultPaymentMethod: 'card',
          card: {
            preferredProvider: 'moonpay'
          },
          moonpay: {
            useSandbox: Boolean(request.sandbox),
            uiConfig: {
              accentColor: '#171512',
              theme: 'light'
            }
          }
        });
      }
    }),
    [connect, fundWallet, privy, refresh, signAuthorization, wallets]
  );
}
