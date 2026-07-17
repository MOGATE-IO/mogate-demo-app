import {
  Contract,
  Interface,
  JsonRpcProvider,
  Transaction,
  keccak256,
  toBeHex,
  toQuantity,
  toUtf8Bytes,
  type TransactionReceipt
} from 'ethers';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { HexString, WalletAdapter } from '@/@web3/types/wallet';
import { executeUaUnsafeCheckout } from '@/@web3/services/particleUniversalAccount';
import {
  ERC20_APPROVAL_ABI,
  MOGATE_UA_FUNDED_GATEWAY_ABI,
} from '@/config/contracts';
import {
  assertPreparedFundedCheckoutIntegrity,
  buildGiftcardMintCalls,
  extractMintedTokenIdFromReceipt,
  type PreparedUnsafeCheckout,
  type UaTransactionCall
} from '@/features/checkout/services/giftcardCheckout';
import { withTimeout } from '@/utils/async';
import { toErrorMessage } from '@/utils/errors';

type Eip1193Provider = {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
};

const DIRECT_GAS_BUFFER_NUMERATOR = 120n;
const DIRECT_GAS_BUFFER_DENOMINATOR = 100n;
const DIRECT_GAS_CAP = 16_777_216n;

type DirectFeeData = {
  gasPrice: bigint | null;
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
};

const erc20Interface = new Interface(ERC20_APPROVAL_ABI);
const approveSelector = erc20Interface.getFunction('approve')!.selector.toLowerCase();

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
  const provider = await withTimeout(
    Promise.resolve(wallet.getProvider()),
    15_000,
    'The embedded wallet provider did not become ready within 15 seconds. Refresh the wallet and try again.'
  );
  if (!provider || typeof (provider as Eip1193Provider).request !== 'function') {
    throw new Error('The embedded EVM wallet provider is not ready.');
  }
  return provider as Eip1193Provider;
}

export function buildDirectTransactionRequest(
  call: UaTransactionCall,
  estimatedGas: bigint
) {
  if (estimatedGas <= 0n) {
    throw new Error('The public RPC returned an invalid zero gas estimate.');
  }

  const bufferedGas =
    (estimatedGas * DIRECT_GAS_BUFFER_NUMERATOR + DIRECT_GAS_BUFFER_DENOMINATOR - 1n) /
    DIRECT_GAS_BUFFER_DENOMINATOR;

  return {
    to: call.to,
    data: call.data,
    value: BigInt(call.value ?? '0x0'),
    gasLimit: bufferedGas >= DIRECT_GAS_CAP ? DIRECT_GAS_CAP - 1n : bufferedGas
  };
}

function bufferDirectFee(value: bigint) {
  return (
    (value * DIRECT_GAS_BUFFER_NUMERATOR + DIRECT_GAS_BUFFER_DENOMINATOR - 1n) /
    DIRECT_GAS_BUFFER_DENOMINATOR
  );
}

export function buildPrivyUnsignedTransaction(input: {
  call: UaTransactionCall;
  estimatedGas: bigint;
  nonce: number;
  chainId: number;
  ownerAddress: string;
  feeData: DirectFeeData;
}) {
  const request = buildDirectTransactionRequest(input.call, input.estimatedGas);
  const base = {
    from: input.ownerAddress,
    to: request.to,
    data: request.data,
    value: toQuantity(request.value),
    chainId: input.chainId,
    nonce: toQuantity(input.nonce),
    gasLimit: toQuantity(request.gasLimit)
  };

  if (input.feeData.maxFeePerGas != null && input.feeData.maxPriorityFeePerGas != null) {
    return {
      ...base,
      type: 2,
      maxFeePerGas: toQuantity(bufferDirectFee(input.feeData.maxFeePerGas)),
      maxPriorityFeePerGas: toQuantity(
        bufferDirectFee(input.feeData.maxPriorityFeePerGas)
      )
    };
  }
  if (input.feeData.gasPrice != null) {
    return {
      ...base,
      type: 0,
      gasPrice: toQuantity(bufferDirectFee(input.feeData.gasPrice))
    };
  }
  throw new Error('The public RPC did not return usable transaction fee data.');
}

