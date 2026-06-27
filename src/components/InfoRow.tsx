import { StyleSheet, Text, View } from 'react-native';

type InfoRowProps = {
  label: string;
  value?: string | number | null;
  mono?: boolean;
};

export function InfoRow({ label, mono, value }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text selectable style={[styles.value, mono && styles.mono]}>
        {value == null || value === '' ? 'Not available' : value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    gap: 5,
    paddingTop: 10
  },
  label: {
    color: '#7d746a',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  value: {
    color: '#171512',
    fontSize: 13,
    lineHeight: 18
  },
  mono: {
    fontFamily: 'Courier',
    fontSize: 12
  }
});
