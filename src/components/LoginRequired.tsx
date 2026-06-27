import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

type LoginRequiredProps = {
  title?: string;
  detail?: string;
  loading?: boolean;
  onLogin: () => void | Promise<void>;
};

export function LoginRequired({
  detail = 'Connect your embedded wallet to view this section.',
  loading,
  onLogin,
  title = 'Login required'
}: LoginRequiredProps) {
  return (
    <Card title={title} eyebrow="Protected">
      <View style={styles.body}>
        <Text style={styles.copy}>{detail}</Text>
        <Button loading={loading} onPress={onLogin} variant="primary">
          Connect
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: 12
  },
  copy: {
    color: '#6f6860',
    fontSize: 14,
    lineHeight: 20
  }
});
