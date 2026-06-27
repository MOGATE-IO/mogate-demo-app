import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

type LoginRequiredProps = {
  title?: string;
  detail?: string;
  buttonLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onLogin: () => void | Promise<void>;
};

export function LoginRequired({
  buttonLabel = 'Connect',
  detail = 'Connect your embedded wallet to view this section.',
  disabled,
  loading,
  onLogin,
  title = 'Login required'
}: LoginRequiredProps) {
  return (
    <Card title={title} eyebrow="Protected">
      <View style={styles.body}>
        <Text style={styles.copy}>{detail}</Text>
        <Button disabled={disabled} loading={loading} onPress={onLogin} variant="primary">
          {buttonLabel}
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
