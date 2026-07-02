import { StyleSheet, Text, View } from 'react-native';

export type GiftcardComponentProps = {
  brandName?: string | null;
  amountDisplay?: string | null;
  currency?: string | null;
};

export function GiftcardComponent({
  amountDisplay,
  brandName,
  currency
}: GiftcardComponentProps) {
  return (
    <View style={styles.shell}>
      <Text style={styles.kicker}>Giftcard</Text>
      <Text style={styles.brand}>{brandName || 'Mogate Giftcard'}</Text>
      <Text style={styles.amount}>
        {amountDisplay ? `$${amountDisplay}` : '$0.10'} {currency || 'USD'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: '#171512',
    borderColor: '#3c3731',
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    minHeight: 148,
    justifyContent: 'flex-end',
    padding: 16
  },
  kicker: {
    color: '#d6c5ad',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  brand: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0
  },
  amount: {
    color: '#f7dc78',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0
  }
});
