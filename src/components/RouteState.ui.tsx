import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';

export function RouteState({
  actionLabel,
  body,
  loading = false,
  onAction,
  title
}: {
  actionLabel?: string;
  body: string;
  loading?: boolean;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.shell}>
      {loading ? <ActivityIndicator color="#e9680c" size="large" /> : null}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      {actionLabel && onAction ? (
        <Button onPress={onAction} variant="primary">
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    minHeight: 320,
    padding: 24
  },
  title: {
    color: '#171512',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center'
  },
  body: {
    color: '#6f6860',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  }
});
