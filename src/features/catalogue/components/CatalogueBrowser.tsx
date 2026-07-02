import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoRow } from '@/components/InfoRow';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';

export type CatalogueBrowserProps = {
  query: string;
  loading: boolean;
  lastError?: string | null;
  merchants: GiftcardMerchant[];
  selected: GiftcardMerchant | null;
  selectedAmount: number | null;
  onQueryChange: (query: string) => void;
  onSelectMerchant: (merchant: GiftcardMerchant) => void;
  onBack: () => void;
  onSelectAmount: (amount: number) => void;
  onCheckout: (merchant: GiftcardMerchant, amount: number) => void;
};

export function CatalogueBrowser({
  lastError,
  loading,
  merchants,
  onBack,
  onCheckout,
  onQueryChange,
  onSelectAmount,
  onSelectMerchant,
  query,
  selected,
  selectedAmount
}: CatalogueBrowserProps) {
  if (selected) {
    const amount = selectedAmount ?? selected.availableAmounts[0] ?? 25;
    return (
      <View style={styles.stack}>
        <Button onPress={onBack} variant="quiet">
          Back
        </Button>
        <LinearGradient colors={selected.heroColor} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.hero}>
          <Text style={styles.category}>{selected.category}</Text>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.description}>{selected.description}</Text>
        </LinearGradient>
        <Card title="Merchant detail" eyebrow="Catalogue">
          <InfoRow label="Recent purchases" value={String(selected.recentPurchases)} />
          <InfoRow label="Views" value={String(selected.views)} />
          <InfoRow label="Available chains" value={selected.chains.join(', ') || 'Not listed'} />
          <View style={styles.amountGrid}>
            {selected.availableAmounts.map((nextAmount) => {
              const active = amount === nextAmount;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  key={nextAmount}
                  onPress={() => onSelectAmount(nextAmount)}
                  style={[styles.amountButton, active && styles.amountButtonActive]}
                >
                  <Text style={[styles.amountText, active && styles.amountTextActive]}>
                    ${nextAmount}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Button onPress={() => onCheckout(selected, amount)} variant="primary">
            Purchase
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.stack}>
      <Card title="Search" eyebrow="Giftcard catalogue">
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={onQueryChange}
          placeholder="Search merchants, category, or chain"
          placeholderTextColor="#777064"
          style={styles.input}
          value={query}
        />
        {lastError ? <Text style={styles.error}>{lastError}</Text> : null}
        <Text style={styles.muted}>
          {loading ? 'Loading catalogue' : `${merchants.length} merchant options`}
        </Text>
      </Card>

      {merchants.map((merchant) => (
        <Pressable key={merchant.id} onPress={() => onSelectMerchant(merchant)}>
          <LinearGradient colors={merchant.heroColor} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.rowCard}>
            <View style={styles.rowText}>
              <Text style={styles.category}>{merchant.category}</Text>
              <Text style={styles.rowTitle}>{merchant.name}</Text>
              <Text style={styles.muted}>
                ${merchant.availableAmounts[0]}+ / {merchant.recentPurchases} recent
              </Text>
            </View>
            <Text style={styles.openMark}>+</Text>
          </LinearGradient>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 14
  },
  hero: {
    borderColor: '#e3ddd3',
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    minHeight: 188,
    justifyContent: 'flex-end',
    padding: 18
  },
  category: {
    color: '#6f6860',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase'
  },
  title: {
    color: '#171512',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0
  },
  description: {
    color: '#4f4740',
    fontSize: 14,
    lineHeight: 20
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
  muted: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17
  },
  rowCard: {
    alignItems: 'flex-end',
    borderColor: '#e3ddd3',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 116,
    padding: 16
  },
  rowText: {
    flex: 1,
    gap: 3
  },
  rowTitle: {
    color: '#171512',
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 0
  },
  openMark: {
    color: '#171512',
    fontSize: 24,
    fontWeight: '900'
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  amountButton: {
    alignItems: 'center',
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 42,
    minWidth: 72,
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  amountButtonActive: {
    backgroundColor: '#171512',
    borderColor: '#171512'
  },
  amountText: {
    color: '#4f4740',
    fontSize: 14,
    fontWeight: '900'
  },
  amountTextActive: {
    color: '#ffffff'
  },
  error: {
    color: '#a3372d',
    fontSize: 13,
    lineHeight: 18
  }
});
