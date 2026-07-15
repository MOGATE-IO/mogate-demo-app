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
  probeUniversalAccount,
  type UaProbeResult
} from '@/@web3/services/particleUniversalAccount';
import {
  pay,
  type GiftcardPaymentResult
} from '@/features/checkout/services/giftcardPayment';

type MintStage =
  | 'idle'
  | 'loading-checkout'
  | 'checkout-ready'
  | 'probing-ua'
  | 'ua-ready'
  | 'building'
  | 'sent'
  | 'error';

export type CheckoutExecutionStep =
  | 'idle'
  | 'preparing'
  | 'confirming-payment'
  | 'minting'
  | 'reconciling'
  | 'complete'
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
  receiverAddress?: string | null;
  paymentMode?: 'direct' | 'ua7702';
}) {
  const profile = input.profile ?? getDefaultNetworkProfile();
  const paymentMode = input.paymentMode ?? 'direct';
  const receiver = input.receiverAddress?.trim() || input.wallet.ownerAddress || input.wallet.address || '';
  const [stage, setStage] = useState<MintStage>('idle');
  const [executionStep, setExecutionStep] = useState<CheckoutExecutionStep>('idle');
  const [checkoutJson, setCheckoutJson] = useState(() => getDirectCheckoutTemplate(receiver, profile));
  const [preparedCheckout, setPreparedCheckout] = useState<PreparedUnsafeCheckout | null>(null);
  const [uaProbe, setUaProbe] = useState<UaProbeResult | null>(null);
  const [mintResult, setMintResult] = useState<GiftcardPaymentResult | null>(null);
  const [reconciliation, setReconciliation] = useState<CheckoutReconciliationStatus>({
    status: 'idle',
    detail: 'Mint has not been reconciled yet.'
  });
  const [lastError, setLastError] = useState<string | null>(null);

  const resetError = useCallback(() => setLastError(null), []);

  useEffect(() => {
    setCheckoutJson(getDirectCheckoutTemplate(receiver, profile));
    setPreparedCheckout(null);
    setMintResult(null);
    setReconciliation({
      status: 'idle',
      detail: 'Mint has not been reconciled yet.'
    });
    setStage('idle');
    setExecutionStep('idle');
  }, [
    input.intent?.amountDisplay,
    input.intent?.autoMint,
    input.intent?.autoUnwrap,
    input.intent?.couponCode,
    input.intent?.giftcardMode,
    input.intent?.mintMode,
    input.intent?.network,
    input.intent?.region,
    input.intent?.reserveGas,
    paymentMode,
    profile,
    receiver
  ]);

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
    setExecutionStep('preparing');
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
      setExecutionStep('idle');
    } catch (error) {
      setLastError(toErrorMessage(error));
      setStage('error');
      setExecutionStep('error');
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
    setExecutionStep('confirming-payment');
    try {
      const ownerAddress = input.wallet.ownerAddress || input.wallet.address;
      if (!ownerAddress) throw new Error('Connect a wallet before paying.');
      if (!input.adapter) throw new Error('Wallet adapter is not mounted.');
      if (paymentMode === 'ua7702' && !isProductEip7702Signer(input.wallet.stack)) {
        const provider = getSignerProviderInfo(input.wallet.stack);
        throw new Error(
          `${provider.label} readiness is ${provider.readiness}, so UA EIP-7702 mint is disabled for product sends. ${provider.setupNote}`
        );
      }
      if (paymentMode === 'ua7702' && !input.adapter.sign7702Authorization) {
        throw new Error(
          'UA EIP-7702 mint requires an embedded signer that can sign EIP-7702 authorizations. Use Privy, Magic, or Dynamic after its 7702 adapter is enabled.'
        );
      }
      if (
        paymentMode === 'ua7702' &&
        !isPublicParticleUaChain(profile.ua.targetChainId)
      ) {
        throw new Error(
          `Particle UA SDK 2.x does not support chain ${profile.ua.targetChainId}. Keep this testnet checkout in direct mode and enable UA7702 on a supported mainnet.`
        );
      }
      const checkout = preparedCheckout ?? parsePreparedCheckoutJson(checkoutJson, receiver, profile);
      if (paymentMode === 'ua7702') {
        assertCheckoutReceiverIsOwner(checkout, ownerAddress);
      }
      const result = await pay({
        amount: checkout.amountAtomic,
        tokenAddress: checkout.paymentToken,
        ua7702: paymentMode === 'ua7702',
        ownerAddress,
        wallet: input.adapter,
        checkout,
        profile,
        onProgress: setExecutionStep
      });
      setExecutionStep('reconciling');
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
      setExecutionStep('complete');
    } catch (error) {
      setLastError(toErrorMessage(error));
      setStage('error');
      setExecutionStep('error');
    }
  }, [
    checkoutJson,
    input.adapter,
    input.wallet.address,
    input.wallet.ownerAddress,
    input.wallet.stack,
    preparedCheckout,
    paymentMode,
    profile,
    receiver,
    resetError
  ]);

  const dismissExecutionError = useCallback(() => {
    setLastError(null);
    setExecutionStep('idle');
    setStage(preparedCheckout ? 'checkout-ready' : 'idle');
  }, [preparedCheckout]);

  const gates = useMemo<MintGate[]>(() => {
    const connected = input.wallet.status === 'connected';
    const provider = getSignerProviderInfo(input.wallet.stack);
    const productSigner = isProductEip7702Signer(input.wallet.stack);
    const signerCapable = Boolean(input.adapter?.sign7702Authorization);
    const uaCapable = connected && productSigner && signerCapable;
    const directCapable = connected && Boolean(input.adapter?.getProvider);
    const hasCheckout = Boolean(preparedCheckout);
    const checkoutReceiverMatch = preparedCheckout ? isSameEvmAddress(preparedCheckout.to, receiver) : false;
    const publicUaChain = isPublicParticleUaChain(profile.ua.targetChainId);

    return [
      {
        id: 'wallet',
        label: paymentMode === 'direct' ? 'Gate 1: Direct wallet' : 'Gate 1: EIP-7702 signer',
        status: paymentMode === 'direct'
          ? directCapable ? 'ready' : connected ? 'blocked' : 'idle'
          : connected && uaCapable && uaProbe ? 'done' : connected && uaCapable ? 'ready' : connected ? 'blocked' : 'idle',
        detail: connected
          ? paymentMode === 'direct'
            ? directCapable
              ? `${provider.label} can send the target-chain checkout directly.`
              : `${provider.label} does not expose an EVM provider for direct payment.`
            : uaCapable
              ? `${provider.label} is ready. Probe Particle UA in-place routing next.`
              : `${provider.label} readiness is ${provider.readiness}. ${provider.setupNote}`
          : 'Connect an embedded EOA signer first.'
      },
      {
        id: 'in-place',
        label: paymentMode === 'direct' ? 'Gate 2: Receiver' : 'Gate 2: In-place owner',
        status: preparedCheckout && !checkoutReceiverMatch ? 'blocked' : receiver && connected ? 'ready' : 'idle',
        detail: preparedCheckout && !checkoutReceiverMatch
          ? `Prepared checkout receiver ${preparedCheckout.to.slice(0, 6)}...${preparedCheckout.to.slice(-4)} does not match ${receiver.slice(0, 6)}...${receiver.slice(-4)}.`
          : receiver
            ? paymentMode === 'direct'
              ? `The giftcard will mint to ${receiver.slice(0, 6)}...${receiver.slice(-4)}.`
              : `NFT receiver and payment executor stay on the owner EOA ${receiver.slice(0, 6)}...${receiver.slice(-4)}.`
            : 'Receiver is not available yet.'
      },
      {
        id: 'mint',
        label: `Gate 3: ${profile.ua.chainLabel} ${preparedCheckout?.gatewayVersion ?? profile.gateway.version} mint`,
        status: mintResult
          ? 'done'
          : hasCheckout && connected && (paymentMode === 'direct' ? directCapable : uaCapable) && checkoutReceiverMatch
            ? 'ready'
            : hasCheckout && !checkoutReceiverMatch ? 'blocked' : 'idle',
        detail: mintResult
          ? `${paymentMode === 'direct' ? 'Direct' : 'UA'} transaction sent${mintResult.tokenId ? `, token ${mintResult.tokenId}` : ''}.`
          : hasCheckout
            ? checkoutReceiverMatch
              ? paymentMode === 'direct'
                ? 'Prepared checkout loaded. Payment uses target-chain USDC only.'
                : 'Prepared checkout loaded. Particle UA will route supported primary assets and execute from the delegated EOA.'
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
        status: paymentMode === 'direct' || publicUaChain ? 'ready' : 'blocked',
        detail: paymentMode === 'direct'
          ? 'UA routing is not used in the current direct-payment phase.'
          : publicUaChain
            ? `Target chain ${profile.ua.targetChainId} is supported by Particle UA SDK 2.x.`
            : `Particle UA SDK 2.x supports listed mainnets only. Keep chain ${profile.ua.targetChainId} in direct mode.`
      }
    ];
  }, [input.adapter, input.wallet.stack, input.wallet.status, mintResult, paymentMode, preparedCheckout, profile, receiver, uaProbe]);

  return {
    stage,
    executionStep,
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
    executeMint,
    dismissExecutionError
  };
}

export type UniversalAccountMintState = ReturnType<typeof useUniversalAccountMint>;
