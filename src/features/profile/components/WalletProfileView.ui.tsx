import { useState, type ComponentType, type ReactNode } from 'react';
import {
  Accordion,
  Avatar,
  Button,
  Chip,
  Separator,
  Surface,
  Typography
} from 'heroui-native';
import {
  BookOpenText,
  ChevronRight,
  CircleHelp,
  Copy,
  LogOut,
  Settings,
  ShieldCheck,
  UserRoundCog,
  WalletCards
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import EthereumLogo from '../../../../assets/svg/ethereum-eth-logo.svg';
import SolanaLogo from '../../../../assets/svg/solana-sol-logo.svg';
import type { WalletProfileState } from '@/features/profile/hooks/useWalletProfile';
import { getAccountAvatarLabel } from '@/features/profile/utils/accountDisplay';

export type WalletProfileViewProps = {
  accountName: string;
  environmentLabel: string;
  giftcardCount: number;
  giftcardValue: string;
  loginMethod?: string | null;
  networkLabel: string;
  profileState: WalletProfileState;
  stablecoinBalance: string;
  onSettings: () => void;
  onLogout: () => void | Promise<void>;
};

export function WalletProfileView({
  accountName,
  environmentLabel,
  giftcardCount,
  giftcardValue,
  loginMethod,
  networkLabel,
  onLogout,
  onSettings,
  profileState,
  stablecoinBalance
}: WalletProfileViewProps) {
  const [walletOpen, setWalletOpen] = useState<string | undefined>('evm-wallet');
  const loginProvider = providerName(loginMethod);

  return (
    <View style={styles.stack}>
      <View style={styles.pageHeader}>
        <View style={styles.headerCopy}>
          <Typography.Heading type="h2">Profile</Typography.Heading>
          <Typography color="muted">Account, wallets, and security.</Typography>
        </View>
        <Button
          accessibilityLabel="Open account settings"
          className="h-11 w-11 rounded-lg"
          isIconOnly
          onPress={onSettings}
          variant="secondary"
        >
          <Settings color="#3f3f46" size={20} />
        </Button>
      </View>

      <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.identityRow}>
          <Avatar alt={`${accountName} profile`} color="default" size="lg" variant="soft">
            <Avatar.Fallback>{getAccountAvatarLabel(accountName)}</Avatar.Fallback>
          </Avatar>
          <View style={styles.identityCopy}>
            <Typography.Heading numberOfLines={1} type="h4">{accountName}</Typography.Heading>
            <Typography color="muted" type="body-sm">Personal account</Typography>
          </View>
          {loginProvider ? (
            <Chip color="accent" size="sm" variant="soft">
              <Chip.Label>{loginProvider}</Chip.Label>
            </Chip>
          ) : null}
        </View>
        <Separator style={styles.identitySeparator} />
        <View style={styles.profileMeta}>
          <View style={styles.metaRow}>
            <Typography color="muted" type="body-xs">Environment</Typography>
            <Chip color="default" size="sm" variant="soft">
              <Chip.Label>{environmentLabel}</Chip.Label>
            </Chip>
          </View>
          <View style={styles.metaRow}>
            <Typography color="muted" type="body-xs">Checkout route</Typography>
            <Typography type="body-sm" weight="semibold">{networkLabel}</Typography>
          </View>
        </View>
      </Surface>

      <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.sectionLead}>
          <View style={styles.iconWell}>
            <WalletCards color="#e9680c" size={21} />
          </View>
          <View style={styles.sectionLeadCopy}>
            <Typography.Heading type="h5">Portfolio</Typography.Heading>
            <Typography color="muted" type="body-xs">Connected account overview</Typography>
          </View>
        </View>
        <View style={styles.metrics}>
          <Metric label="USD balance" value={stablecoinBalance} />
          <Separator orientation="vertical" style={styles.metricSeparator} />
          <Metric label="Giftcards" value={String(giftcardCount)} />
          <Separator orientation="vertical" style={styles.metricSeparator} />
          <Metric label="Card value" value={giftcardValue} />
        </View>
      </Surface>

      <View style={styles.sectionStack}>
        <View style={styles.sectionHeading}>
          <Typography.Heading type="h5">Wallets</Typography.Heading>
          <Typography color="muted" type="body-xs">Tap a wallet to view its address.</Typography>
        </View>
        <Accordion
          className="rounded-lg"
          hideSeparator
          onValueChange={setWalletOpen}
          selectionMode="single"
          value={walletOpen}
          variant="surface"
        >
          <WalletAccordionItem
            address={profileState.ownerAddress}
            copied={profileState.copied === 'EVM wallet'}
            label="EVM wallet"
            networkLabel={networkLabel}
            onCopy={() => profileState.copyAddress('EVM wallet', profileState.ownerAddress)}
            value="evm-wallet"
          >
            <EthereumLogo height={24} width={24} />
          </WalletAccordionItem>
          <WalletAccordionItem
            address={profileState.solanaAddress}
            copied={profileState.copied === 'Solana wallet'}
            label="Solana wallet"
            networkLabel={profileState.solanaAddress ? 'Solana' : 'Not created'}
            onCopy={() => profileState.copyAddress('Solana wallet', profileState.solanaAddress)}
            value="solana-wallet"
          >
            <SolanaLogo height={23} width={25} />
          </WalletAccordionItem>
        </Accordion>
        {!profileState.solanaAddress ? (
          <Surface className="rounded-lg bg-warning-soft p-3 shadow-none" variant="transparent">
            <Typography style={styles.warningText} type="body-xs">
              {profileState.identityWarnings.find((warning) => warning.includes('Solana')) ||
                'The Solana embedded wallet has not been created for this account yet.'}
            </Typography>
          </Surface>
        ) : null}
      </View>

      <ProfileMenu onSettings={onSettings} />

      <Button
        className="w-full rounded-lg bg-danger-soft"
        onPress={onLogout}
        variant="secondary"
      >
        <LogOut color="#c43d45" size={18} />
        <Button.Label className="font-semibold text-danger">Log out</Button.Label>
      </Button>

      <Typography color="muted" style={styles.version} type="body-xs">Mogate mobile 0.1.0</Typography>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Typography.Heading numberOfLines={1} type="h5">{value}</Typography.Heading>
      <Typography color="muted" numberOfLines={1} type="body-xs">{label}</Typography>
    </View>
  );
}

