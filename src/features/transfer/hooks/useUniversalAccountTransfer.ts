import type { ITransaction } from '@particle-network/universal-account-sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { isProductEip7702Signer } from '@/@web3/config/signerProviders';
import {
  createUaTransferQuote,
  submitUaTransaction,
  type UaFeeSummary,
  type UaTransactionResult
} from '@/@web3/services/particleUniversalAccount';
import type {
  UnifiedAssetBreakdown,
  WalletAdapter,
  WalletSnapshot
} from '@/@web3/types/wallet';
import { isPublicParticleUaChain } from '@/config/contracts';
import {
  hasParticleProjectConfig,
  type RuntimeNetworkProfile
} from '@/config/networkProfiles';
import type {
  NativeBalanceRow,
  StablecoinPortfolio
} from '@/features/checkout/services/paymentBalances';
import {
  buildTransferAssets,
  formatTransferAssetAmount,
  getTransferNetworks,
  isSmallTransferAsset,
  validateTransferAmount,
  validateTransferRecipient,
  type TransferAsset
} from '@/features/transfer/services/transferAssets';
import { toErrorMessage } from '@/utils/errors';

export type TransferRecipientType = 'wallet' | 'email' | 'x';
export type TransferStage =
  | 'edit'
  | 'quoting'
  | 'review'
  | 'authorizing'
  | 'submitting'
  | 'confirming'
  | 'success'
  | 'error';

type TransferQuote = {
  transaction: ITransaction;
  fees: UaFeeSummary;
  asset: TransferAsset;
  amount: string;
  recipient: string;
};

function maxAmount(asset: TransferAsset) {
  return asset.amount
    .toFixed(Math.min(asset.decimals, 12))
    .replace(/(?:\.0+|(?:(\.\d*?)0+))$/, '$1');
}

