import { useCallback, useEffect, useMemo, useState } from 'react';

import { isPublicParticleUaChain } from '@/config/contracts';
import { getDefaultNetworkProfile, type RuntimeNetworkProfile } from '@/config/networkProfiles';
import { getSignerProviderInfo, isProductEip7702Signer } from '@/@web3/config/signerProviders';
import type { WalletAdapter, WalletSnapshot } from '@/@web3/types/wallet';
import { toErrorMessage } from '@/utils/errors';
import { prettyJson } from '@/utils/format';

import {
  fetchPreparedCheckout,
  getDirectCheckoutTemplate,
  type GiftcardCheckoutIntent,
  assertCheckoutReceiverIsOwner,
  describeMintPlan,
  isSameEvmAddress,
  parsePreparedCheckoutJson,
  type PreparedUnsafeCheckout
} from '@/features/checkout/services/giftcardCheckout';
import {
  reconcileUaMint,
  type CheckoutReconciliationStatus
} from '@/features/checkout/services/checkoutReconciliation';
import {
  executeUaUnsafeCheckout,
  probeUniversalAccount,
  type UaMintResult,
  type UaProbeResult
} from '@/@web3/services/particleUniversalAccount';

type MintStage =
  | 'idle'
  | 'loading-checkout'
  | 'checkout-ready'
  | 'probing-ua'
  | 'ua-ready'
  | 'building'
  | 'sent'
  | 'error';

export type MintGate = {
  id: string;
  label: string;
  status: 'idle' | 'ready' | 'blocked' | 'done';
  detail: string;
};

