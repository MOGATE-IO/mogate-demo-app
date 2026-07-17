import { Gift } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

import { BrandImage } from '@/components/BrandImage.ui';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';

export function CatalogueMerchantLogo({
  large = false,
  merchant
}: {
  large?: boolean;
  merchant: GiftcardMerchant;
}) {
  const useBrandBackground = /mogate/i.test(merchant.name);
  const size = large ? 56 : 50;

  return (
    <View
      style={[
        styles.frame,
        { height: size, width: size },
        useBrandBackground && styles.brandFrame
      ]}
    >
      <BrandImage
        accessibilityLabel={`${merchant.name} logo`}
        fallback={merchant.name ? (
          <Text style={styles.fallback}>{merchant.name.slice(0, 2).toUpperCase()}</Text>
        ) : (
          <Gift color="#e9680c" size={23} />
        )}
        height={large ? 44 : 38}
        source={merchant.imageUrl}
        width={large ? 44 : 38}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderColor: 'rgba(255,255,255,0.72)',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden'
  },
  brandFrame: {
    backgroundColor: '#e9680c',
    borderColor: '#e9680c'
  },
  fallback: {
    color: '#3f3f46',
    fontSize: 15,
    fontWeight: '700'
  }
});