export function useUniversalAccountTransfer(input: {
  wallet: WalletSnapshot;
  adapter?: WalletAdapter | null;
  profile: RuntimeNetworkProfile;
  portfolio: StablecoinPortfolio;
  nativeRows: NativeBalanceRow[];
  particleAssets: UnifiedAssetBreakdown[];
  onRefreshBalances: () => void | Promise<void>;
  onRefreshWallet: () => void | Promise<void>;
}) {
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<TransferStage>('edit');
  const [hideSmallBalances, setHideSmallBalances] = useState(true);
  const [recipientType, setRecipientType] = useState<TransferRecipientType>('wallet');
  const [recipient, setRecipientValue] = useState('');
  const [amount, setAmountValue] = useState('');
  const [selectedChainId, setSelectedChainIdValue] = useState<number | null>(null);
  const [selectedAssetId, setSelectedAssetIdValue] = useState<string | null>(null);
  const [quote, setQuote] = useState<TransferQuote | null>(null);
  const [result, setResult] = useState<UaTransactionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ownerAddress = input.wallet.ownerAddress || input.wallet.address || '';
  const assets = useMemo(
    () => buildTransferAssets({
      profile: input.profile,
      portfolio: input.portfolio,
      nativeRows: input.nativeRows,
      particleAssets: input.particleAssets
    }),
    [input.nativeRows, input.particleAssets, input.portfolio, input.profile]
  );
  const networks = useMemo(
    () => getTransferNetworks(input.profile, assets),
    [assets, input.profile]
  );
  const visibleAssets = useMemo(
    () => assets.filter((asset) =>
      asset.chainId === selectedChainId &&
      (!hideSmallBalances || !isSmallTransferAsset(asset))
    ),
    [assets, hideSmallBalances, selectedChainId]
  );
  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId) ?? null;
  const amountError = selectedAsset && amount
    ? validateTransferAmount(selectedAsset, amount)
    : null;
  const recipientError = selectedAsset && recipient
    ? validateTransferRecipient(selectedAsset, recipient)
    : null;
  const sending = stage === 'authorizing' || stage === 'submitting' || stage === 'confirming';

  useEffect(() => {
    if (selectedChainId != null && networks.some((network) => network.chainId === selectedChainId)) return;
    setSelectedChainIdValue(networks[0]?.chainId ?? null);
  }, [networks, selectedChainId]);

  useEffect(() => {
    if (
      selectedAsset?.chainId === selectedChainId &&
      visibleAssets.some((asset) => asset.id === selectedAsset.id)
    ) return;
    const first = visibleAssets[0] ?? null;
    setSelectedAssetIdValue(first?.id ?? null);
  }, [selectedAsset, selectedChainId, visibleAssets]);

  const invalidateQuote = useCallback(() => {
    setQuote(null);
    setResult(null);
    setError(null);
    setStage('edit');
  }, []);

  const open = useCallback(() => {
    setVisible(true);
    setStage('edit');
    setError(null);
    setResult(null);
  }, []);

  const close = useCallback(() => {
    if (sending) return;
    setVisible(false);
    setStage('edit');
    setError(null);
    setQuote(null);
    setResult(null);
  }, [sending]);

  const setSelectedChainId = useCallback((chainId: number) => {
    setSelectedChainIdValue(chainId);
    setSelectedAssetIdValue(null);
    setAmountValue('');
    invalidateQuote();
  }, [invalidateQuote]);

  const setSelectedAssetId = useCallback((assetId: string) => {
    setSelectedAssetIdValue(assetId);
    setAmountValue('');
    invalidateQuote();
  }, [invalidateQuote]);

  const setAmount = useCallback((value: string) => {
    setAmountValue(value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'));
    invalidateQuote();
  }, [invalidateQuote]);

  const setRecipient = useCallback((value: string) => {
    setRecipientValue(value.trim());
    invalidateQuote();
  }, [invalidateQuote]);

  const setRecipientTypeAndReset = useCallback((value: TransferRecipientType) => {
    setRecipientType(value);
    if (value !== 'wallet') setError(`${value === 'email' ? 'Email' : 'X'} transfers are not enabled yet.`);
    else setError(null);
  }, []);

  const useMax = useCallback(() => {
    if (!selectedAsset) return;
    setAmountValue(maxAmount(selectedAsset));
    invalidateQuote();
  }, [invalidateQuote, selectedAsset]);

  const reviewTransfer = useCallback(async () => {
    setError(null);
    if (!ownerAddress) {
      setError('Connect the embedded wallet before preparing a transfer.');
      return;
    }
    if (!selectedAsset) {
      setError('Select an asset to transfer.');
      return;
    }
    const nextAmountError = validateTransferAmount(selectedAsset, amount);
    const nextRecipientError = validateTransferRecipient(selectedAsset, recipient);
    if (nextAmountError || nextRecipientError) {
      setError(nextAmountError || nextRecipientError);
      return;
    }
    if (!hasParticleProjectConfig(input.profile)) {
      setError('Particle Universal Accounts is not configured for this build.');
      return;
    }
    if (!isPublicParticleUaChain(selectedAsset.chainId)) {
      setError('Particle UA SDK v2 transfer supports its listed mainnet chains only. Switch to Mainnet to continue.');
      return;
    }

    setStage('quoting');
    try {
      const prepared = await createUaTransferQuote({
        ownerAddress,
        transfer: {
          token: {
            chainId: selectedAsset.chainId,
            address: selectedAsset.address
          },
          amount,
          receiver: recipient
        },
        profile: input.profile
      });
      setQuote({
        ...prepared,
        asset: selectedAsset,
        amount,
        recipient
      });
      setStage('review');
    } catch (quoteError) {
      setError(toErrorMessage(quoteError));
      setStage('error');
    }
  }, [amount, input.profile, ownerAddress, recipient, selectedAsset]);

  const confirmTransfer = useCallback(async () => {
    setError(null);
    if (!quote || !ownerAddress || !input.adapter) {
      setError('Prepare a fresh transfer quote before signing.');
      setStage('error');
      return;
    }
    if (!isProductEip7702Signer(input.wallet.stack) || !input.adapter.sign7702Authorization) {
      setError('The connected mobile signer cannot authorize Particle UA EIP-7702 transfers.');
      setStage('error');
      return;
    }

    try {
      const submitted = await submitUaTransaction({
        ownerAddress,
        wallet: input.adapter,
        transaction: quote.transaction,
        profile: input.profile,
        onProgress: (progress) => {
          if (progress === 'authorizing') setStage('authorizing');
          else if (progress === 'submitting') setStage('submitting');
          else if (progress === 'minting') setStage('confirming');
        }
      });
      setResult(submitted);
      setStage('success');
      await Promise.allSettled([
        input.onRefreshBalances(),
        input.onRefreshWallet()
      ]);
    } catch (submitError) {
      setError(toErrorMessage(submitError));
      setStage('error');
    }
  }, [input, ownerAddress, quote]);

  const returnToEdit = useCallback(() => {
    setError(null);
    setQuote(null);
    setResult(null);
    setStage('edit');
  }, []);

  return {
    visible,
    stage,
    sending,
    assets,
    networks,
    visibleAssets,
    selectedChainId,
    selectedAsset,
    selectedAssetId,
    hideSmallBalances,
    recipientType,
    recipient,
    amount,
    amountError,
    recipientError,
    quote,
    result,
    error,
    open,
    close,
    setSelectedChainId,
    setSelectedAssetId,
    setHideSmallBalances,
    setRecipientType: setRecipientTypeAndReset,
    setRecipient,
    setAmount,
    useMax,
    reviewTransfer,
    confirmTransfer,
    returnToEdit,
    formatAssetAmount: formatTransferAssetAmount
  };
}

export type UniversalAccountTransferState = ReturnType<typeof useUniversalAccountTransfer>;
