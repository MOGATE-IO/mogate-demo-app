import {
  BrowserProvider,
  Contract,
  getAddress,
  isAddress,
  toBeHex
} from 'ethers';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { WalletAdapter } from '@/@web3/types/wallet';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import { withTimeout } from '@/utils/async';

const GIFTCARD_ACTION_ABI = [
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
  'function isUnwrapped(uint256 tokenId) view returns (bool)',
  'function unwrap(uint256 tokenId)',
  'function withdrawAll(uint256 tokenId)'
] as const;

type Eip1193Provider = {
  request: (request: { method: string; params?: unknown[] }) => Promise<unknown>;
};

export async function transferGiftcard({
  item,
  ownerAddress,
  profile,
  recipient,
  wallet
}: {
  item: GiftcardInventoryItem;
  ownerAddress: string;
  profile: RuntimeNetworkProfile;
  recipient: string;
  wallet: WalletAdapter;
}) {
  if (!isAddress(ownerAddress)) throw new Error('Connect the owning EVM wallet first.');
  if (!isAddress(recipient)) throw new Error('Enter a valid EVM recipient address.');
  if (getAddress(recipient) === getAddress(ownerAddress)) {
    throw new Error('The recipient already owns this wallet.');
  }
  if (item.isUnwrapped) throw new Error('This giftcard is unwrapped and cannot be transferred.');

  const signer = await getGiftcardSigner({ ownerAddress, profile, wallet });
  const collection = new Contract(item.collection, GIFTCARD_ACTION_ABI, signer);
  const transaction = await collection['safeTransferFrom(address,address,uint256)'](
    getAddress(ownerAddress),
    getAddress(recipient),
    BigInt(item.tokenId)
  ) as { hash: string; wait: () => Promise<{ status?: number } | null> };
  const receipt = await withTimeout(
    transaction.wait(),
    180_000,
    `Giftcard transfer was submitted as ${transaction.hash}, but it was not confirmed within 3 minutes.`
  );
  if (!receipt || receipt.status !== 1) throw new Error('Giftcard transfer reverted.');
  return transaction.hash as string;
}

export async function unwrapGiftcard({
  item,
  ownerAddress,
  profile,
  wallet
}: {
  item: GiftcardInventoryItem;
  ownerAddress: string;
  profile: RuntimeNetworkProfile;
  wallet: WalletAdapter;
}) {
  const signer = await getGiftcardSigner({ ownerAddress, profile, wallet });
  const collection = new Contract(item.collection, GIFTCARD_ACTION_ABI, signer);
  const isUnwrapped = item.isUnwrapped || Boolean(await withTimeout(
    collection.isUnwrapped(BigInt(item.tokenId)),
    15_000,
    'The giftcard unwrap status could not be loaded.'
  ));
  if (isUnwrapped) {
    return { alreadyUnwrapped: true, transactionHash: undefined };
  }

  const transaction = await collection.unwrap(BigInt(item.tokenId)) as {
      hash: string;
      wait: () => Promise<{ status?: number } | null>;
    };
  const receipt = await withTimeout(
    transaction.wait(),
    180_000,
    `Giftcard unwrap was submitted as ${transaction.hash}, but it was not confirmed within 3 minutes.`
  );
  if (!receipt || receipt.status !== 1) throw new Error('Giftcard unwrap reverted.');
  return { alreadyUnwrapped: false, transactionHash: transaction.hash as string };
}

export async function withdrawAllGiftcard({
  item,
  ownerAddress,
  profile,
  wallet
}: {
  item: GiftcardInventoryItem;
  ownerAddress: string;
  profile: RuntimeNetworkProfile;
  wallet: WalletAdapter;
}) {
  if (!item.isFunded) throw new Error('Only funded giftcards contain withdrawable balances.');

  const signer = await getGiftcardSigner({ ownerAddress, profile, wallet });
  const collection = new Contract(item.collection, GIFTCARD_ACTION_ABI, signer);
  const isUnwrapped = item.isUnwrapped || Boolean(await withTimeout(
    collection.isUnwrapped(BigInt(item.tokenId)),
    15_000,
    'The giftcard unwrap status could not be loaded.'
  ));
  if (!isUnwrapped) throw new Error('Unwrap this funded giftcard before withdrawing its balances.');

  const transaction = await collection.withdrawAll(BigInt(item.tokenId)) as {
    hash: string;
    wait: () => Promise<{ status?: number } | null>;
  };
  const receipt = await withTimeout(
    transaction.wait(),
    180_000,
    `Giftcard withdrawal was submitted as ${transaction.hash}, but it was not confirmed within 3 minutes.`
  );
  if (!receipt || receipt.status !== 1) throw new Error('Giftcard withdrawal reverted.');
  return transaction.hash as string;
}

async function getGiftcardSigner({
  ownerAddress,
  profile,
  wallet
}: {
  ownerAddress: string;
  profile: RuntimeNetworkProfile;
  wallet: WalletAdapter;
}) {
  if (!isAddress(ownerAddress)) throw new Error('Connect the owning EVM wallet first.');
  if (!wallet.getProvider) throw new Error('The connected wallet cannot send EVM transactions.');

  const rawProvider = await withTimeout(
    Promise.resolve(wallet.getProvider()),
    15_000,
    'The embedded wallet provider did not become ready within 15 seconds.'
  ) as Eip1193Provider;
  if (!rawProvider || typeof rawProvider.request !== 'function') {
    throw new Error('The embedded EVM wallet provider is not ready.');
  }

  const targetChainHex = toBeHex(profile.ua.targetChainId).toLowerCase();
  try {
    await withTimeout(
      rawProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetChainHex }]
      }),
      20_000,
      `The wallet did not switch to ${profile.ua.chainLabel} within 20 seconds.`
    );
  } catch (error) {
    const currentChain = String(await withTimeout(
      rawProvider.request({ method: 'eth_chainId' }),
      10_000,
      'The wallet did not report its current network.'
    )).toLowerCase();
    if (currentChain !== targetChainHex) throw error;
  }

  const provider = new BrowserProvider(rawProvider);
  const nativeBalance = await withTimeout(
    provider.getBalance(ownerAddress),
    15_000,
    `Could not read ${profile.ua.chainLabel} gas balance.`
  );
  if (nativeBalance === 0n) {
    throw new Error(`${profile.ua.chainLabel} ETH is required for this direct transaction.`);
  }
  return withTimeout(
    provider.getSigner(ownerAddress),
    15_000,
    'The connected wallet did not expose the giftcard signer.'
  );
}
