import { Chip, Separator, Surface, Typography } from 'heroui-native';
import {
  Bell,
  BookOpenText,
  CircleHelp,
  LockKeyhole,
  Settings,
  ShieldCheck,
  type LucideIcon
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import { PageHeader } from '@/components/PageHeader.ui';
import { SegmentOption, SegmentedControl } from '@/components/SegmentedControl';
import type { AppNetworkMode } from '@/config/networkProfiles';
import { ACCOUNT_SECTIONS, type AccountSection } from '@/navigation/account';

const SECTION_ICON: Record<AccountSection, LucideIcon> = {
  notifications: Bell,
  'account-settings': Settings,
  security: ShieldCheck,
  settings: Settings,
  'mogate-care': CircleHelp,
  'terms-privacy': BookOpenText
};

const SECTION_ROWS: Record<AccountSection, string[]> = {
  notifications: ['Payment status', 'Giftcard delivery', 'Promotions and raffles'],
  'account-settings': ['Profile information', 'Connected login methods', 'Regional preferences'],
  security: ['Embedded wallet protection', 'Signing sessions', 'Connected devices'],
  settings: ['Network visibility', 'Language', 'Accessibility'],
  'mogate-care': ['Payment support', 'Giftcard support', 'Account recovery'],
  'terms-privacy': ['Terms of service', 'Privacy policy', 'Wallet disclosures']
};

const NETWORK_OPTIONS: SegmentOption<AppNetworkMode>[] = [
  { value: 'testnet', label: 'Testnet' },
  { value: 'mainnet', label: 'Mainnet' }
];

export function AccountSectionView({
  onBack,
  section,
  networkMode,
  onNetworkModeChange
}: {
  onBack: () => void;
  section: AccountSection;
  networkMode?: AppNetworkMode;
  onNetworkModeChange?: (mode: AppNetworkMode) => void;
}) {
  const metadata = ACCOUNT_SECTIONS[section];
  const Icon = SECTION_ICON[section];

  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.stack}
      header={<PageHeader backLabel="Back to account menu" onBack={onBack} title={metadata.title} />}
    >
      <View style={styles.lead}>
        <View style={styles.iconWell}>
          <Icon color="#e9680c" size={24} />
        </View>
        <Typography color="muted" type="body-sm">{metadata.description}</Typography>
      </View>

      <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
        {section === 'account-settings' && networkMode && onNetworkModeChange ? (
          <View style={styles.environment}>
            <View style={styles.environmentHeader}>
              <View style={styles.rowCopy}>
                <Typography style={styles.rowLabel} type="body-sm" weight="semibold">Network environment</Typography>
                <Typography color="muted" type="body-xs">{networkMode === 'mainnet' ? 'Mainnet' : 'Testnet'}</Typography>
              </View>
              <SegmentedControl
                value={networkMode}
                options={NETWORK_OPTIONS}
                onChange={onNetworkModeChange}
              />
            </View>
          </View>
        ) : null}
        {SECTION_ROWS[section].map((label, index) => (
          <View key={label}>
            {index > 0 || (section === 'account-settings' && networkMode && onNetworkModeChange) ? <Separator /> : null}
            <View style={styles.row}>
              <Typography style={styles.rowLabel} type="body-sm" weight="semibold">{label}</Typography>
              <Chip color="default" size="sm" variant="soft">
                <Chip.Label>Soon</Chip.Label>
              </Chip>
            </View>
          </View>
        ))}
      </Surface>

      <View style={styles.protection}>
        <LockKeyhole color="#2f8f5b" size={17} />
        <Typography color="muted" type="body-xs">Your wallet connection remains active on this screen.</Typography>
      </View>
    </FixedHeaderScrollView>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 20
  },
  lead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  iconWell: {
    alignItems: 'center',
    backgroundColor: '#fff0e5',
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 2,
    paddingVertical: 8
  },
  rowCopy: {
    flex: 1,
    gap: 3
  },
  rowLabel: {
    flex: 1
  },
  environment: {
    paddingHorizontal: 2,
    paddingVertical: 14
  },
  environmentHeader: {
    gap: 12
  },
  protection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4
  }
});