export function assertSignedDirectTransaction(input: {
  signedTransaction: unknown;
  unsignedTransaction: ReturnType<typeof buildPrivyUnsignedTransaction>;
}) {
  if (typeof input.signedTransaction !== 'string' || !input.signedTransaction.startsWith('0x')) {
    throw new Error('Privy did not return a signed raw transaction.');
  }

  const transaction = Transaction.from(input.signedTransaction);
  const expected = input.unsignedTransaction;
  const expectedGasLimit = BigInt(expected.gasLimit);
  if (transaction.gasLimit !== expectedGasLimit || transaction.gasLimit === 0n) {
    throw new Error(
      `Privy signed an invalid gas limit: expected ${expectedGasLimit}, received ${transaction.gasLimit}.`
    );
  }
  if (transaction.chainId !== BigInt(expected.chainId)) {
    throw new Error('Privy signed the transaction for a different chain.');
  }
  if (transaction.nonce !== Number(BigInt(expected.nonce))) {
    throw new Error('Privy signed the transaction with a different nonce.');
  }
  if (transaction.from?.toLowerCase() !== expected.from.toLowerCase()) {
    throw new Error('Privy signed the transaction with a different wallet.');
  }
  if (transaction.to?.toLowerCase() !== expected.to.toLowerCase()) {
    throw new Error('Privy signed the transaction for a different contract.');
  }
  if (transaction.data.toLowerCase() !== expected.data.toLowerCase()) {
    throw new Error('Privy signed different transaction calldata.');
  }
  if (transaction.value !== BigInt(expected.value)) {
    throw new Error('Privy signed a different native value.');
  }

  return input.signedTransaction as `0x${string}`;
}

export async function assertFundedGatewayReady(
  checkout: PreparedUnsafeCheckout,
  provider: JsonRpcProvider
) {
  if (checkout.gatewayVersion !== 'signed-v2' || !checkout.signedPermit || !checkout.gatewayAddress) {
    return;
  }
  const signedPermit = checkout.signedPermit;

  const gateway = new Contract(
    checkout.gatewayAddress,
    MOGATE_UA_FUNDED_GATEWAY_ABI,
    provider
  );
  const funding = (checkout.fundedAssets ?? []).map((asset) => ({
    token: asset.token,
    amount: asset.amountAtomic
  }));
  const checkoutParams = {
    orderId: checkout.orderId,
    collection: checkout.collection,
    to: checkout.to,
    uri: checkout.uri
  };
  const fee = { token: checkout.paymentToken, amount: checkout.amountAtomic };
  const permit = {
    gasReserveAmount: signedPermit.gasReserveAmount,
    nonce: signedPermit.nonce,
    deadline: signedPermit.deadline
  };
  const orderKey = keccak256(toUtf8Bytes(checkout.orderId));
  // The public testnet RPC caps JSON-RPC batches at three calls. Keep these
  // reads sequential so readiness validation cannot fail on a provider tier.
  const [version, backendSigner, paused, collectionAllowed, nonceUsed, order, digest] =
    await withTimeout(
      (async () => {
        const resolvedVersion = await gateway.gatewayVersion();
        const resolvedBackendSigner = await gateway.backendSigner();
        const resolvedPaused = await gateway.isPaused();
        const resolvedCollectionAllowed = await gateway.allowedCollections(checkout.collection);
        const resolvedNonceUsed = await gateway.usedNonces(
          checkout.payer,
          signedPermit.nonce
        );
        const resolvedOrder = await gateway.orders(orderKey);
        const resolvedDigest = await gateway.checkoutDigest(
          checkoutParams,
          fee,
          funding,
          permit,
          checkout.valuePolicyCode ?? 0,
          checkout.payer
        );
        return [
          resolvedVersion,
          resolvedBackendSigner,
          resolvedPaused,
          resolvedCollectionAllowed,
          resolvedNonceUsed,
          resolvedOrder,
          resolvedDigest
        ] as const;
      })(),
      20_000,
      'The funded gateway readiness check did not finish within 20 seconds.'
    );

  if (BigInt(version) !== 2n) throw new Error('The configured funded gateway is not version 2.');
  if (paused) throw new Error('The funded gateway is currently paused.');
  if (!collectionAllowed) throw new Error('The funded collection is not allowed by the gateway.');
  if (nonceUsed) throw new Error('The prepared checkout nonce has already been used.');
  if (BigInt(order.state ?? order[0]) !== 0n) {
    throw new Error('The prepared checkout order ID has already been used.');
  }
  if (!signedPermit.signer || backendSigner.toLowerCase() !== signedPermit.signer.toLowerCase()) {
    throw new Error('The prepared signer does not match the gateway backend signer.');
  }
  if (String(digest).toLowerCase() !== signedPermit.digest.toLowerCase()) {
    throw new Error('The gateway digest does not match the prepared checkout signature.');
  }
}

