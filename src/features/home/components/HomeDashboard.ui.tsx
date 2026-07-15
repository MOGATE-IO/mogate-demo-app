import type { ComponentType } from 'react';
import {
  Avatar,
  Button,
  Card,
  Chip,
  Separator,
  Skeleton,
  Surface,
  Typography
} from 'heroui-native';
import {
  ChevronRight,
  CircleAlert,
  Plus,
  QrCode,
  ShoppingBag,
  WalletCards,
  type LucideIcon
} from 'lucide-react-native';
import { Image, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import ArbitrumLogo from '../../../../assets/svg/arbitrum-arb-logo.svg';
import EthereumLogo from '../../../../assets/svg/ethereum-eth-logo.svg';
import MogateLogo from '../../../../assets/svg/mogate-text-white.svg';
import UsdcLogo from '../../../../assets/svg/usdc.svg';
import UsdtLogo from '../../../../assets/svg/usdt.svg';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';
import { getAccountAvatarLabel } from '@/features/profile/utils/accountDisplay';

type AssetSymbol = 'USDC' | 'USDT' | 'ETH';

export type HomeDashboardProps = {
  accountName: string;
  ownerAddress: string;
  assetTotals: Array<{ symbol: AssetSymbol; value: string }>;
  balanceTotal: string;
  balanceLoading?: boolean;
  walletError?: string | null;
  catalogueError?: string | null;
  catalogueLoading: boolean;
  catalogueItems: GiftcardMerchant[];
  trending: GiftcardMerchant[];
  giftcardsOwned: number;
  giftcardValueDisplay: string;
  loginMethod?: string | null;
  environmentLabel: string;
  networkLabel: string;
  onBrowse: () => void;
  onTopUp: () => void;
  onCheckout: (merchant: GiftcardMerchant, amount: number) => void;
};

const ASSET_META: Record<
  AssetSymbol,
  { Logo: ComponentType<SvgProps>; description: string }
> = {
  USDC: { Logo: UsdcLogo, description: 'USD Coin' },
  USDT: { Logo: UsdtLogo, description: 'Tether USD' },
  ETH: { Logo: EthereumLogo, description: 'Network gas' }
};

function compactNumber(value: number) {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0
  }).format(value);
}

