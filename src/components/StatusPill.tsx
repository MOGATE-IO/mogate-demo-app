import { StyleSheet, Text, View } from 'react-native';

type StatusPillProps = {
  status: 'idle' | 'ready' | 'blocked' | 'done' | 'error' | 'connected' | 'connecting' | 'unsupported';
};

const STATUS_COLORS: Record<StatusPillProps['status'], { bg: string; fg: string; border: string }> = {
  idle: { bg: '#f0eee9', fg: '#6f6860', border: '#e3ddd3' },
  ready: { bg: '#eef8f3', fg: '#106b4f', border: '#bde5d3' },
  blocked: { bg: '#fff4de', fg: '#9a5b00', border: '#f0c878' },
  done: { bg: '#e9f7ff', fg: '#155b84', border: '#b9ddf2' },
  error: { bg: '#fff0ee', fg: '#a3372d', border: '#f1b5ad' },
  connected: { bg: '#eef8f3', fg: '#106b4f', border: '#bde5d3' },
  connecting: { bg: '#fff4de', fg: '#9a5b00', border: '#f0c878' },
  unsupported: { bg: '#fff4de', fg: '#9a5b00', border: '#f0c878' }
};

export function StatusPill({ status }: StatusPillProps) {
  const colors = STATUS_COLORS[status];
  return (
    <View style={[styles.pill, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.fg }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase'
  }
});
