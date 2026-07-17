import { Button, Chip, Separator, Surface, Typography } from 'heroui-native';
import {
  ArrowUpRight,
  Coins,
  Eye,
  Fuel,
  KeyRound,
  LockKeyhole,
  QrCode,
  Send,
  type LucideIcon
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import { PageHeader } from '@/components/PageHeader.ui';
import { InventoryGiftcardItem } from '@/features/inventory/components/InventoryGiftcardItem.ui';
import {
  giftcardActionLabel,
  type GiftcardAction
} from '@/features/inventory/services/giftcardActions';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import { shortenAddress } from '@/utils/format';

export type GiftcardDetailViewProps = {
  item: GiftcardInventoryItem;
  actions: GiftcardAction[];
  onAction: (action: GiftcardAction) => void;
  onBack: () => void;
  onOpenExplorer: () => void | Promise<void>;
};

export function GiftcardDetailView({
  actions,
  item,
  onAction,
  onBack,
  onOpenExplorer
}: GiftcardDetailViewProps) {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.stack}
      header={<PageHeader
        backLabel="Back to inventory"
        onBack={onBack}
        subtitle={`NFT #${item.tokenId} / ${item.networkLabel}`}
        title={item.brandName}
      />}
    >

      <InventoryGiftcardItem item={item} />

      <View style={styles.section}>
        <Typography.Heading type="h5">Actions</Typography.Heading>
        <View style={styles.actionGrid}>
          {actions.map((action) => {
            const Icon = ACTION_ICONS[action];
            return (
              <Button
                accessibilityLabel={giftcardActionLabel(action)}
                className="h-12 rounded-lg"
                key={action}
                onPress={() => onAction(action)}
                style={styles.actionButton}
                variant="secondary"
              >
                <Icon color="#d95f14" size={18} />
                <Button.Label>{giftcardActionLabel(action)}</Button.Label>
              </Button>
            );
          })}
        </View>
      </View>

      {item.isFunded ? (
        <View style={styles.section}>
          <Typography.Heading type="h5">Onchain balances</Typography.Heading>
          <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
            {item.fundBalances.length > 0 ? item.fundBalances.map((balance, index) => (
              <View key={balance.token}>
                {index > 0 ? <Separator /> : null}
                <DetailRow
                  label={balance.symbol}
                  value={formatFundAmount(balance.amountDisplay, balance.symbol)}
                />
              </View>
            )) : (
              <DetailRow label="Value funds" value="No active balance" />
            )}
            <Separator />
            <View style={styles.reserveRow}>
              <View style={styles.reserveLabel}>
                <Fuel color="#2f8f5b" size={16} />
                <Typography color="muted" type="body-sm">Reserved gas</Typography>
              </View>
              <Typography type="body-sm" weight="semibold">
                {formatFundAmount(item.gasReserveDisplay ?? '0', 'ETH')}
              </Typography>
            </View>
          </Surface>
        </View>
      ) : null}

      <View style={styles.section}>
        <Typography.Heading type="h5">NFT details</Typography.Heading>
        <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
          <DetailRow label="Collection" value={shortenAddress(item.collection)} />
          <Separator />
          <DetailRow label="Region" value={item.region} />
          <Separator />
          <DetailRow label="Category" value={item.category} />
          <Separator />
          <DetailRow label="Discovery" value={item.discovery === 'enumerable' ? 'Collection index' : 'Transfer history'} />
        </Surface>
      </View>

      <View style={styles.section}>
        <Typography.Heading type="h5">Claim state</Typography.Heading>
        <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
          <View style={styles.claimRow}>
            <View style={styles.claimIcon}>
              {item.isFunded ? (
                <Coins color="#2f8f5b" size={20} />
              ) : item.isEncrypted ? (
                <LockKeyhole color="#2f8f5b" size={20} />
              ) : (
                <KeyRound color="#e9680c" size={20} />
              )}
            </View>
            <View style={styles.claimCopy}>
              <Typography type="body-sm" weight="semibold">
                {item.isFunded ? 'Onchain funded' : item.isEncrypted ? 'Encrypted claim' : 'Public claim'}
              </Typography>
              <Typography color="muted" type="body-xs">
                {item.isUnwrapped
                  ? 'This giftcard has been unwrapped and cannot be transferred.'
                  : item.isFunded
                    ? 'The NFT controls the balances shown above.'
                    : 'Available actions open as separate protected screens.'}
              </Typography>
            </View>
            <Chip color={item.isUnwrapped ? 'default' : 'success'} size="sm" variant="soft">
              <Chip.Label>{item.isUnwrapped ? 'Unwrapped' : 'Ready'}</Chip.Label>
            </Chip>
          </View>
        </Surface>
      </View>

      <Button className="w-full rounded-lg" onPress={onOpenExplorer} variant="secondary">
        <Button.Label>Open network record</Button.Label>
        <ArrowUpRight color="#18181b" size={18} />
      </Button>
    </FixedHeaderScrollView>
  );
}

const ACTION_ICONS: Record<GiftcardAction, LucideIcon> = {
  view: Eye,
  send: Send,
  claim: KeyRound,
  'payment-code': QrCode
};

function formatFundAmount(value: string, symbol: string) {
  const [whole, fraction = ''] = value.split('.');
  const compactFraction = fraction.slice(0, 6).replace(/0+$/, '');
  return `${compactFraction ? `${whole}.${compactFraction}` : whole} ${symbol}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Typography color="muted" type="body-sm">{label}</Typography>
      <Typography numberOfLines={1} style={styles.detailValue} type="body-sm" weight="semibold">
        {value}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 20
  },
  section: {
    gap: 10
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  actionButton: {
    flexBasis: '47%',
    flexGrow: 1
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 2
  },
  detailValue: {
    flex: 1,
    textAlign: 'right'
  },
  reserveRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 50,
    paddingHorizontal: 2
  },
  reserveLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  claimRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  claimIcon: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  claimCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  }
});