function compactAddress(value: string) {
  if (!value) return 'Wallet unavailable';
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function providerName(loginMethod?: string | null) {
  if (!loginMethod) return null;
  if (loginMethod.includes('google')) return 'Google';
  if (loginMethod.includes('twitter')) return 'X';
  if (loginMethod.includes('apple')) return 'Apple';
  if (loginMethod.includes('email')) return 'Email';
  return null;
}

export function HomeDashboard({
  accountName,
  assetTotals,
  balanceLoading,
  balanceTotal,
  catalogueError,
  catalogueItems,
  catalogueLoading,
  environmentLabel,
  giftcardValueDisplay,
  giftcardsOwned,
  loginMethod,
  networkLabel,
  onBrowse,
  onCheckout,
  onTopUp,
  ownerAddress,
  trending,
  walletError
}: HomeDashboardProps) {
  const totalPurchases = catalogueItems.reduce((sum, item) => sum + item.recentPurchases, 0);
  const totalViews = catalogueItems.reduce((sum, item) => sum + item.views, 0);
  const greeting = accountName.includes('@') ? accountName.split('@')[0] : accountName;
  const loginProvider = providerName(loginMethod);

  return (
    <View style={styles.stack}>
      <View style={styles.brandHeader}>
        <View style={styles.logoBadge}>
          <MogateLogo height={28} width={104} />
        </View>
        <Chip color="accent" size="sm" variant="soft">
          <Chip.Label>{environmentLabel}</Chip.Label>
        </Chip>
      </View>

      <View style={styles.accountRow}>
        <Avatar alt={`${greeting} profile`} color="default" size="md" variant="soft">
          <Avatar.Fallback>{getAccountAvatarLabel(accountName)}</Avatar.Fallback>
        </Avatar>
        <View style={styles.accountCopy}>
          <Typography color="muted" type="body-xs">
            Welcome back
          </Typography>
          <Typography.Heading numberOfLines={1} type="h4">
            {greeting}
          </Typography.Heading>
        </View>
        {loginProvider ? (
          <Typography color="muted" type="body-xs" weight="medium">
            {loginProvider}
          </Typography>
        ) : null}
      </View>

      <View style={styles.balanceSection}>
        <View style={styles.balanceTopRow}>
          <View style={styles.balanceCopy}>
            <Typography color="muted" type="body-sm" weight="medium">
              Available balance
            </Typography>
            {balanceLoading ? (
              <Skeleton className="h-11 w-48 rounded-md" />
            ) : (
              <Typography style={styles.balanceTotal} weight="bold">
                {balanceTotal}
              </Typography>
            )}
          </View>
          <Button
            accessibilityLabel="Top up wallet"
            className="rounded-lg"
            isDisabled={!ownerAddress}
            onPress={onTopUp}
            size="sm"
            variant="primary"
          >
            <Plus color="#ffffff" size={17} strokeWidth={2.5} />
            <Button.Label>Top up</Button.Label>
          </Button>
        </View>
        <View style={styles.balanceMeta}>
          {networkLabel.toLowerCase().includes('arbitrum') ? (
            <ArbitrumLogo height={18} width={18} />
          ) : (
            <EthereumLogo height={18} width={18} />
          )}
          <Typography color="muted" type="body-xs">
            {networkLabel} / {compactAddress(ownerAddress)}
          </Typography>
        </View>
      </View>

      {walletError ? (
        <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
          <View style={styles.inlineMessage}>
            <CircleAlert color="#c43d45" size={18} />
            <Typography style={styles.messageText} type="body-sm">
              {walletError}
            </Typography>
          </View>
        </Surface>
      ) : null}

      <SectionHeader title="Balances" />
      <Surface className="rounded-lg border border-border bg-surface shadow-none" style={styles.assetSurface}>
        {assetTotals.map((asset, index) => (
          <View key={asset.symbol}>
            {index > 0 ? <Separator /> : null}
            <AssetRow asset={asset} loading={Boolean(balanceLoading)} />
          </View>
        ))}
      </Surface>

      <View style={styles.actionRail}>
        <QuickAction Icon={Plus} label="Top up" onPress={onTopUp} primary />
        <QuickAction Icon={ShoppingBag} label="Browse" onPress={onBrowse} />
        <QuickAction Icon={QrCode} label="Receive" onPress={onTopUp} />
      </View>

      <View style={styles.metricsStrip}>
        <Metric label="Purchases" value={compactNumber(totalPurchases)} />
        <Separator orientation="vertical" style={styles.metricSeparator} />
        <Metric label="Catalogue views" value={compactNumber(totalViews)} />
      </View>

      <View style={styles.sectionHeaderRow}>
        <SectionHeader title="Your giftcards" />
        <Button className="rounded-lg px-2" onPress={onBrowse} size="sm" variant="ghost">
          <Button.Label>View all</Button.Label>
          <ChevronRight color="#71717a" size={16} />
        </Button>
      </View>
      <Card className="rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.portfolioRow}>
          <View style={styles.portfolioIcon}>
            <WalletCards color="#e9680c" size={22} />
          </View>
          <View style={styles.portfolioCopy}>
            <Typography weight="semibold">{giftcardsOwned} owned</Typography>
            <Typography color="muted" type="body-xs">
              Ready to view in your inventory
            </Typography>
          </View>
          <View style={styles.portfolioValue}>
            <Typography weight="bold">{giftcardValueDisplay}</Typography>
            <Typography color="muted" type="body-xs">
              Est. value
            </Typography>
          </View>
        </View>
      </Card>

      <SectionHeader title="Trending giftcards" />
      {catalogueError ? (
        <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
          <View style={styles.inlineMessage}>
            <CircleAlert color="#c43d45" size={18} />
            <Typography style={styles.messageText} type="body-sm">
              {catalogueError}
            </Typography>
          </View>
        </Surface>
      ) : null}
      {catalogueLoading ? (
        <Surface className="gap-3 rounded-lg border border-border bg-surface p-3 shadow-none">
          <Skeleton className="h-14 w-full rounded-md" />
          <Skeleton className="h-14 w-full rounded-md" />
        </Surface>
      ) : trending.length > 0 ? (
        <Surface className="rounded-lg border border-border bg-surface shadow-none" style={styles.trendingSurface}>
          {trending.map((merchant, index) => (
            <View key={merchant.id}>
              {index > 0 ? <Separator /> : null}
              <MerchantRow merchant={merchant} onPress={() => onCheckout(merchant, merchant.availableAmounts[0])} />
            </View>
          ))}
        </Surface>
      ) : !catalogueError ? (
        <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
          <Typography weight="semibold">No giftcards yet</Typography>
          <Typography color="muted" type="body-sm">
            Browse the catalogue to find the first available merchant.
          </Typography>
        </Surface>
      ) : null}
    </View>
  );
}

function AssetRow({
  asset,
  loading
}: {
  asset: { symbol: AssetSymbol; value: string };
  loading: boolean;
}) {
  const { Logo, description } = ASSET_META[asset.symbol];

  return (
    <View style={styles.assetRow}>
      <Logo height={32} width={32} />
      <View style={styles.assetCopy}>
        <Typography weight="semibold">{asset.symbol}</Typography>
        <Typography color="muted" type="body-xs">
          {description}
        </Typography>
      </View>
      {loading ? (
        <Skeleton className="h-6 w-16 rounded-sm" />
      ) : (
        <Typography style={styles.assetValue} weight="semibold">
          {asset.value}
        </Typography>
      )}
    </View>
  );
}

function QuickAction({
  Icon,
  label,
  onPress,
  primary = false
}: {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <View style={styles.actionItem}>
      <Button
        accessibilityLabel={label}
        className="h-12 w-12 rounded-lg"
        isIconOnly
        onPress={onPress}
        variant={primary ? 'primary' : 'secondary'}
      >
        <Icon color={primary ? '#ffffff' : '#18181b'} size={20} strokeWidth={2.2} />
      </Button>
      <Typography align="center" type="body-xs" weight="medium">
        {label}
      </Typography>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Typography style={styles.metricValue} weight="bold">
        {value}
      </Typography>
      <Typography color="muted" type="body-xs">
        {label}
      </Typography>
    </View>
  );
}

function MerchantRow({ merchant, onPress }: { merchant: GiftcardMerchant; onPress: () => void }) {
  const startingAmount = merchant.availableAmounts[0];

  return (
    <Button
      accessibilityLabel={`Buy ${merchant.name} giftcard from ${startingAmount} ${merchant.currency}`}
      className="h-auto min-h-16 w-full justify-start rounded-lg px-3 py-2"
      onPress={onPress}
      variant="ghost"
    >
      {merchant.imageUrl ? (
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="contain"
          source={{ uri: merchant.imageUrl }}
          style={styles.merchantLogo}
        />
      ) : (
        <View style={styles.merchantFallback}>
          <Typography weight="bold">{merchant.name.slice(0, 1).toUpperCase()}</Typography>
        </View>
      )}
      <View style={styles.merchantCopy}>
        <Typography numberOfLines={1} weight="semibold">
          {merchant.name}
        </Typography>
        <Typography color="muted" numberOfLines={1} type="body-xs">
          {merchant.category} / From {startingAmount} {merchant.currency}
        </Typography>
      </View>
      <ChevronRight color="#71717a" size={18} />
    </Button>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Typography.Heading type="h5" weight="semibold">
      {title}
    </Typography.Heading>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 16
  },
  brandHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40
  },
  logoBadge: {
    alignItems: 'center',
    backgroundColor: '#e9680c',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 124
  },
  accountRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  accountCopy: {
    flex: 1,
    gap: 2
  },
  balanceSection: {
    gap: 10,
    paddingBottom: 4,
    paddingTop: 2
  },
  balanceTopRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  balanceCopy: {
    flex: 1,
    gap: 6
  },
  balanceTotal: {
    color: '#18181b',
    fontSize: 40,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0,
    lineHeight: 44
  },
  balanceMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  inlineMessage: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8
  },
  messageText: {
    color: '#8f2930',
    flex: 1
  },
  assetSurface: {
    overflow: 'hidden',
    paddingHorizontal: 12
  },
  assetRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 11,
    minHeight: 62,
    paddingVertical: 10
  },
  assetCopy: {
    flex: 1,
    gap: 2
  },
  assetValue: {
    fontVariant: ['tabular-nums']
  },
  actionRail: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-around',
    paddingVertical: 2
  },
  actionItem: {
    alignItems: 'center',
    flex: 1,
    gap: 7
  },
  metricsStrip: {
    alignItems: 'stretch',
    flexDirection: 'row',
    minHeight: 64,
    paddingVertical: 4
  },
  metric: {
    flex: 1,
    gap: 3,
    justifyContent: 'center'
  },
  metricValue: {
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    lineHeight: 26
  },
  metricSeparator: {
    marginHorizontal: 18
  },
  sectionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -8
  },
  portfolioRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  portfolioIcon: {
    alignItems: 'center',
    backgroundColor: '#fff0e5',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  portfolioCopy: {
    flex: 1,
    gap: 2
  },
  portfolioValue: {
    alignItems: 'flex-end',
    gap: 2
  },
  trendingSurface: {
    overflow: 'hidden',
    paddingHorizontal: 4
  },
  merchantLogo: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    height: 44,
    width: 44
  },
  merchantFallback: {
    alignItems: 'center',
    backgroundColor: '#fff0e5',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  merchantCopy: {
    flex: 1,
    gap: 3
  }
});
