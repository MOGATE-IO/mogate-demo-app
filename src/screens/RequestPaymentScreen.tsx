import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { shortenAddress } from '@/utils/format';
import type { AppScreenContext } from './types';

export function RequestPaymentScreen({ context }: { context: AppScreenContext }) {
  const ownerAddress = context.wallet.snapshot.ownerAddress || context.wallet.snapshot.address || '';
  const [amount, setAmount] = useState('50');
  const [memo, setMemo] = useState('Giftcard request');
  const [createdAt, setCreatedAt] = useState<number | null>(null);

  const requestId = useMemo(() => {
    if (!createdAt) return '';
    return `mogate:req:${context.profile.mode}:${ownerAddress.slice(2, 8)}:${createdAt}`;
  }, [context.profile.mode, createdAt, ownerAddress]);

  return (
    <View style={styles.stack}>
      <View style={styles.header}>
        <Text style={styles.title}>Request</Text>
        <Text style={styles.subtitle}>Create a simple payment request.</Text>
      </View>

      <Card title="Request payment">
        <InfoRow label="Recipient" value={shortenAddress(ownerAddress)} mono />
        <Text style={styles.label}>Amount</Text>
        <TextInput
          keyboardType="decimal-pad"
          onChangeText={setAmount}
          placeholder="50"
          placeholderTextColor="#777064"
          style={styles.input}
          value={amount}
        />
        <Text style={styles.label}>Memo</Text>
        <TextInput
          onChangeText={setMemo}
          placeholder="Giftcard request"
          placeholderTextColor="#777064"
          style={styles.input}
          value={memo}
        />
        <Button disabled={!ownerAddress} onPress={() => setCreatedAt(Date.now())} variant="primary">
          Create request
        </Button>
        {!ownerAddress ? (
          <Text style={styles.helper}>Connect before creating a request.</Text>
        ) : null}
      </Card>

      {requestId ? (
        <Card title="Payment request" eyebrow="Draft">
          <InfoRow label="Request ID" value={requestId} mono />
          <InfoRow label="Amount" value={`$${amount} USD`} />
          <InfoRow label="Memo" value={memo} />
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14
  },
  header: {
    gap: 4,
    paddingTop: 4
  },
  title: {
    color: '#171512',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0
  },
  subtitle: {
    color: '#8b857d',
    fontSize: 15,
    lineHeight: 21
  },
  label: {
    color: '#7d746a',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  input: {
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171512',
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 12
  },
  helper: {
    color: '#7b5812',
    fontSize: 13,
    lineHeight: 18
  }
});
