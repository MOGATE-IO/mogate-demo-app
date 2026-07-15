import { Card, Chip, Typography } from 'heroui-native';
import { Gift } from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';
import { SvgUri } from 'react-native-svg';

export type GiftcardComponentProps = {
  brandName?: string | null;
  amountDisplay?: string | null;
  currency?: string | null;
  imageUrl?: string | null;
};

export function GiftcardComponent({
  amountDisplay,
  brandName,
  currency,
  imageUrl
}: GiftcardComponentProps) {
  const remoteImage = typeof imageUrl === 'string' && /^https?:\/\//.test(imageUrl) ? imageUrl : null;
  const isSvg = Boolean(remoteImage && /\.svg(?:\?|#|$)/i.test(remoteImage));
  const useBrandBackground = /mogate/i.test(brandName ?? '');

  return (
    <Card className="rounded-lg border border-border bg-surface p-3 shadow-none">
      <View style={styles.row}>
        <View style={[styles.logoFrame, useBrandBackground && styles.logoFrameBrand]}>
          {remoteImage && isSvg ? (
            <SvgUri height={38} uri={remoteImage} width={38} />
          ) : remoteImage ? (
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={{ uri: remoteImage }}
              style={styles.logo}
            />
          ) : (
            <Gift color="#e9680c" size={22} />
          )}
        </View>
        <View style={styles.copy}>
          <Typography color="muted" type="body-xs">Giftcard</Typography>
          <Typography numberOfLines={1} weight="semibold">{brandName || 'Giftcard'}</Typography>
        </View>
        <View style={styles.amountCopy}>
          <Typography weight="bold">
            {amountDisplay ? `$${amountDisplay}` : 'Select value'}
          </Typography>
          <Chip color="default" size="sm" variant="soft">
            <Chip.Label>{currency || 'USD'}</Chip.Label>
          </Chip>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  logoFrame: {
    alignItems: 'center',
    backgroundColor: '#fff0e5',
    borderColor: '#f5c9aa',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48
  },
  logoFrameBrand: {
    backgroundColor: '#e9680c',
    borderColor: '#e9680c'
  },
  logo: {
    height: 38,
    width: 38
  },
  copy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  amountCopy: {
    alignItems: 'flex-end',
    gap: 4
  }
});
