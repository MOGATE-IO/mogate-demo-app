import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { StatusPill } from '@/components/StatusPill';
import { shortenAddress } from '@/utils/format';
import type { AppScreenContext } from './types';

export function HomeScreen({ context }: { context: AppScreenContext }) {
  const { balance, catalogue, profile, topUp, wallet } = context;
  const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
  const connected = wallet.snapshot.status === 'connected';

  return (
    <View style={styles.stack}>
      <Card
        title="Account"
        eyebrow={`${profile.label} wallet`}
        right={<StatusPill status={wallet.snapshot.status === 'error' ? 'error' : wallet.snapshot.status} />}
      >
        <View style={styles.actions}>
          <Button onPress={wallet.refresh} disabled={!wallet.isAdapterReady || !connected}>
            Refresh
          </Button>
          <Button onPress={topUp} disabled={!ownerAddress} variant="quiet">
            Top up
          </Button>
        </View>
        <InfoRow label="Owner EOA" value={shortenAddress(ownerAddress)} mono />
        <InfoRow label="Network" value={`${profile.ua.chainLabel} (${profile.ua.targetChainId})`} />
        <InfoRow label="Unified primary balance" value={balance.formattedTotal} />
        <InfoRow label="Top-up provider" value={profile.onramp.primaryProvider} />
        {wallet.snapshot.lastError ? <Text style={styles.error}>{wallet.snapshot.lastError}</Text> : null}
      </Card>

      <View style={styles.tileGrid}>
        <MetricTile colors={['#ffffff', '#dff2ff', '#f7dcf8']} label="Recent purchases" value="12" />
        <MetricTile colors={['#ffffff', '#fff1c9', '#d8efff']} label="Catalogue views" value="3.8k" />
      </View>

      <Card title="Trending giftcards" eyebrow="Market pulse">
        {catalogue.lastError ? <Text style={styles.error}>{catalogue.lastError}</Text> : null}
        {catalogue.trending.map((merchant) => (
          <View key={merchant.id} style={styles.trendingRow}>
            <View style={styles.trendingText}>
              <Text style={styles.merchantName}>{merchant.name}</Text>
              <Text style={styles.muted}>
                {merchant.recentPurchases} purchases / {merchant.views} views
              </Text>
            </View>
            <Button onPress={() => context.goToCheckout({ merchant, amount: merchant.availableAmounts[0] ?? 25 })}>
              Buy
            </Button>
          </View>
        ))}
        {!catalogue.loading && catalogue.trending.length === 0 && !catalogue.lastError ? (
          <Text style={styles.muted}>No giftcards returned from the backend catalogue yet.</Text>
        ) : null}
      </Card>
    </View>
  );
}

function MetricTile({
  colors,
  label,
  value
}: {
  colors: readonly [string, string, string];
  label: string;
  value: string;
}) {
  return (
    <LinearGradient colors={colors} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tileGrid: {
    flexDirection: 'row',
    gap: 12
  },
  metricTile: {
    borderColor: '#e3ddd3',
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 96,
    justifyContent: 'flex-end',
    padding: 14
  },
  metricValue: {
    color: '#171512',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0
  },
  metricLabel: {
    color: '#665f56',
    fontSize: 12,
    fontWeight: '800'
  },
  trendingRow: {
    alignItems: 'center',
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12
  },
  trendingText: {
    flex: 1
  },
  merchantName: {
    color: '#171512',
    fontSize: 15,
    fontWeight: '800'
  },
  muted: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
  },
  error: {
    backgroundColor: '#fff0ee',
    borderColor: '#f1b5ad',
    borderRadius: 8,
    borderWidth: 1,
    color: '#a3372d',
    fontSize: 13,
    lineHeight: 18,
    padding: 10
  }
});
