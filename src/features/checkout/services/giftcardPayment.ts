import { BrowserProvider, toBeHex } from 'ethers';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { HexString, WalletAdapter } from '@/@web3/types/wallet';
import { executeUaUnsafeCheckout } from '@/@web3/services/particleUniversalAccount';
import {
  buildGiftcardMintCalls,
  extractMintedTokenIdFromReceipt,
  type PreparedUnsafeCheckout
} from '@/features/checkout/services/giftcardCheckout';
import { toErrorMessage } from '@/utils/errors';

type Eip1193Provider = {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export type GiftcardPaymentResult = {
  mode: 'direct' | 'ua7702';
  transaction?: unknown;
  result: Record<string, unknown>;
  authorizations?: unknown[];
  tokenId?: string;
  transactionHash?: string;
  universalXUrl?: string;
};

export type GiftcardPaymentProgressStep = 'confirming-payment' | 'minting';

export type GiftcardPayInput = {
  amount: bigint;
  tokenAddress: HexString;
  ua7702?: boolean;
  ownerAddress: string;
  wallet: WalletAdapter;
  checkout: PreparedUnsafeCheckout;
  profile: RuntimeNetworkProfile;
  onProgress?: (step: GiftcardPaymentProgressStep) => void;
};

function assertPaymentMatchesCheckout(input: GiftcardPayInput) {
  if (input.amount !== input.checkout.amountAtomic) {
    throw new Error('Payment amount does not match the prepared checkout quote. Prepare checkout again.');
  }
  if (input.tokenAddress.toLowerCase() !== input.checkout.paymentToken.toLowerCase()) {
    throw new Error('Payment token does not match the prepared checkout quote. Prepare checkout again.');
  }
  const targetRoute = input.profile.stablecoinRoutes.find(
    (route) => route.chainId === input.profile.ua.targetChainId
  );
  const configuredUsdc = targetRoute?.tokens.find((token) => token.symbol === 'USDC');
  if (!configuredUsdc || configuredUsdc.address.toLowerCase() !== input.checkout.paymentToken.toLowerCase()) {
    throw new Error(
      `Prepared payment token is not the configured USDC on ${input.profile.ua.chainLabel}. Prepare checkout again.`
    );
  }
}

async function getEip1193Provider(wallet: WalletAdapter) {
  if (!wallet.getProvider) {
    throw new Error('Direct payment requires an embedded EVM wallet provider.');
  }
  const provider = await wallet.getProvider();
  if (!provider || typeof (provider as Eip1193Provider).request !== 'function') {
    throw new Error('The embedded EVM wallet provider is not ready.');
  }
  return provider as Eip1193Provider;
}

async function payDirect(input: GiftcardPayInput): Promise<GiftcardPaymentResult> {
  input.onProgress?.('confirming-payment');
  const rawProvider = await getEip1193Provider(input.wallet);
  const callSet = buildGiftcardMintCalls(input.checkout, input.profile);

  const targetChainHex = toBeHex(callSet.chainId).toLowerCase();
  try {
    await rawProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetChainHex }]
    });
  } catch (error) {
    const currentChain = String(await rawProvider.request({ method: 'eth_chainId' })).toLowerCase();
    if (currentChain !== targetChainHex) throw error;
  }

  const provider = new BrowserProvider(rawProvider);
  const signer = await provider.getSigner(input.ownerAddress);
  const nativeBalance = await provider.getBalance(input.ownerAddress);
  if (nativeBalance === 0n) {
    throw new Error(
      `Direct testnet payment needs ${input.profile.ua.chainLabel} ETH for gas. Top up the connected address, then refresh balances.`
    );
  }
  const transactionHashes: string[] = [];
  let finalReceipt: Awaited<ReturnType<Awaited<ReturnType<typeof signer.sendTransaction>>['wait']>> = null;

  for (const [index, call] of callSet.transactions.entries()) {
    const step = index === callSet.transactions.length - 1 ? 'giftcard mint' : 'token approval';
    input.onProgress?.(index === callSet.transactions.length - 1 ? 'minting' : 'confirming-payment');
    try {
      const transaction = await signer.sendTransaction({
        to: call.to,
        data: call.data,
        value: BigInt(call.value ?? '0x0')
      });
      transactionHashes.push(transaction.hash);
      finalReceipt = await transaction.wait();
      if (!finalReceipt || finalReceipt.status !== 1) {
        throw new Error('transaction reverted');
      }
    } catch (error) {
      throw new Error(`Direct ${step} failed: ${toErrorMessage(error)}`);
    }
  }

  const tokenId = extractMintedTokenIdFromReceipt({
    receipt: finalReceipt,
    receiver: input.checkout.to,
    collection: input.checkout.collection
  });

  return {
    mode: 'direct',
    result: {
      transactionHashes,
      receipt: finalReceipt
    },
    tokenId,
    transactionHash: transactionHashes.at(-1)
  };
}

export async function pay(input: GiftcardPayInput): Promise<GiftcardPaymentResult> {
  assertPaymentMatchesCheckout(input);

  if (!input.ua7702) return payDirect(input);

  input.onProgress?.('confirming-payment');
  const uaResult = await executeUaUnsafeCheckout({
    ownerAddress: input.ownerAddress,
    wallet: input.wallet,
    checkout: input.checkout,
    profile: input.profile
  });
  input.onProgress?.('minting');

  return {
    ...uaResult,
    mode: 'ua7702',
    authorizations: uaResult.authorizations
  };
}
