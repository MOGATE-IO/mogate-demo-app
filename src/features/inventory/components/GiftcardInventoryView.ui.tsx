import {
  Button,
  Separator,
  Skeleton,
  Surface,
  Typography
} from 'heroui-native';
import {
  CircleAlert,
  Gift,
  RefreshCw,
  WalletCards
} from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import { formatUsdAmount } from '@/features/checkout/services/paymentBalances';
import { InventoryGiftcardItem } from '@/features/inventory/components/InventoryGiftcardItem.ui';
import type { GiftcardInventoryState } from '@/features/inventory/hooks/useGiftcardInventory';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';

export function GiftcardInventoryView({
  inventory,
  onBrowse,
  onOpenDetails,
  profile
}: {
  inventory: GiftcardInventoryState;
  onBrowse: () => void;
  onOpenDetails: (item: GiftcardInventoryItem) => void;
  profile: RuntimeNetworkProfile;
}) {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.scrollContent}
      header={<View style={styles.header}>
        <View style={styles.headerCopy}>
          <Typography.Heading type="h2">Inventory</Typography.Heading>
          <Typography color="muted">Giftcards owned by your connected wallet.</Typography>
        </View>
        <Button
          accessibilityLabel="Refresh giftcard inventory"
          className="h-11 w-11 rounded-lg"
          isIconOnly
          onPress={inventory.refresh}
          variant="secondary"
        >
          {inventory.status === 'loading' ? (
            <ActivityIndicator color="#18181b" size="small" />
          ) : (
            <RefreshCw color="#18181b" size={19} />
          )}
        </Button>
      </View>}
    >

      <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.portfolioRow}>
          <View style={styles.portfolioIcon}>
            <WalletCards color="#e9680c" size={23} />
          </View>
          <View style={styles.portfolioMetric}>
            <Typography.Heading type="h4">{inventory.items.length}</Typography.Heading>
            <Typography color="muted" type="body-xs">Owned cards</Typography>
          </View>
          <Separator orientation="vertical" style={styles.metricDivider} />
          <View style={[styles.portfolioMetric, styles.valueMetric]}>
            <Typography.Heading type="h4">{formatUsdAmount(inventory.totalValue)}</Typography.Heading>
            <Typography color="muted" type="body-xs">Estimated value</Typography>
          </View>
        </View>
      </Surface>

      {inventory.lastError ? (
        <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
          <View style={styles.messageRow}>
            <CircleAlert color="#c43d45" size={18} />
            <Typography style={styles.errorText} type="body-sm">{inventory.lastError}</Typography>
          </View>
        </Surface>
      ) : null}

      {inventory.status === 'loading' && inventory.items.length === 0 ? (
        <InventorySkeleton />
      ) : inventory.items.length > 0 ? (
        <View style={styles.cardList}>
          {inventory.items.map((item) => (
            <InventoryGiftcardItem item={item} key={item.id} onPress={() => onOpenDetails(item)} />
          ))}
        </View>
      ) : inventory.status !== 'error' ? (
        <Surface className="items-center gap-4 rounded-lg border border-border bg-surface p-6 shadow-none">
          <View style={styles.emptyIcon}>
            <Gift color="#e9680c" size={28} />
          </View>
          <View style={styles.emptyCopy}>
            <Typography.Heading style={styles.centerText} type="h4">No giftcards found</Typography.Heading>
            <Typography color="muted" style={styles.centerText} type="body-sm">
              Cards minted to this wallet on {profile.ua.chainLabel} will appear here.
            </Typography>
          </View>
          <Button className="rounded-lg" onPress={onBrowse} variant="primary">
            <Button.Label>Browse giftcards</Button.Label>
          </Button>
        </Surface>
      ) : null}
    </FixedHeaderScrollView>
  );
}

function InventorySkeleton() {
  return (
    <View style={styles.cardList}>
      <Skeleton className="h-52 w-full rounded-lg" />
      <Skeleton className="h-52 w-full rounded-lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4
  },
  scrollContent: {
    gap: 14,
    paddingBottom: 96
  },
  headerCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  portfolioRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  portfolioIcon: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  portfolioMetric: {
    gap: 2
  },
  valueMetric: {
    alignItems: 'flex-end',
    flex: 1
  },
  metricDivider: {
    height: 38
  },
  messageRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8
  },
  errorText: {
    color: '#a12f37',
    flex: 1
  },
  cardList: {
    gap: 12
  },
  emptyIcon: {
    alignItems: 'center',
    backgroundColor: '#fff1e8',
    borderRadius: 8,
    height: 56,
    justifyContent: 'center',
    width: 56
  },
  emptyCopy: {
    gap: 5,
    maxWidth: 280
  },
  centerText: {
    textAlign: 'center'
  }
});