async function hasSufficientApproval(
  call: UaTransactionCall,
  ownerAddress: string,
  provider: JsonRpcProvider
) {
  if (!call.data.toLowerCase().startsWith(approveSelector)) return false;
  const [spender, amount] = erc20Interface.decodeFunctionData('approve', call.data);
  const token = new Contract(call.to, ERC20_APPROVAL_ABI, provider);
  const allowance = BigInt(await token.allowance(ownerAddress, spender));
  return allowance >= BigInt(amount);
}

async function payDirect(input: GiftcardPayInput): Promise<GiftcardPaymentResult> {
  input.onProgress?.('confirming-payment');
  assertPreparedFundedCheckoutIntegrity(input.checkout, input.ownerAddress, input.profile);
  const rawProvider = await getEip1193Provider(input.wallet);
  const callSet = buildGiftcardMintCalls(input.checkout, input.profile);

  const targetChainHex = toBeHex(callSet.chainId).toLowerCase();
  try {
    await withTimeout(
      rawProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainHex }]
      }),
      20_000,
      `The wallet did not switch to ${input.profile.ua.chainLabel} within 20 seconds.`
    );
  } catch (error) {
    const currentChain = String(await withTimeout(
      rawProvider.request({ method: 'eth_chainId' }),
      10_000,
      'The wallet did not report its current network.'
    )).toLowerCase();
    if (currentChain !== targetChainHex) throw error;
  }

  const publicProvider = new JsonRpcProvider(
    input.profile.ua.rpcUrl,
    callSet.chainId,
    { staticNetwork: true }
  );
  const nativeBalance = await withTimeout(
    publicProvider.getBalance(input.ownerAddress),
    15_000,
    `Could not read ${input.profile.ua.chainLabel} gas balance.`
  );
  if (nativeBalance === 0n) {
    throw new Error(
      `Direct testnet payment needs ${input.profile.ua.chainLabel} ETH for gas. Top up the connected address, then refresh balances.`
    );
  }
  await assertFundedGatewayReady(input.checkout, publicProvider);
  const transactions: UaTransactionCall[] = [];
  for (const call of callSet.transactions) {
    if (await hasSufficientApproval(call, input.ownerAddress, publicProvider)) continue;
    transactions.push(call);
  }
  const transactionHashes: string[] = [];
  let finalReceipt: TransactionReceipt | null = null;

  for (const [index, call] of transactions.entries()) {
    const step = index === transactions.length - 1 ? 'giftcard mint' : 'token approval';
    input.onProgress?.(index === transactions.length - 1 ? 'minting' : 'confirming-payment');
    try {
      const transactionRequest = {
        to: call.to,
        data: call.data,
        value: BigInt(call.value ?? '0x0')
      };
      const [estimatedGas, nonce, feeData] = await Promise.all([
        withTimeout(
          publicProvider.estimateGas({
            ...transactionRequest,
            from: input.ownerAddress
          }),
          20_000,
          `Could not estimate ${step} gas on ${input.profile.ua.chainLabel}.`
        ),
        withTimeout(
          publicProvider.getTransactionCount(input.ownerAddress, 'pending'),
          15_000,
          `Could not read the ${step} transaction nonce.`
        ),
        withTimeout(
          publicProvider.getFeeData(),
          15_000,
          `Could not read ${input.profile.ua.chainLabel} transaction fees.`
        )
      ]);
      const unsignedTransaction = buildPrivyUnsignedTransaction({
        call,
        estimatedGas,
        nonce,
        chainId: callSet.chainId,
        ownerAddress: input.ownerAddress,
        feeData
      });
      // Privy Expo's send path currently loses viem `gas` before embedded-wallet signing.
      // Sign the complete `gasLimit` request directly and verify its raw bytes before broadcast.
      const signedTransaction = assertSignedDirectTransaction({
        unsignedTransaction,
        signedTransaction: await withTimeout(
          rawProvider.request({
            method: 'eth_signTransaction',
            params: [unsignedTransaction]
          }),
          60_000,
          `Privy did not sign the ${step} within 60 seconds.`
        )
      });
      const transactionHash = await withTimeout(
        rawProvider.request({
          method: 'eth_sendRawTransaction',
          params: [signedTransaction]
        }),
        30_000,
        `The signed ${step} was not submitted within 30 seconds.`
      );
      if (typeof transactionHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(transactionHash)) {
        throw new Error('The RPC did not return a valid transaction hash.');
      }
      transactionHashes.push(transactionHash);
      finalReceipt = await withTimeout(
        publicProvider.waitForTransaction(transactionHash, 1, 180_000),
        180_000,
        `${step} was submitted as ${transactionHash}, but it was not confirmed within 3 minutes. Check the network record before retrying.`
      );
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