export function useUniversalAccountMint(input: {
  wallet: WalletSnapshot;
  adapter?: WalletAdapter | null;
  profile?: RuntimeNetworkProfile;
  intent?: GiftcardCheckoutIntent | null;
}) {
  const profile = input.profile ?? getDefaultNetworkProfile();
  const receiver = input.wallet.ownerAddress || input.wallet.address || '';
  const [stage, setStage] = useState<MintStage>('idle');
  const [checkoutJson, setCheckoutJson] = useState(() => getDirectCheckoutTemplate(receiver, profile));
  const [preparedCheckout, setPreparedCheckout] = useState<PreparedUnsafeCheckout | null>(null);
  const [uaProbe, setUaProbe] = useState<UaProbeResult | null>(null);
  const [mintResult, setMintResult] = useState<UaMintResult | null>(null);
  const [reconciliation, setReconciliation] = useState<CheckoutReconciliationStatus>({
    status: 'idle',
    detail: 'Mint has not been reconciled yet.'
  });
  const [lastError, setLastError] = useState<string | null>(null);

  const resetError = useCallback(() => setLastError(null), []);

  useEffect(() => {
    if (stage !== 'idle' && stage !== 'error') return;
    setCheckoutJson(getDirectCheckoutTemplate(receiver, profile));
    setPreparedCheckout(null);
    setMintResult(null);
  }, [profile, receiver, stage]);

  const parseCheckout = useCallback(() => {
    resetError();
    try {
      const parsed = parsePreparedCheckoutJson(checkoutJson, receiver, profile);
      setPreparedCheckout(parsed);
      setStage('checkout-ready');
    } catch (error) {
      setLastError(toErrorMessage(error));
      setStage('error');
    }
  }, [checkoutJson, profile, receiver, resetError]);

  const loadCheckoutFromBackend = useCallback(async () => {
    resetError();
    setStage('loading-checkout');
    try {
      if (!receiver) throw new Error('Connect a wallet before preparing checkout.');
      const checkout = await fetchPreparedCheckout(receiver, profile, input.intent);
      setPreparedCheckout(checkout);
      setCheckoutJson(
        prettyJson({
          checkout
        })
      );
      setStage('checkout-ready');
    } catch (error) {
      setLastError(toErrorMessage(error));
      setStage('error');
    }
  }, [input.intent, profile, receiver, resetError]);

  const probeUa = useCallback(async () => {
    resetError();
    setStage('probing-ua');
    try {
      const ownerAddress = input.wallet.ownerAddress || input.wallet.address;
      if (!ownerAddress) throw new Error('Connect a wallet before probing Universal Accounts.');
      const probe = await probeUniversalAccount(ownerAddress, profile);
      setUaProbe(probe);
      setStage('ua-ready');
    } catch (error) {
      setLastError(toErrorMessage(error));
      setStage('error');
    }
  }, [input.wallet.address, input.wallet.ownerAddress, profile, resetError]);

  const executeMint = useCallback(async () => {
    resetError();
    setStage('building');
    try {
      const ownerAddress = input.wallet.ownerAddress || input.wallet.address;
      if (!ownerAddress) throw new Error('Connect a wallet before sending UA transaction.');
      if (!input.adapter) throw new Error('Wallet adapter is not mounted.');
      if (!isProductEip7702Signer(input.wallet.stack)) {
        const provider = getSignerProviderInfo(input.wallet.stack);
        throw new Error(
          `${provider.label} readiness is ${provider.readiness}, so UA EIP-7702 mint is disabled for product sends. ${provider.setupNote}`
        );
      }
      if (!input.adapter.sign7702Authorization) {
        throw new Error(
          'UA EIP-7702 mint requires an embedded signer that can sign EIP-7702 authorizations. Use Privy, Magic, or Dynamic after its 7702 adapter is enabled.'
        );
      }
      if (!isPublicParticleUaChain(profile.ua.targetChainId) && !profile.ua.allowUnlistedTestnet) {
        throw new Error(
          `Particle public UA docs do not list chain ${profile.ua.targetChainId}. Enable the code-level testnet override only after dashboard/SDK confirms support.`
        );
      }
      const checkout = preparedCheckout ?? parsePreparedCheckoutJson(checkoutJson, receiver, profile);
      assertCheckoutReceiverIsOwner(checkout, ownerAddress);
      const result = await executeUaUnsafeCheckout({
        ownerAddress,
        wallet: input.adapter,
        checkout,
        profile
      });
      const reconciliationResult = await reconcileUaMint({
        ownerAddress,
        checkout,
        mintResult: result,
        profile
      });
      setPreparedCheckout(checkout);
      setMintResult(result);
      setReconciliation(reconciliationResult);
      setStage('sent');
    } catch (error) {
      setLastError(toErrorMessage(error));
      setStage('error');
    }
  }, [
    checkoutJson,
    input.adapter,
    input.wallet.address,
    input.wallet.ownerAddress,
    input.wallet.stack,
    preparedCheckout,
    profile,
    receiver,
    resetError
  ]);

  const gates = useMemo<MintGate[]>(() => {
    const connected = input.wallet.status === 'connected';
    const provider = getSignerProviderInfo(input.wallet.stack);
    const productSigner = isProductEip7702Signer(input.wallet.stack);
    const signerCapable = Boolean(input.adapter?.sign7702Authorization);
    const uaCapable = connected && productSigner && signerCapable;
    const hasCheckout = Boolean(preparedCheckout);
    const checkoutOwnerMatch = preparedCheckout ? isSameEvmAddress(preparedCheckout.to, receiver) : false;
    const publicUaChain = isPublicParticleUaChain(profile.ua.targetChainId);
    const testnetAllowed = profile.ua.allowUnlistedTestnet;

    return [
      {
        id: 'wallet',
        label: 'Gate 1: EIP-7702 signer',
        status: connected && uaCapable && uaProbe ? 'done' : connected && uaCapable ? 'ready' : connected ? 'blocked' : 'idle',
        detail: connected
          ? uaCapable
            ? `${provider.label} is ready. Probe Particle UA in-place routing next.`
            : `${provider.label} readiness is ${provider.readiness}. ${provider.setupNote}`
          : 'Connect an embedded EOA signer first.'
      },
      {
        id: 'in-place',
        label: 'Gate 2: In-place owner',
        status: preparedCheckout && !checkoutOwnerMatch ? 'blocked' : receiver && connected ? 'ready' : 'idle',
        detail: preparedCheckout && !checkoutOwnerMatch
          ? `Prepared checkout receiver ${preparedCheckout.to.slice(0, 6)}...${preparedCheckout.to.slice(-4)} does not match owner EOA ${receiver.slice(0, 6)}...${receiver.slice(-4)}.`
          : receiver
          ? `NFT receiver and payment executor stay on the owner EOA ${receiver.slice(0, 6)}...${receiver.slice(-4)}.`
          : 'Owner EOA is not available yet.'
      },
      {
        id: 'mint',
        label: `Gate 3: ${profile.ua.chainLabel} ${profile.gateway.version} mint`,
        status: mintResult ? 'done' : hasCheckout && connected && uaCapable && checkoutOwnerMatch ? 'ready' : hasCheckout && !checkoutOwnerMatch ? 'blocked' : 'idle',
        detail: mintResult
          ? `UA transaction sent${mintResult.tokenId ? `, token ${mintResult.tokenId}` : ''}.`
          : hasCheckout
            ? checkoutOwnerMatch
              ? 'Prepared checkout loaded. Particle UA will route supported primary assets and execute from the delegated EOA.'
              : 'Prepared checkout is loaded for a different receiver. Regenerate checkout for the connected owner EOA.'
            : 'Load backend checkout or paste prepared JSON.'
      },
      {
        id: 'topup',
        label: 'Gate 4: Optional top-up',
        status: receiver ? 'ready' : 'idle',
        detail: receiver
          ? 'In-place mode does not require moving existing assets. Top-up is only for adding fresh primary assets to the owner EOA.'
          : 'Connect wallet before top-up.'
      },
      {
        id: 'testnet',
        label: 'UA chain support',
        status: publicUaChain || testnetAllowed ? 'ready' : 'blocked',
        detail: publicUaChain
          ? `Target chain ${profile.ua.targetChainId} is in Particle public UA docs.`
          : testnetAllowed
            ? `Target chain ${profile.ua.targetChainId} is unlisted publicly, but the local testnet override is enabled.`
            : `Particle public UA docs list mainnet chains only. Chain ${profile.ua.targetChainId} needs dashboard/SDK confirmation before sending.`
      }
    ];
  }, [input.adapter, input.wallet.stack, input.wallet.status, mintResult, preparedCheckout, profile, receiver, uaProbe]);

  return {
    stage,
    checkoutJson,
    setCheckoutJson,
    preparedCheckout,
    mintPlan: preparedCheckout ? describeMintPlan(preparedCheckout) : null,
    uaProbe,
    mintResult,
    reconciliation,
    lastError,
    gates,
    parseCheckout,
    loadCheckoutFromBackend,
    probeUa,
    executeMint
  };
}

export type UniversalAccountMintState = ReturnType<typeof useUniversalAccountMint>;
