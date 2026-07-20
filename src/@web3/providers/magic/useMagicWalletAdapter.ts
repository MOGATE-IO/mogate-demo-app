import { useCallback, useMemo, useRef, useState, type ComponentType } from 'react';

import { OAuthExtension } from '@magic-ext/react-native-expo-oauth';
import { Magic } from '@magic-sdk/react-native-expo';
import { Signature } from 'ethers';

import type {
  Eip7702AuthorizationRequest,
  HexString,
  WalletAdapter,
  WalletSnapshot
} from '@/@web3/types/wallet';
import { MOBILE_ENV } from '@/config/env';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import { CapabilityBlockedError } from '@/utils/errors';
import { summarizeMagicIdentity } from './magicIdentity';

function magicAddress(info: any): string | null {
  return info?.wallets?.ethereum?.publicAddress ?? info?.publicAddress ?? null;
}

function normalize7702Signature(result: any): HexString {
  if (typeof result?.signature === 'string') return result.signature as HexString;
  return Signature.from({
    r: result.r,
    s: result.s,
    yParity: result.yParity ?? result.y_parity ?? (result.v === 28 ? 1 : 0)
  }).serialized as HexString;
}

function snapshotFromMagicInfo(info: any): WalletSnapshot {
  const address = magicAddress(info);
  return {
    stack: 'magic',
    status: address ? 'connected' : 'unsupported',
    address,
    ownerAddress: address,
    evmUaAddress: null,
    solanaUaAddress: null,
    linkedSolanaAddress: info?.wallets?.solana?.publicAddress ?? null,
    balance: null,
    identity: summarizeMagicIdentity(info),
    capabilities: {
      eip712: address ? 'supported' : 'unknown',
      eip7702Authorization: address ? 'supported' : 'unsupported',
      universalAccount: address ? 'supported' : 'unsupported',
      topUp: 'unsupported'
    },
    lastError: address ? null : 'Magic login completed without an embedded EVM address.'
  };
}

/**
 * Magic remains the embedded EOA signer. Particle UA still supplies routing
 * and execution; this adapter only maps Magic's EIP-1193 and 7702 APIs into
 * our wallet boundary.
 */
export function useMagicWalletAdapter(profile: RuntimeNetworkProfile): {
  adapter: WalletAdapter | null;
  relayer: ComponentType<{ backgroundColor?: string }> | null;
  relayerInteractive: boolean;
} {
  const publishableKey = MOBILE_ENV.magic.publishableKey;
  const redirectURI = MOBILE_ENV.magic.googleRedirectUri;
  const magic = useMemo(() => {
    if (!publishableKey) return null;
    return new Magic(publishableKey, {
      network: {
        rpcUrl: profile.ua.rpcUrl,
        chainId: profile.ua.targetChainId
      },
      extensions: [new OAuthExtension()]
    });
  }, [profile.ua.rpcUrl, profile.ua.targetChainId, publishableKey]);
  const activeRelayerRequests = useRef(0);
  const [relayerInteractive, setRelayerInteractive] = useState(false);

  const withRelayerInteraction = useCallback(async <Result,>(
    operation: () => Promise<Result>
  ): Promise<Result> => {
    activeRelayerRequests.current += 1;
    setRelayerInteractive(true);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      return await operation();
    } finally {
      activeRelayerRequests.current = Math.max(0, activeRelayerRequests.current - 1);
      if (activeRelayerRequests.current === 0) setRelayerInteractive(false);
    }
  }, []);

  const connect = useCallback(async (): Promise<WalletSnapshot> => {
    if (!magic) {
      return {
        stack: 'magic',
        status: 'unsupported',
        capabilities: {
          eip712: 'unknown',
          eip7702Authorization: 'blocked',
          universalAccount: 'blocked',
          topUp: 'unknown'
        },
        lastError: 'EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY is required for Magic login.'
      };
    }
    if (!(await magic.user.isLoggedIn())) {
      if (!redirectURI) {
        throw new CapabilityBlockedError(
          'EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI is required before Google login can start.'
        );
      }
      await withRelayerInteraction(() => magic.oauth.loginWithPopup({
        provider: 'google',
        redirectURI,
        scope: ['openid', 'email', 'profile']
      }));
    }
    return snapshotFromMagicInfo(await magic.user.getInfo());
  }, [magic, redirectURI, withRelayerInteraction]);

  const refresh = useCallback(async () => {
    if (!magic || !(await magic.user.isLoggedIn())) {
      return { status: 'idle', lastError: null } satisfies Partial<WalletSnapshot>;
    }
    return snapshotFromMagicInfo(await magic.user.getInfo());
  }, [magic]);

  const adapter = useMemo<WalletAdapter | null>(() => {
    if (!magic) return null;
    return {
      stack: 'magic',
      label: 'Magic embedded wallet',
      isReady: true,
      readinessLabel: 'Ready',
      connect,
      async disconnect() {
        await magic.user.logout();
      },
      refresh,
      async getProvider() {
        return magic.rpcProvider;
      },
      async signMessage(message: string) {
        const info = await magic.user.getInfo();
        const address = magicAddress(info);
        if (!address) throw new Error('Magic embedded EVM wallet is not ready.');
        return withRelayerInteraction(() => magic.rpcProvider.request({
          method: 'personal_sign',
          params: [message, address]
        }) as Promise<HexString>);
      },
      async signTypedData(typedData: string) {
        const info = await magic.user.getInfo();
        const address = magicAddress(info);
        if (!address) throw new Error('Magic embedded EVM wallet is not ready.');
        return withRelayerInteraction(() => magic.rpcProvider.request({
          method: 'eth_signTypedData_v4',
          params: [address, typedData]
        }) as Promise<HexString>);
      },
      async sign7702Authorization(authorization: Eip7702AuthorizationRequest) {
        try {
          const result = await withRelayerInteraction(() => magic.wallet.sign7702Authorization({
            contractAddress: authorization.address,
            chainId: Number(authorization.chainId),
            nonce: authorization.nonce == null ? undefined : Number(authorization.nonce)
          }));
          return { signature: normalize7702Signature(result) };
        } catch (error) {
          throw new CapabilityBlockedError(
            `Magic did not sign the EIP-7702 authorization: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      }
    };
  }, [connect, magic, refresh, withRelayerInteraction]);

  return { adapter, relayer: magic?.Relayer ?? null, relayerInteractive };
}
