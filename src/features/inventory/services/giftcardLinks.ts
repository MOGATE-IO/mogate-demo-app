import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';

export function getGiftcardExplorerUrl(
  profile: RuntimeNetworkProfile,
  item: GiftcardInventoryItem
) {
  if (profile.ua.targetChainId === 11155111) {
    return `https://sepolia.etherscan.io/token/${item.collection}?a=${item.tokenId}`;
  }
  if (profile.ua.targetChainId === 42161) {
    return `https://arbiscan.io/token/${item.collection}?a=${item.tokenId}`;
  }
  return item.externalUrl ?? `https://etherscan.io/token/${item.collection}?a=${item.tokenId}`;
}
