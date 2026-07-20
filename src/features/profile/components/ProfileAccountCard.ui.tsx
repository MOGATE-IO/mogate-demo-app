import { LinearGradient } from 'expo-linear-gradient';
import { Avatar, Button, Chip, Separator, Typography } from 'heroui-native';
import { ArrowUpRight, Plus } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { getAccountAvatarLabel } from '@/features/profile/utils/accountDisplay';

export function ProfileAccountCard({
  accountName,
  giftcardCount,
  giftcardValue,
  loginProvider,
  networkLabel,
  onTransfer,
  onTopUp,
  stablecoinBalance
}: {
  accountName: string;
  giftcardCount: number;
  giftcardValue: string;
  loginProvider: string | null;
  networkLabel: string;
  onTransfer: () => void;
  onTopUp: () => void | Promise<void>;
  stablecoinBalance: string;
}) {
  return (
    <LinearGradient
      colors={['#ffffff', '#fff3ec', '#f8d9e7', '#dce9ff']}
      end={{ x: 1, y: 1 }}
      locations={[0, 0.32, 0.68, 1]}
      start={{ x: 0, y: 0 }}
      style={styles.card}
    >
      <View style={styles.identityRow}>
        <Avatar alt={`${accountName} profile`} color="default" size="lg" variant="soft">
          <Avatar.Fallback>{getAccountAvatarLabel(accountName)}</Avatar.Fallback>
        </Avatar>
        <View style={styles.identityCopy}>
          <Typography.Heading numberOfLines={1} type="h4">{accountName}</Typography.Heading>
          <Typography color="muted" numberOfLines={1} type="body-xs">{networkLabel}</Typography>
        </View>
        {loginProvider ? (
          <Chip color="accent" size="sm" variant="soft">
            <Chip.Label>{loginProvider.toUpperCase()}</Chip.Label>
          </Chip>
        ) : null}
      </View>

      <View style={styles.balanceRow}>
        <View style={styles.balanceCopy}>
          <Typography color="muted" type="body-xs" weight="semibold">Available balance</Typography>
          <Typography style={styles.balanceValue} weight="bold">{stablecoinBalance}</Typography>
        </View>
        <View style={styles.balanceActions}>
          <Button className="rounded-lg bg-white" onPress={onTransfer} size="sm" variant="secondary">
            <ArrowUpRight color="#d95f14" size={17} strokeWidth={2.4} />
            <Button.Label className="font-semibold text-accent">Transfer</Button.Label>
          </Button>
          <Button className="rounded-lg bg-white" onPress={onTopUp} size="sm" variant="secondary">
            <Plus color="#d95f14" size={17} strokeWidth={2.4} />
            <Button.Label className="font-semibold text-accent">Top up</Button.Label>
          </Button>
        </View>
      </View>

      <View style={styles.whiteBand}>
        <View style={styles.metric}>
          <Typography weight="bold">{giftcardCount}</Typography>
          <Typography color="muted" type="body-xs">Giftcards</Typography>
        </View>
        <Separator orientation="vertical" style={styles.divider} />
        <View style={styles.metric}>
          <Typography weight="bold">{giftcardValue}</Typography>
          <Typography color="muted" type="body-xs">Est Card Value</Typography>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: 'rgba(113,113,122,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 18,
    overflow: 'hidden',
    padding: 16
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  identityCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  balanceRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  balanceCopy: {
    flex: 1,
    gap: 4,
    minWidth: 0
  },
  balanceActions: {
    alignItems: 'stretch',
    gap: 6
  },
  balanceValue: {
    color: '#241a18',
    fontSize: 36,
    fontVariant: ['tabular-nums'],
    lineHeight: 40
  },
  whiteBand: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.88)',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    padding: 12
  },
  divider: {
    height: 38
  },
  metric: {
    alignItems: 'center',
    flex: 1,
    gap: 2
  }
});
