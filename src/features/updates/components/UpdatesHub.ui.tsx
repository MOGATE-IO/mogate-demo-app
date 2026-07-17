import { LinearGradient } from 'expo-linear-gradient';
import { Button, Chip, Separator, Surface, Typography } from 'heroui-native';
import {
  ArrowRight,
  Gift,
  Megaphone,
  Newspaper,
  Plus,
  ReceiptText,
  TicketCheck,
  type LucideIcon
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';
import type { MogateNewsItem } from '@/features/updates/services/mockUpdates';

export type UpdatesHubProps = {
  featured: GiftcardMerchant | null;
  news: MogateNewsItem[];
  recentTransactionLabel: string | null;
  onBrowsePromotion: () => void;
};

export function UpdatesHub({
  featured,
  news,
  onBrowsePromotion,
  recentTransactionLabel
}: UpdatesHubProps) {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.scrollContent}
      header={<View style={styles.header}>
        <Typography.Heading type="h2">Updates</Typography.Heading>
        <Typography color="muted">News, activity, raffles, and Mogate releases.</Typography>
      </View>}
    >

      <LinearGradient
        colors={featured?.heroColor ?? ['#fff0e5', '#ffd6c0', '#eadcff']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.promotion}
      >
        <View style={styles.promotionIcon}>
          <Megaphone color="#e9680c" size={22} />
        </View>
        <View style={styles.promotionCopy}>
          <Typography color="muted" type="body-xs" weight="semibold">Featured promotion</Typography>
          <Typography.Heading numberOfLines={2} type="h4">
            {featured ? `${featured.name} giftcards are available` : 'New giftcard offers are coming'}
          </Typography.Heading>
          <Typography color="muted" numberOfLines={2} type="body-sm">
            {featured?.description || 'Offers and regional launches will appear here.'}
          </Typography>
        </View>
        <Button
          accessibilityLabel="Browse featured giftcards"
          className="h-11 w-11 rounded-lg"
          isIconOnly
          onPress={onBrowsePromotion}
          variant="primary"
        >
          <ArrowRight color="#ffffff" size={19} />
        </Button>
      </LinearGradient>

      <View style={styles.section}>
        <Typography.Heading type="h5">Latest from Mogate</Typography.Heading>
        <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
          {news.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <Separator /> : null}
              <NewsRow item={item} />
            </View>
          ))}
        </Surface>
      </View>

      <View style={styles.section}>
        <Typography.Heading type="h5">Activity</Typography.Heading>
        <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
          <UpdateRow
            detail={recentTransactionLabel ?? 'Completed payments and mints will appear here.'}
            Icon={ReceiptText}
            label="Recent transactions"
            status={recentTransactionLabel ? 'Latest' : 'Empty'}
          />
          <Separator />
          <UpdateRow detail="Product announcements and network information." Icon={Newspaper} label="News & info" status="Soon" />
          <Separator />
          <UpdateRow detail="Upcoming draws and reward eligibility." Icon={TicketCheck} label="Raffles" status="Soon" />
        </Surface>
      </View>

      <View style={styles.section}>
        <Typography.Heading type="h5">Create</Typography.Heading>
        <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
          <UpdateRow detail="Issue a personal or merchant giftcard." Icon={Plus} label="Create giftcard" status="Planned" />
          <Separator />
          <UpdateRow detail="Track campaigns and giftcard deliveries." Icon={Gift} label="Promotions" status="Soon" />
        </Surface>
      </View>
    </FixedHeaderScrollView>
  );
}

function NewsRow({ item }: { item: MogateNewsItem }) {
  return (
    <View style={styles.newsRow}>
      <View style={styles.newsMark}>
        <Newspaper color="#d95f14" size={19} />
      </View>
      <View style={styles.newsCopy}>
        <View style={styles.newsTitleRow}>
          <Typography numberOfLines={1} style={styles.newsTitle} type="body-sm" weight="semibold">
            {item.title}
          </Typography>
          <Typography color="muted" type="body-xs">{item.dateLabel}</Typography>
        </View>
        <Typography color="muted" numberOfLines={2} type="body-xs">{item.summary}</Typography>
        <Chip color={item.status === 'Live' ? 'success' : 'accent'} size="sm" variant="soft">
          <Chip.Label>{item.status}</Chip.Label>
        </Chip>
      </View>
    </View>
  );
}

function UpdateRow({
  detail,
  Icon,
  label,
  status
}: {
  detail: string;
  Icon: LucideIcon;
  label: string;
  status: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Icon color="#52525b" size={19} />
      </View>
      <View style={styles.rowCopy}>
        <Typography type="body-sm" weight="semibold">{label}</Typography>
        <Typography color="muted" numberOfLines={2} type="body-xs">{detail}</Typography>
      </View>
      <Chip color="default" size="sm" variant="soft">
        <Chip.Label>{status}</Chip.Label>
      </Chip>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 3,
    paddingTop: 4
  },
  scrollContent: {
    gap: 20,
    paddingBottom: 96
  },
  promotion: {
    alignItems: 'center',
    borderColor: 'rgba(113,113,122,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 156,
    padding: 16
  },
  promotionIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.76)',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  promotionCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  section: {
    gap: 10
  },
  newsRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    minHeight: 94,
    paddingHorizontal: 2,
    paddingVertical: 12
  },
  newsMark: {
    alignItems: 'center',
    backgroundColor: '#fff0e7',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  newsCopy: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  newsTitleRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: 8
  },
  newsTitle: {
    flex: 1
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 68,
    paddingHorizontal: 2,
    paddingVertical: 8
  },
  rowIcon: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  rowCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  }
});
