import {
  Button,
  Card,
  Skeleton,
  Surface,
  Typography
} from 'heroui-native';
import { CircleAlert, RotateCw } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CatalogueFilters } from '@/features/catalogue/components/CatalogueFilters.ui';
import { CatalogueHeader } from '@/features/catalogue/components/CatalogueHeader.ui';
import { CatalogueItem } from '@/features/catalogue/components/CatalogueItem.ui';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';

export type CatalogueBrowserProps = {
  accountName: string;
  avatarLabel: string;
  query: string;
  country: string;
  loading: boolean;
  lastError?: string | null;
  merchants: GiftcardMerchant[];
  totalCount: number;
  canLoadMore: boolean;
  onOpenAccount: () => void;
  onQueryChange: (query: string) => void;
  onCountryChange: (country: string) => void;
  onSelectMerchant: (merchant: GiftcardMerchant) => void;
  onLoadMore: () => void;
  onRetry: () => void;
};

export function CatalogueBrowser({
  accountName,
  avatarLabel,
  country,
  lastError,
  loading,
  merchants,
  totalCount,
  canLoadMore,
  onCountryChange,
  onLoadMore,
  onOpenAccount,
  onQueryChange,
  onSelectMerchant,
  onRetry,
  query
}: CatalogueBrowserProps) {
  // Temporarily bypassed: catalogue selection now opens the stack checkout directly.
  /*
  if (selected) {
    const amount = selectedAmount ?? selected.availableAmounts[0];
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <PageHeader
          backLabel="Back to search"
          onBack={onBack}
          subtitle="Review amount and payment route."
          title="Checkout"
        />
        <LinearGradient colors={selected.heroColor} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={styles.hero}>
          <MerchantImage merchant={selected} large />
          <Text style={styles.category}>{selected.category}</Text>
          <Text style={styles.title}>{selected.name}</Text>
          <Text style={styles.description}>{selected.description}</Text>
        </LinearGradient>

        <Card title="Merchant detail" eyebrow="Catalogue">
          <InfoRow label="Recent purchases" value={String(selected.recentPurchases)} />
          <InfoRow label="Views" value={String(selected.views)} />
          <InfoRow label="Available chains" value={selected.chains.join(', ') || 'Not listed'} />
        </Card>

        <Card title="Order summary" eyebrow="Checkout">
          <CheckoutAmountSelector
            amount={amount}
            amounts={selected.availableAmounts}
            onSelectAmount={onSelectAmount}
          />
          <View style={styles.summaryBlock}>
            <SummaryRow label="Giftcard value" value={`$${amount} ${selected.currency}`} />
            <SummaryRow label="Recipient" value={receiverAddress ? shortenAddress(receiverAddress) : 'Connect wallet'} />
            <SummaryRow label="Settlement" value={selected.chains.join(', ') || 'Arbitrum'} />
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${amount}</Text>
          </View>
        </Card>

        <Card title="Payment method" eyebrow="Universal account">
          <View style={styles.paymentMethod}>
            <View style={styles.paymentIcon}>
              <Text style={styles.paymentIconText}>UA</Text>
            </View>
            <View style={styles.paymentCopy}>
              <Text style={styles.paymentTitle}>Universal balance</Text>
              <Text style={styles.muted}>Pays with supported USDC, USDT, ETH, SOL, or routed primary assets.</Text>
            </View>
          </View>
        </Card>

        <Card title="Mint configuration" eyebrow="Prepared next">
          <InfoRow label="Gateway" value="Mogate checkout backend" />
          <InfoRow label="Reserved gas" value="Prepared in mint checkout" />
          <InfoRow label="Funded type" value="Giftcard NFT" />
          <Button
            disabled={!amount}
            onPress={() => {
              if (!amount) return;
              onCheckout(selected, amount);
            }}
            variant="primary"
          >
            Continue to checkout
          </Button>
        </Card>
      </ScrollView>
    );
  }
  */

  return (
    <View style={styles.screen}>
      <View style={styles.fixedHeader}>
        <CatalogueHeader
          accountName={accountName}
          avatarLabel={avatarLabel}
          onOpenAccount={onOpenAccount}
        />
        <CatalogueFilters
          country={country}
          onCountryChange={onCountryChange}
          onQueryChange={onQueryChange}
          query={query}
        />

        {lastError ? (
          <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
            <View style={styles.errorContent}>
              <CircleAlert color="#c43d45" size={18} />
              <View style={styles.errorCopy}>
                <Typography weight="semibold">Catalogue unavailable</Typography>
                <Typography color="muted" type="body-xs">
                  {lastError}
                </Typography>
              </View>
              <Button accessibilityLabel="Retry catalogue" onPress={onRetry} size="sm" variant="ghost">
                <RotateCw color="#c43d45" size={16} />
              </Button>
            </View>
          </Surface>
        ) : null}

        <Typography color="muted" type="body-xs">
          {loading ? 'Loading catalogue' : `${merchants.length} of ${totalCount} merchants`}
        </Typography>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onMomentumScrollEnd={({ nativeEvent }) => {
          const nearBottom =
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 96;
          if (nearBottom && canLoadMore) onLoadMore();
        }}
        onScrollEndDrag={({ nativeEvent }) => {
          const nearBottom =
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >= nativeEvent.contentSize.height - 96;
          if (nearBottom && canLoadMore) onLoadMore();
        }}
      >
        {loading && merchants.length === 0 ? (
          <Surface className="gap-2 rounded-lg border border-border bg-surface p-3 shadow-none">
            <Skeleton className="h-[68px] w-full rounded-md" />
            <Skeleton className="h-[68px] w-full rounded-md" />
            <Skeleton className="h-[68px] w-full rounded-md" />
          </Surface>
        ) : merchants.length > 0 ? (
          <View style={styles.catalogueList}>
            {merchants.map((merchant) => (
              <CatalogueItem
                key={merchant.id}
                merchant={merchant}
                onPress={() => onSelectMerchant(merchant)}
              />
            ))}
          </View>
        ) : (
          <Card className="rounded-lg border border-border bg-surface p-4 shadow-none">
            <Typography weight="semibold">No giftcards found</Typography>
            <Typography color="muted" type="body-sm">
              Try another search or region.
            </Typography>
          </Card>
        )}

        {canLoadMore ? (
          <Button className="rounded-lg" onPress={onLoadMore} variant="secondary">
            <Button.Label>Load more</Button.Label>
          </Button>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    alignSelf: 'stretch',
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    width: '100%'
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 96
  },
  catalogueList: {
    alignSelf: 'stretch',
    gap: 12,
    width: '100%'
  },
  fixedHeader: {
    alignSelf: 'stretch',
    backgroundColor: '#f5f5f5',
    gap: 10,
    paddingBottom: 12,
    paddingTop: 4,
    width: '100%',
    zIndex: 5
  },
  screenHeader: {
    gap: 2,
    paddingTop: 2
  },
  screenTitle: {
    color: '#171512',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 0
  },
  screenSubtitle: {
    color: '#8b857d',
    fontSize: 15,
    lineHeight: 21
  },
  searchPanel: {
    gap: 12
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
  logoFrame: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderColor: '#dedee0',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48
  },
  logoFrameRemote: {
    backgroundColor: '#f4f4f5',
    borderColor: '#dedee0'
  },
  logoFrameBrand: {
    backgroundColor: '#e9680c',
    borderColor: '#e9680c'
  },
  logoFrameLarge: {
    height: 56,
    width: 56
  },
  logoImage: {
    height: 38,
    width: 38
  },
  logoImageLarge: {
    height: 46,
    width: 46
  },
  logoFallback: {
    color: '#52525b',
    fontSize: 16,
    fontWeight: '900'
  },
  logoFallbackLarge: {
    fontSize: 20
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
  regionRail: {
    flexDirection: 'row',
    gap: 8
  },
  regionChip: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e3ddd3',
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  regionChipActive: {
    backgroundColor: '#171512',
    borderColor: '#171512'
  },
  regionText: {
    color: '#6f6860',
    fontSize: 12,
    fontWeight: '900'
  },
  regionTextActive: {
    color: '#ffffff'
  },
  muted: {
    color: '#6f6860',
    fontSize: 12,
    lineHeight: 17
  },
  rowCard: {
    alignItems: 'center',
    borderColor: '#e3ddd3',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 104,
    padding: 16
  },
  rowText: {
    flex: 1,
    gap: 2,
    minWidth: 0
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
  summaryBlock: {
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    gap: 10,
    paddingTop: 12
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  summaryLabel: {
    color: '#6f6860',
    flex: 1,
    fontSize: 13
  },
  summaryValue: {
    color: '#171512',
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'right'
  },
  totalRow: {
    alignItems: 'baseline',
    borderTopColor: '#eee8de',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12
  },
  totalLabel: {
    color: '#171512',
    fontSize: 15,
    fontWeight: '900'
  },
  totalValue: {
    color: '#171512',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0
  },
  paymentMethod: {
    alignItems: 'center',
    backgroundColor: '#fbfaf7',
    borderColor: '#e3ddd3',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12
  },
  paymentIcon: {
    alignItems: 'center',
    backgroundColor: '#171512',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  paymentIconText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900'
  },
  paymentCopy: {
    flex: 1,
    gap: 3
  },
  paymentTitle: {
    color: '#171512',
    fontSize: 15,
    fontWeight: '900'
  },
  error: {
    color: '#a3372d',
    fontSize: 13,
    lineHeight: 18
  },
  errorBox: {
    backgroundColor: '#fff0ee',
    borderColor: '#f1b5ad',
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    padding: 10
  },
  errorTitle: {
    color: '#a3372d',
    fontSize: 14,
    fontWeight: '900'
  },
  errorContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  errorCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  sheetContent: {
    flex: 1,
    gap: 18,
    paddingBottom: 4,
    paddingHorizontal: 18,
    paddingTop: 4
  },
  sheetField: {
    gap: 8
  },
  sheetFooter: {
    marginTop: 'auto',
    paddingTop: 4
  }
});
