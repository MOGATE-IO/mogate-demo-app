import { LinearGradient } from 'expo-linear-gradient';
import { Chip, Typography } from 'heroui-native';
import { Gift } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import EthereumLogo from '@assets/+logos/ethereum-eth-logo.svg';
import { BrandImage } from '@/components/BrandImage.ui';
import { formatUsdAmount } from '@/features/checkout/services/paymentBalances';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';

export type InventoryGiftcardItemProps = {
  item: GiftcardInventoryItem;
  onPress?: () => void;
};

export function InventoryGiftcardItem({ item, onPress }: InventoryGiftcardItemProps) {
  if (!onPress) return <GiftcardVisual item={item} pressed={false} />;

  return (
    <Pressable
      accessibilityHint="Opens giftcard actions"
      accessibilityLabel={`${item.title}, token ${item.tokenId}`}
      accessibilityRole="button"
      onPress={onPress}
    >
      {({ pressed }) => <GiftcardVisual item={item} pressed={pressed} />}
    </Pressable>
  );
}

function GiftcardVisual({ item, pressed }: { item: GiftcardInventoryItem; pressed: boolean }) {
  return (
    <LinearGradient
      colors={item.isUnwrapped
        ? ['#f4f4f5', '#eef2f7', '#f8f5f2']
        : ['#fff0e5', '#ffd2c0', '#e5ddff']}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.giftcard, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <Typography type="body-xs" weight="semibold">Giftcard</Typography>
        <EthereumLogo height={24} width={24} />
      </View>
      <View style={styles.middle}>
        <View style={styles.logoWell}>
          <BrandImage
            accessibilityLabel={`${item.brandName} logo`}
            fallback={<Gift color="#ffffff" size={30} />}
            height={46}
            source={item.imageUrl}
            width={126}
          />
        </View>
        <View style={styles.identity}>
          <Typography color="muted" numberOfLines={1} type="body-xs">{item.category}</Typography>
          <Typography.Heading numberOfLines={1} type="h4">{item.brandName}</Typography.Heading>
        </View>
      </View>
      <View style={styles.bottomRow}>
        <View style={styles.tokenCopy}>
          <Typography color="muted" type="body-xs">NFT #{item.tokenId}</Typography>
          <View style={styles.statusRow}>
            <Chip color={item.isUnwrapped ? 'default' : 'accent'} size="sm" variant="soft">
              <Chip.Label>{item.isUnwrapped ? 'Unwrapped' : 'Public'}</Chip.Label>
            </Chip>
            {item.isEncrypted && !item.isUnwrapped ? (
              <Chip color="success" size="sm" variant="soft">
                <Chip.Label>Encrypted</Chip.Label>
              </Chip>
            ) : null}
          </View>
        </View>
        <View style={styles.valueCopy}>
          <Typography color="muted" type="body-xs">Value</Typography>
          <Typography.Heading type="h3">{formatGiftcardValue(item)}</Typography.Heading>
        </View>
      </View>
    </LinearGradient>
  );
}

export function formatGiftcardValue(item: GiftcardInventoryItem) {
  if (item.value == null) return 'Private';
  if (item.currency.toUpperCase() === 'USD') return formatUsdAmount(item.value);
  return `${item.value} ${item.currency}`;
}

const styles = StyleSheet.create({
  giftcard: {
    aspectRatio: 1.62,
    borderColor: 'rgba(113,113,122,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 205,
    padding: 16
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }]
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  middle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  logoWell: {
    alignItems: 'center',
    backgroundColor: '#e9680c',
    borderRadius: 8,
    height: 62,
    justifyContent: 'center',
    overflow: 'hidden',
    paddingHorizontal: 8,
    width: 138
  },
  identity: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  bottomRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  tokenCopy: {
    flex: 1,
    gap: 7
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  valueCopy: {
    alignItems: 'flex-end',
    gap: 2
  }
});
