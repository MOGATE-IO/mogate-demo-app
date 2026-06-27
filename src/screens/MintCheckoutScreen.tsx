import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import { StatusPill } from '@/components/StatusPill';
import { prettyJson, shortenAddress } from '@/utils/format';
import type { AppScreenContext } from './types';

export function MintCheckoutScreen({ context }: { context: AppScreenContext }) {
  const { checkoutSelection, mint, profile, wallet } = context;
  const ownerAddress = wallet.snapshot.ownerAddress || wallet.snapshot.address || '';
  const checkoutOwnerMatch = mint.preparedCheckout
    ? mint.preparedCheckout.to.toLowerCase() === ownerAddress.toLowerCase()
    : false;
  const canMint =
    wallet.snapshot.status === 'connected' &&
    context.productSignerReady &&
    checkoutOwnerMatch &&
    Boolean(mint.preparedCheckout);

  return (
    <View style={styles.stack}>
      <Button onPress={() => context.goToTab('search')} variant="quiet">
        Back to catalogue
      </Button>

      <Card title="Mint checkout" eyebrow={profile.ua.chainLabel} right={<StatusPill status={canMint ? 'ready' : 'idle'} />}>
        <InfoRow label="Merchant" value={checkoutSelection?.merchant.name ?? 'No merchant selected'} />
        <InfoRow
          label="Amount"
          value={checkoutSelection ? `$${checkoutSelection.amount} ${checkoutSelection.merchant.currency}` : 'Not selected'}
        />
        <InfoRow label="Owner EOA" value={shortenAddress(ownerAddress)} mono />
        <InfoRow label="UA mode" value={profile.ua.mode} />
        <InfoRow label="Payment asset" value={profile.ua.expectTokenType || 'Particle route default'} />
      </Card>

      <Card title="Readiness" eyebrow="Mint gates">
        {mint.gates.map((gate) => (
          <View key={gate.id} style={styles.gate}>
            <View style={styles.gateHeader}>
              <Text style={styles.gateTitle}>{gate.label}</Text>
              <StatusPill status={gate.status} />
            </View>
            <Text style={styles.gateDetail}>{gate.detail}</Text>
          </View>
        ))}
      </Card>

      <Card title="Universal Account" eyebrow="Probe">
        <View style={styles.actions}>
          <Button onPress={mint.probeUa} disabled={wallet.snapshot.status !== 'connected'}>
            Probe UA
          </Button>
        </View>
        <InfoRow label="Target chain" value={`${profile.ua.targetChainId} ${profile.ua.chainLabel}`} />
        <InfoRow label="Mode" value={profile.ua.networkMode} />
        {mint.uaProbe ? (
          <Text selectable style={styles.jsonPreview}>
            {prettyJson(mint.uaProbe)}
          </Text>
        ) : null}
      </Card>

      <Card title="Checkout payload" eyebrow={`${profile.gateway.version} gateway`}>
        <View style={styles.actions}>
          <Button onPress={mint.loadCheckoutFromBackend}>Load checkout</Button>
          <Button onPress={mint.parseCheckout} variant="quiet">
            Parse JSON
          </Button>
          <Button onPress={mint.executeMint} disabled={!canMint} variant="primary">
            Send UA mint
          </Button>
        </View>
        <Text style={styles.fieldLabel}>Prepared checkout JSON</Text>
        <TextInput
          accessibilityLabel="Prepared checkout JSON"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          onChangeText={mint.setCheckoutJson}
          placeholder="Paste prepared checkout JSON"
          placeholderTextColor="#777064"
          scrollEnabled
          style={styles.input}
          value={mint.checkoutJson}
        />
        {mint.preparedCheckout ? (
          <View style={styles.summary}>
            <InfoRow label="Order" value={mint.preparedCheckout.orderId} mono />
            <InfoRow label="Receiver" value={shortenAddress(mint.preparedCheckout.to)} mono />
            <InfoRow
              label="Payment"
              value={`${mint.preparedCheckout.amountDisplay} ${mint.preparedCheckout.currency}`}
            />
            <InfoRow label="Funded balance" value={mint.mintPlan?.funded} />
            <InfoRow label="Reserved gas" value={mint.mintPlan?.gasReserve} />
          </View>
        ) : null}
        {mint.mintResult ? (
          <View style={styles.summary}>
            <InfoRow label="UniversalX" value={mint.mintResult.universalXUrl} />
            <InfoRow label="Token ID" value={mint.mintResult.tokenId || 'Waiting for receipt logs'} />
            <InfoRow label="Reconciliation" value={`${mint.reconciliation.status}: ${mint.reconciliation.detail}`} />
          </View>
        ) : null}
        {mint.lastError ? <Text style={styles.errorText}>{mint.lastError}</Text> : null}
      </Card>
    </View>
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
  gate: {
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    gap: 7,
    paddingTop: 11
  },
  gateHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  gateTitle: {
    color: '#171512',
    flex: 1,
    fontSize: 14,
    fontWeight: '800'
  },
  gateDetail: {
    color: '#6f6860',
    fontSize: 13,
    lineHeight: 18
  },
  input: {
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#171512',
    fontFamily: 'Courier',
    fontSize: 12,
    minHeight: 220,
    padding: 12,
    textAlignVertical: 'top'
  },
  fieldLabel: {
    color: '#7d746a',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  summary: {
    gap: 8
  },
  jsonPreview: {
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 8,
    borderWidth: 1,
    color: '#342f2a',
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
    maxHeight: 220,
    padding: 10
  },
  errorText: {
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
