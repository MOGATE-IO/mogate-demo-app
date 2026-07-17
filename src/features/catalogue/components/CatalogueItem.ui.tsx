import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Eye } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { Typography } from 'heroui-native';

import { CatalogueMerchantLogo } from '@/features/catalogue/components/CatalogueMerchantLogo.ui';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';
import { regionFlag } from '@/utils/regions';

export type CatalogueItemProps = {
  merchant: GiftcardMerchant;
  onPress: () => void;
};

export function CatalogueItem({ merchant, onPress }: CatalogueItemProps) {
  return (
    <Pressable
      accessibilityHint="Opens mint details"
      accessibilityLabel={`Choose ${merchant.name}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
    >
      <LinearGradient
        colors={merchant.heroColor}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.card}
      >
        <View style={styles.identity}>
          <CatalogueMerchantLogo merchant={merchant} />
          <View style={styles.copy}>
            <Typography color="muted" numberOfLines={1} type="body-xs" weight="semibold">
              {formatCategoryLabel(merchant.category)}
            </Typography>
            <Typography.Heading numberOfLines={1} type="h4">{merchant.name}</Typography.Heading>
            <Typography color="muted" numberOfLines={1} type="body-xs">
              From ${merchant.availableAmounts[0]} {merchant.currency}
            </Typography>
          </View>
        </View>
        <View style={styles.meta}>
          <View style={styles.stat}>
            <Typography type="body-sm">{regionFlag(merchant.country ?? merchant.regions[0] ?? 'GLOBAL')}</Typography>
            <Eye color="#52525b" size={15} />
            <Typography color="muted" type="body-xs">{merchant.views}</Typography>
          </View>
          <View style={styles.openIcon}>
            <ChevronRight color="#3f3f46" size={19} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function formatCategoryLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized ? normalized[0].toUpperCase() + normalized.slice(1) : 'Giftcard';
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'stretch',
    borderRadius: 8,
    minHeight: 112,
    overflow: 'hidden',
    width: '100%'
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }]
  },
  card: {
    borderColor: 'rgba(113,113,122,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 112,
    padding: 14,
    width: '100%'
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  meta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  stat: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  openIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.68)',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36
  }
});