function WalletAccordionItem({
  address,
  children,
  copied,
  label,
  networkLabel,
  onCopy,
  value
}: {
  address?: string | null;
  children: ReactNode;
  copied: boolean;
  label: string;
  networkLabel: string;
  onCopy: () => void | Promise<void>;
  value: string;
}) {
  return (
    <Accordion.Item value={value}>
      <Accordion.Trigger>
        <View style={styles.walletSummary}>
          <View style={styles.networkLogo}>{children}</View>
          <View style={styles.walletSummaryCopy}>
            <Typography type="body-sm" weight="semibold">{label}</Typography>
            <Typography color="muted" numberOfLines={1} type="body-xs">{networkLabel}</Typography>
          </View>
          <Chip color={address ? 'success' : 'default'} size="sm" variant="soft">
            <Chip.Label>{address ? 'Ready' : 'Pending'}</Chip.Label>
          </Chip>
        </View>
        <Accordion.Indicator />
      </Accordion.Trigger>
      <Accordion.Content>
        <View style={styles.addressPanel}>
          <Typography color="muted" type="body-xs">Address</Typography>
          <View style={styles.addressRow}>
            <Typography selectable style={styles.address} type="body-xs">
              {address || 'No wallet address available'}
            </Typography>
            <Button
              accessibilityLabel={`Copy ${label} address`}
              className="h-10 w-10 rounded-lg"
              isDisabled={!address}
              isIconOnly
              onPress={onCopy}
              variant="secondary"
            >
              <Copy color={copied ? '#23845b' : '#52525b'} size={17} />
            </Button>
          </View>
          {copied ? <Typography style={styles.copiedText} type="body-xs">Address copied</Typography> : null}
        </View>
      </Accordion.Content>
    </Accordion.Item>
  );
}

function ProfileMenu({ onSettings }: { onSettings: () => void }) {
  return (
    <View style={styles.sectionStack}>
      <Typography.Heading type="h5">Account</Typography.Heading>
      <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
        <MenuRow Icon={UserRoundCog} label="Account settings" onPress={onSettings} />
        <Separator />
        <MenuRow Icon={ShieldCheck} label="Security" status="Protected" />
        <Separator />
        <MenuRow Icon={CircleHelp} label="Mogate Care" status="Support" />
        <Separator />
        <MenuRow Icon={BookOpenText} label="Terms & privacy" />
      </Surface>
    </View>
  );
}

function MenuRow({
  Icon,
  label,
  onPress,
  status
}: {
  Icon: ComponentType<{ color?: string; size?: number }>;
  label: string;
  onPress?: () => void;
  status?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
    >
      <View style={styles.menuIcon}>
        <Icon color="#71717a" size={19} />
      </View>
      <Typography style={styles.menuLabel} type="body-sm" weight="medium">{label}</Typography>
      {status ? <Typography color="muted" type="body-xs">{status}</Typography> : null}
      {onPress ? <ChevronRight color="#a1a1aa" size={18} /> : null}
    </Pressable>
  );
}

function providerName(loginMethod?: string | null) {
  if (!loginMethod) return null;
  if (loginMethod.includes('google')) return 'Google';
  if (loginMethod.includes('twitter')) return 'X';
  if (loginMethod.includes('apple')) return 'Apple';
  if (loginMethod.includes('email')) return 'Email';
  return 'Privy';
}

const styles = StyleSheet.create({
  stack: {
    gap: 18,
    paddingBottom: 8
  },
  pageHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  identityRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  identityCopy: {
    flex: 1,
    minWidth: 0
  },
  identitySeparator: {
    marginVertical: 14
  },
  profileMeta: {
    gap: 10
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  sectionLead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  iconWell: {
    alignItems: 'center',
    backgroundColor: '#fff1e7',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  sectionLeadCopy: {
    flex: 1
  },
  metrics: {
    alignItems: 'stretch',
    flexDirection: 'row',
    marginTop: 16
  },
  metric: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  metricSeparator: {
    height: 42
  },
  sectionStack: {
    gap: 10
  },
  sectionHeading: {
    gap: 2
  },
  walletSummary: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    minWidth: 0
  },
  walletSummaryCopy: {
    flex: 1,
    minWidth: 0
  },
  networkLogo: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  addressPanel: {
    backgroundColor: '#fafafa',
    borderColor: '#e4e4e7',
    borderRadius: 8,
    borderWidth: 1,
    gap: 7,
    padding: 12
  },
  addressRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  address: {
    color: '#3f3f46',
    flex: 1,
    fontFamily: 'Courier',
    lineHeight: 18
  },
  copiedText: {
    color: '#23845b',
    fontWeight: '600'
  },
  warningText: {
    color: '#725c20',
    lineHeight: 18
  },
  menuRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    minHeight: 56,
    paddingHorizontal: 2,
    paddingVertical: 8
  },
  menuRowPressed: {
    opacity: 0.62
  },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  menuLabel: {
    flex: 1
  },
  version: {
    textAlign: 'center'
  }
});
