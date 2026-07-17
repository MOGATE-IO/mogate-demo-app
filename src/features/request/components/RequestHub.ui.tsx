import { LinearGradient } from 'expo-linear-gradient';
import { Button, Surface, Typography } from 'heroui-native';
import { ArrowRight, HandCoins, QrCode, ScanLine, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import type { RequestTool } from '@/navigation/request';

const TOOLS: Array<{
  id: RequestTool;
  title: string;
  detail: string;
  Icon: LucideIcon;
}> = [
  { id: 'qr', title: 'My QR code', detail: 'Show your connected wallet code.', Icon: QrCode },
  { id: 'scan', title: 'Scan a code', detail: 'Open a Mogate or wallet payment code.', Icon: ScanLine },
  { id: 'payment', title: 'Request payment', detail: 'Create a USD request with an amount and memo.', Icon: HandCoins }
];

export function RequestHub({ onOpenTool }: { onOpenTool: (tool: RequestTool) => void }) {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.scrollContent}
      header={<View style={styles.header}>
        <Typography.Heading type="h2">Pay & receive</Typography.Heading>
        <Typography color="muted">Choose how you want to exchange payment details.</Typography>
      </View>}
    >

      <LinearGradient
        colors={['#ffffff', '#fff0e7', '#f7dbea', '#dce8ff']}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={styles.hero}
      >
        <View style={styles.heroIcon}>
          <HandCoins color="#d95f14" size={27} strokeWidth={2.2} />
        </View>
        <View style={styles.heroCopy}>
          <Typography.Heading type="h4">One place to pay and receive</Typography.Heading>
          <Typography color="muted" type="body-sm">
            Wallet QR, code scanner, and payment requests each open in their own secure screen.
          </Typography>
        </View>
      </LinearGradient>

      <Surface className="overflow-hidden rounded-lg border border-border bg-surface p-2 shadow-none">
        {TOOLS.map(({ detail, Icon, id, title }) => (
          <Button
            accessibilityLabel={title}
            className="h-auto min-h-[76px] w-full justify-start rounded-lg px-3 py-3"
            key={id}
            onPress={() => onOpenTool(id)}
            variant="ghost"
          >
            <View style={styles.toolIcon}>
              <Icon color="#d95f14" size={21} strokeWidth={2.1} />
            </View>
            <View style={styles.toolCopy}>
              <Typography type="body-sm" weight="semibold">{title}</Typography>
              <Typography color="muted" numberOfLines={2} type="body-xs">{detail}</Typography>
            </View>
            <ArrowRight color="#71717a" size={18} />
          </Button>
        ))}
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
    gap: 18,
    paddingBottom: 96
  },
  hero: {
    alignItems: 'center',
    borderColor: 'rgba(113,113,122,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    minHeight: 150,
    padding: 18
  },
  heroIcon: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    height: 54,
    justifyContent: 'center',
    width: 54
  },
  heroCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0
  },
  toolIcon: {
    alignItems: 'center',
    backgroundColor: '#fff0e7',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  toolCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  }
});
