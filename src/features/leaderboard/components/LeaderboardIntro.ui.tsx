import { LinearGradient } from 'expo-linear-gradient';
import { Chip, Separator, Surface, Typography } from 'heroui-native';
import { BadgeCheck, Gift, Medal, Trophy } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';

const STEPS = [
  { label: 'Buy giftcards', detail: 'Eligible purchases earn activity points.', Icon: Gift },
  { label: 'Build your score', detail: 'Campaigns and referrals add multipliers.', Icon: BadgeCheck },
  { label: 'Unlock rewards', detail: 'Top positions qualify for seasonal rewards.', Icon: Medal }
] as const;

export function LeaderboardIntro() {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.scrollContent}
      header={<View style={styles.header}>
        <Typography.Heading type="h2">Leaderboard</Typography.Heading>
        <Typography color="muted">How Mogate activity will become rewards.</Typography>
      </View>}
    >

      <LinearGradient
        colors={['#fff0e5', '#ffd9c7', '#e7ddff']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <View style={styles.trophyWell}>
          <Trophy color="#e9680c" size={28} />
        </View>
        <View style={styles.heroCopy}>
          <Chip color="accent" size="sm" variant="soft">
            <Chip.Label>Preview</Chip.Label>
          </Chip>
          <Typography.Heading type="h3">Every giftcard can move you up</Typography.Heading>
          <Typography color="muted" type="body-sm">
            The first season will rank eligible purchases, campaigns, and referrals.
          </Typography>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <Typography.Heading type="h5">How it works</Typography.Heading>
        <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
          {STEPS.map(({ detail, Icon, label }, index) => (
            <View key={label}>
              {index > 0 ? <Separator /> : null}
              <View style={styles.step}>
                <View style={styles.stepIndex}>
                  <Typography type="body-xs" weight="bold">{index + 1}</Typography>
                </View>
                <Icon color="#52525b" size={20} />
                <View style={styles.stepCopy}>
                  <Typography type="body-sm" weight="semibold">{label}</Typography>
                  <Typography color="muted" type="body-xs">{detail}</Typography>
                </View>
              </View>
            </View>
          ))}
        </Surface>
      </View>

      <Surface className="rounded-lg bg-default p-4 shadow-none" variant="transparent">
        <Typography type="body-sm" weight="semibold">Season zero is not active yet</Typography>
        <Typography color="muted" type="body-xs">Purchases are not currently scored.</Typography>
      </Surface>
    </FixedHeaderScrollView>
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
  hero: {
    alignItems: 'center',
    borderColor: 'rgba(113,113,122,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    minHeight: 178,
    padding: 18
  },
  trophyWell: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.78)',
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    width: 58
  },
  heroCopy: {
    alignItems: 'flex-start',
    flex: 1,
    gap: 7,
    minWidth: 0
  },
  section: {
    gap: 10
  },
  step: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    paddingHorizontal: 2,
    paddingVertical: 9
  },
  stepIndex: {
    alignItems: 'center',
    backgroundColor: '#fff0e5',
    borderRadius: 999,
    height: 28,
    justifyContent: 'center',
    width: 28
  },
  stepCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  }
});
