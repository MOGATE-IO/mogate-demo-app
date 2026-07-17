import { useState, type ComponentType, type ReactNode } from 'react';
import {
  Accordion,
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
  UserRoundCog
} from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import EthereumLogo from '@assets/+logos/ethereum-eth-logo.svg';
import SolanaLogo from '@assets/images/network/solana-sol-logo.svg';
import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import { PageHeader } from '@/components/PageHeader.ui';
import { StablecoinPortfolioCard } from '@/features/checkout/components/StablecoinPortfolioCard.ui';
import type {
  NativeBalanceRow,
  StablecoinPortfolio,
  StablecoinSymbol
} from '@/features/checkout/services/paymentBalances';
import { ProfileAccountCard } from '@/features/profile/components/ProfileAccountCard.ui';
import type { WalletProfileState } from '@/features/profile/hooks/useWalletProfile';

export type WalletProfileViewProps = {
  accountName: string;
  balanceErrors: string[];
  balanceStatus: 'idle' | 'loading' | 'ready' | 'error';
  environmentLabel: string;
  giftcardCount: number;
  giftcardValue: string;
  loginMethod?: string | null;
  networkLabel: string;
  portfolio: StablecoinPortfolio;
  nativeRows: NativeBalanceRow[];
  showTestnetNative: boolean;
  profileState: WalletProfileState;
  stablecoinBalance: string;
  onBack: () => void;
  onSettings: () => void;
  onLogout: () => void | Promise<void>;
  onRefreshBalances: () => void | Promise<void>;
  onTopUp: () => void | Promise<void>;
};

export function WalletProfileView({
  accountName,
  balanceErrors,
  balanceStatus,
  environmentLabel,
  giftcardCount,
  giftcardValue,
  loginMethod,
  networkLabel,
  onBack,
  onLogout,
  onRefreshBalances,
  onSettings,
  onTopUp,
  portfolio,
  nativeRows,
  profileState,
  stablecoinBalance,
  showTestnetNative
}: WalletProfileViewProps) {
  const [walletOpen, setWalletOpen] = useState<string | undefined>('evm-wallet');
  const [selectedStablecoin, setSelectedStablecoin] = useState<StablecoinSymbol>('USDC');
  const loginProvider = providerName(loginMethod);

  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.stack}
      header={<PageHeader
        backLabel="Back to catalogue"
        onBack={onBack}
        right={(
          <Button
            accessibilityLabel="Open account settings"
            className="h-11 w-11 rounded-lg"
            isIconOnly
            onPress={onSettings}
            variant="secondary"
          >
            <Settings color="#3f3f46" size={20} />
          </Button>
        )}
        subtitle="Account, wallets, and security"
        title="Profile"
      />}
    >

      <ProfileAccountCard
        accountName={accountName}
        environmentLabel={environmentLabel}
        giftcardCount={giftcardCount}
        giftcardValue={giftcardValue}
        loginProvider={loginProvider}
        networkLabel={networkLabel}
        onTopUp={onTopUp}
        stablecoinBalance={stablecoinBalance}
      />

      <View style={styles.sectionStack}>
        <View style={styles.sectionHeading}>
          <Typography.Heading type="h5">Network balances</Typography.Heading>
          <Typography color="muted" type="body-xs">USD stablecoins across supported networks.</Typography>
        </View>
        <StablecoinPortfolioCard
          defaultExpanded
          errors={balanceErrors}
          onRefresh={onRefreshBalances}
          onSelect={setSelectedStablecoin}
          onTopUp={onTopUp}
          portfolio={portfolio}
          nativeRows={nativeRows}
          selected={selectedStablecoin}
          showNativeSummary={showTestnetNative}
          status={balanceStatus}
        />
      </View>

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
    </FixedHeaderScrollView>
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
