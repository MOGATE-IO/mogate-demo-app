import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Accordion,
  Button,
  Chip,
  Description,
  FieldError,
  Input,
  Label,
  RadioGroup,
  Select,
  Separator,
  Surface,
  Switch,
  Tabs,
  TextArea,
  TextField,
  Typography
} from 'heroui-native';
import {
  ArrowRight,
  AtSign,
  CircleAlert,
  CircleDollarSign,
  LockKeyhole,
  Mail,
  Wallet
} from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import EthereumLogo from '@assets/+logos/ethereum-eth-logo.svg';
import ArbitrumLogo from '@assets/images/network/arbitrum-arb-logo.svg';
import FhenixLogo from '@assets/external/fhenix-full-logo-dark.svg';
import { PageHeader } from '@/components/PageHeader.ui';
import { StatusPill } from '@/components/StatusPill';
import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import { CheckoutPaymentSheet } from '@/features/checkout/components/CheckoutPaymentSheet.ui';
import type { UniversalAccountMintState } from '@/features/checkout/hooks/useUniversalAccountMint';
import {
  formatUsdAmount,
  type StablecoinPortfolio,
  type StablecoinSymbol
} from '@/features/checkout/services/paymentBalances';
import { GiftcardComponent } from '@/features/giftcard/components/GiftcardComponent';
import type {
  CheckoutReceiverType,
  CheckoutSelection
} from '@/screens/types';
import { prettyJson, shortenAddress } from '@/utils/format';
import { formatRegionLabel } from '@/utils/regions';

export type MintCheckoutViewProps = {
  checkoutSelection: CheckoutSelection | null;
  mint: UniversalAccountMintState;
  profile: RuntimeNetworkProfile;
  ownerAddress: string;
  canMint: boolean;
  balanceStatus: 'idle' | 'loading' | 'ready' | 'error';
  balanceErrors: string[];
  portfolio: StablecoinPortfolio;
  targetNativeAmount: number;
  advancedOpen: boolean;
  regionOpen: boolean;
  regionOptions: string[];
  receiverError: string | null;
  receiverValid: boolean;
  onBack: () => void;
  onCheckoutComplete: () => void;
  onRefreshBalances: () => void | Promise<void>;
  onTopUp: () => void | Promise<void>;
  onToggleAdvanced: () => void;
  onToggleRegion: () => void;
  onSelectAmount: (amount: number) => void;
  onSelectRegion: (region: string) => void;
  onSetCouponCode: (couponCode: string) => void;
  onSetGiftcardMode: (giftcardMode: CheckoutSelection['giftcardMode']) => void;
  onSetReceiverAddress: (receiver: string) => void;
  onSetReceiverContact: (receiver: string) => void;
  onSetReceiverType: (receiverType: CheckoutReceiverType) => void;
  onSetAutoMint: (enabled: boolean) => void;
  onSetAutoUnwrap: (enabled: boolean) => void;
  onSetReserveGas: (enabled: boolean) => void;
};

export function MintCheckoutView({
  advancedOpen,
  balanceErrors,
  balanceStatus,
  canMint,
  checkoutSelection,
  mint,
  onBack,
  onCheckoutComplete,
  onRefreshBalances,
  onSelectAmount,
  onSelectRegion,
  onSetAutoMint,
  onSetAutoUnwrap,
  onSetReserveGas,
  onSetCouponCode,
  onSetGiftcardMode,
  onSetReceiverAddress,
  onSetReceiverContact,
  onSetReceiverType,
  onToggleAdvanced,
  onToggleRegion,
  onTopUp,
  ownerAddress,
  portfolio,
  profile,
  receiverError,
  receiverValid,
  regionOpen,
  regionOptions,
  targetNativeAmount
}: MintCheckoutViewProps) {
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedStablecoin, setSelectedStablecoin] = useState<StablecoinSymbol>('USDC');
  const merchant = checkoutSelection?.merchant;
  const amount = checkoutSelection?.amount ?? 0;
  const selectedRegion = checkoutSelection?.region ?? regionOptions[0] ?? 'GLOBAL';
  const regionValue = {
    label: formatRegionLabel(selectedRegion),
    value: selectedRegion
  };

  return (
    <View style={styles.screen}>
      <View style={styles.fixedHeader}>
        <PageHeader
          backLabel="Back to catalogue"
          onBack={onBack}
          subtitle={`${profile.mode === 'testnet' ? 'Testnet' : 'Mainnet'} / direct USDC / ${profile.ua.chainLabel}`}
          title={merchant?.name ?? 'Mint checkout'}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GiftcardComponent
          amountDisplay={amount ? String(amount) : null}
          brandName={merchant?.name}
          currency={merchant?.currency}
          imageUrl={merchant?.imageUrl}
        />

        <SectionHeading title="Giftcard details" />
        <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
          <View style={styles.fieldStack}>
            <Typography color="muted" type="body-xs" weight="semibold">Value</Typography>
            <ValueButtonList
              amount={amount}
              amounts={merchant?.availableAmounts ?? []}
              onSelectAmount={onSelectAmount}
            />
          </View>

          <Separator />

          <View style={styles.fieldStack}>
            <Typography color="muted" type="body-xs" weight="semibold">Region</Typography>
            <Select
              isOpen={regionOpen}
              onOpenChange={(open) => {
                if (open !== regionOpen) onToggleRegion();
              }}
              onValueChange={(option) => {
                const next = Array.isArray(option) ? option[0] : option;
                if (next) onSelectRegion(next.value);
              }}
              value={regionValue}
            >
              <Select.Trigger className="rounded-lg">
                <Select.Value placeholder="Choose region" />
                <Select.TriggerIndicator />
              </Select.Trigger>
              <Select.Portal>
                <Select.Overlay />
                <Select.Content presentation="popover" width="trigger">
                  <Select.ListLabel>Available regions</Select.ListLabel>
                  {regionOptions.map((region) => (
                    <Select.Item
                      key={region}
                      label={formatRegionLabel(region)}
                      value={region}
                    >
                      <Select.ItemLabel />
                      <Select.ItemIndicator />
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Portal>
            </Select>
          </View>
        </Surface>

        <SectionHeading title="Mint route" />
        <MintRouteCard giftcardMode={checkoutSelection?.giftcardMode ?? 'funded'} profile={profile} />

        <SectionHeading title="Receiver" />
        <ReceiverField
          contact={checkoutSelection?.receiverContact ?? ''}
          ownerAddress={ownerAddress}
          receiverAddress={checkoutSelection?.receiverAddress ?? ''}
          receiverError={receiverError}
          receiverType={checkoutSelection?.receiverType ?? 'wallet'}
          onSetReceiverAddress={onSetReceiverAddress}
          onSetReceiverContact={onSetReceiverContact}
          onSetReceiverType={onSetReceiverType}
        />

        <Accordion
          className="rounded-lg"
          hideSeparator
          onValueChange={(value: string | undefined) => {
            const shouldOpen = value === 'advanced';
            if (shouldOpen !== advancedOpen) onToggleAdvanced();
          }}
          selectionMode="single"
          value={advancedOpen ? 'advanced' : undefined}
          variant="surface"
        >
          <Accordion.Item value="advanced">
            <Accordion.Trigger>
              <View style={styles.flexCopy}>
                <Typography weight="semibold">Advanced</Typography>
                <Typography color="muted" type="body-xs">
                  Mint type, automation, and diagnostics
                </Typography>
              </View>
              <Accordion.Indicator />
            </Accordion.Trigger>
            <Accordion.Content>
              <View style={styles.advancedBody}>
                <View style={styles.fieldStack}>
                  <Typography color="muted" type="body-xs" weight="semibold">Giftcard type</Typography>
                  <RadioGroup
                    onValueChange={(value) => {
                      if (value === 'funded' || value === 'voucher') onSetGiftcardMode(value);
                    }}
                    value={checkoutSelection?.giftcardMode ?? 'funded'}
                  >
                    <RadioGroup.Item value="funded">Funded value</RadioGroup.Item>
                    <RadioGroup.Item value="voucher">Encrypted voucher</RadioGroup.Item>
                  </RadioGroup>
                </View>
                <Separator />
                <AdvancedChoice
                  disabledLabel="Private shield / later phase"
                  label="Public"
                  title="Mint type"
                  value="public"
                />
                <Separator />
                <SettingSwitch
                  detail="Mint after direct payment confirmation."
                  label="Auto mint"
                  onChange={onSetAutoMint}
                  value={checkoutSelection?.autoMint ?? true}
                />
                <SettingSwitch
                  detail="Convert the NFT into a non-transferable claim."
                  label="Auto unwrap"
                  onChange={onSetAutoUnwrap}
                  value={checkoutSelection?.autoUnwrap ?? false}
                />
                <SettingSwitch
                  detail="Store native gas support with the giftcard."
                  label="Reserved gas"
                  onChange={onSetReserveGas}
                  value={checkoutSelection?.reserveGas ?? true}
                />
                <Separator />
                <View style={styles.diagnostics}>
                  <Typography color="muted" type="body-xs" weight="semibold">Readiness</Typography>
                  {mint.gates.map((gate) => (
                    <View key={gate.id} style={styles.gate}>
                      <View style={styles.gateHeader}>
                        <Typography style={styles.gateTitle} type="body-sm" weight="medium">
                          {gate.label}
                        </Typography>
                        <StatusPill status={gate.status} />
                      </View>
                      <Typography color="muted" type="body-xs">{gate.detail}</Typography>
                    </View>
                  ))}
                  <View style={styles.actions}>
                    <Button
                      className="rounded-lg"
                      isDisabled={!ownerAddress}
                      onPress={mint.probeUa}
                      size="sm"
                      variant="secondary"
                    >
                      <Button.Label>Refresh route</Button.Label>
                    </Button>
                    <Button className="rounded-lg" onPress={mint.parseCheckout} size="sm" variant="secondary">
                      <Button.Label>Parse checkout</Button.Label>
                    </Button>
                  </View>
                  {mint.uaProbe ? (
                    <Surface className="rounded-lg bg-default p-3 shadow-none" variant="transparent">
                      <Typography selectable style={styles.monoText} type="body-xs">
                        {prettyJson(mint.uaProbe)}
                      </Typography>
                    </Surface>
                  ) : null}
                  <TextField>
                    <Label>Prepared checkout JSON</Label>
                    <TextArea
                      className="min-h-36 rounded-lg font-mono"
                      onChangeText={mint.setCheckoutJson}
                      placeholder="Prepared checkout JSON"
                      value={mint.checkoutJson}
                    />
                  </TextField>
                </View>
              </View>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </ScrollView>

      <Surface className="rounded-lg border border-border bg-surface p-3 shadow-lg" style={styles.checkoutDock}>
        <View style={styles.dockCopy}>
          <Typography color="muted" numberOfLines={1} type="body-xs">
            {merchant?.name ?? 'Giftcard'} / total
          </Typography>
          <Typography weight="bold">{formatUsdAmount(amount)}</Typography>
        </View>
        <Button
          accessibilityHint="Opens payment method and final order details"
          className="rounded-lg"
          isDisabled={!receiverValid}
          onPress={() => setCheckoutOpen(true)}
          variant="primary"
        >
          <Button.Label>Review</Button.Label>
          <ArrowRight color="#ffffff" size={17} />
        </Button>
      </Surface>

      <CheckoutPaymentSheet
        balanceErrors={balanceErrors}
        balanceStatus={balanceStatus}
        canMint={canMint}
        checkoutSelection={checkoutSelection}
        mint={mint}
        onClose={() => setCheckoutOpen(false)}
        onComplete={onCheckoutComplete}
        onCouponCodeChange={onSetCouponCode}
        onRefreshBalances={onRefreshBalances}
        onSelectStablecoin={setSelectedStablecoin}
        onTopUp={onTopUp}
        portfolio={portfolio}
        profile={profile}
        receiverValid={receiverValid}
        selectedStablecoin={selectedStablecoin}
        targetNativeAmount={targetNativeAmount}
        visible={checkoutOpen}
      />
    </View>
  );
}

function ValueButtonList({
  amount,
  amounts,
  onSelectAmount
}: {
  amount: number;
  amounts: number[];
  onSelectAmount: (amount: number) => void;
}) {
  return (
    <View style={styles.valueGrid}>
      {amounts.map((value) => {
        const selected = value === amount;
        return (
          <Button
            accessibilityLabel={`Choose $${value}`}
            accessibilityState={{ selected }}
            className={selected
              ? 'min-w-[68px] rounded-lg border border-accent bg-accent-soft'
              : 'min-w-[68px] rounded-lg border border-border bg-surface'}
            key={value}
            onPress={() => onSelectAmount(value)}
            size="sm"
            variant="ghost"
          >
            <Button.Label className={selected ? 'font-semibold text-accent' : 'font-semibold text-foreground'}>
              ${value}
            </Button.Label>
          </Button>
        );
      })}
    </View>
  );
}

function MintRouteCard({
  giftcardMode,
  profile
}: {
  giftcardMode: CheckoutSelection['giftcardMode'];
  profile: RuntimeNetworkProfile;
}) {
  const ChainLogo = profile.ua.networkName.startsWith('arbitrum') ? ArbitrumLogo : EthereumLogo;
  const encryptionActive = giftcardMode === 'voucher';

  return (
    <Surface className="rounded-lg border border-border bg-surface px-4 shadow-none">
      <View style={styles.routeRow}>
        <View style={styles.iconWell}>
          <ChainLogo height={24} width={24} />
        </View>
        <View style={styles.flexCopy}>
          <Typography type="body-sm" weight="semibold">{profile.ua.chainLabel}</Typography>
          <Typography color="muted" type="body-xs">Target mint network</Typography>
        </View>
        <Chip color="accent" size="sm" variant="soft">
          <Chip.Label>Fixed</Chip.Label>
        </Chip>
      </View>
      <Separator />
      {encryptionActive ? (
        <View style={styles.encryptionRow}>
          <View style={styles.encryptionHeader}>
            <FhenixLogo height={18} width={96} />
            <Chip color="success" size="sm" variant="soft"><Chip.Label>Active</Chip.Label></Chip>
          </View>
          <View style={styles.inlineTitle}>
            <LockKeyhole color="#e9680c" size={16} />
            <Typography type="body-sm" weight="semibold">Encrypted voucher</Typography>
          </View>
        </View>
      ) : (
        <View style={styles.routeRow}>
          <CircleDollarSign color="#2775ca" size={22} />
          <View style={styles.flexCopy}>
            <Typography type="body-sm" weight="semibold">USDC-backed giftcard</Typography>
            <Typography color="muted" type="body-xs">Fixed value</Typography>
          </View>
          <Chip color="success" size="sm" variant="soft"><Chip.Label>Funded</Chip.Label></Chip>
        </View>
      )}
    </Surface>
  );
}

function ReceiverField({
  contact,
  onSetReceiverAddress,
  onSetReceiverContact,
  onSetReceiverType,
  ownerAddress,
  receiverAddress,
  receiverError,
  receiverType
}: {
  contact: string;
  onSetReceiverAddress: (value: string) => void;
  onSetReceiverContact: (value: string) => void;
  onSetReceiverType: (value: CheckoutReceiverType) => void;
  ownerAddress: string;
  receiverAddress: string;
  receiverError: string | null;
  receiverType: CheckoutReceiverType;
}) {
  const walletMode = receiverType === 'wallet';
  const label = walletMode ? 'Wallet address' : receiverType === 'email' ? 'Email address' : 'X handle';
  const placeholder = walletMode
    ? '0x receiver address'
    : receiverType === 'email'
      ? 'Email delivery is currently turned off'
      : 'X delivery is currently turned off';

  return (
    <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
      <Tabs onValueChange={(value) => onSetReceiverType(value as CheckoutReceiverType)} value={receiverType}>
        <Tabs.List className="rounded-lg">
          <Tabs.Indicator />
          <Tabs.Trigger className="flex-1" value="wallet">
            <Wallet size={17} />
            <Tabs.Label>Wallet</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger className="flex-1" value="email">
            <Mail size={17} />
            <Tabs.Label>Email</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger className="flex-1" value="x">
            <AtSign size={17} />
            <Tabs.Label>X</Tabs.Label>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      <TextField isDisabled={!walletMode} isInvalid={walletMode && Boolean(receiverError)} isRequired={walletMode}>
        <Label>{label}</Label>
        <Input
          accessibilityLabel={`Giftcard receiver ${label.toLowerCase()}`}
          autoCapitalize="none"
          autoCorrect={false}
          className={walletMode ? 'rounded-lg font-mono' : 'rounded-lg'}
          keyboardType={receiverType === 'email' ? 'email-address' : 'default'}
          onChangeText={walletMode ? onSetReceiverAddress : onSetReceiverContact}
          placeholder={placeholder}
          value={walletMode ? receiverAddress : contact}
        />
        {walletMode && receiverError ? <FieldError>{receiverError}</FieldError> : null}
        <Description>
          {walletMode
            ? `Connected payer: ${ownerAddress ? shortenAddress(ownerAddress) : 'Unavailable'}`
            : `${receiverType === 'email' ? 'Email' : 'X'} delivery is visible for planning and disabled in this direct testnet phase.`}
        </Description>
      </TextField>
    </Surface>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <Typography.Heading type="h5">{title}</Typography.Heading>;
}

function InlineAlert({ children }: { children: ReactNode }) {
  return (
    <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
      <View style={styles.inlineAlert}>
        <CircleAlert color="#c43d45" size={18} />
        <Typography style={styles.alertText} type="body-sm">{children}</Typography>
      </View>
    </Surface>
  );
}

function AdvancedChoice({
  disabledLabel,
  label,
  title,
  value
}: {
  disabledLabel: string;
  label: string;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.fieldStack}>
      <Typography color="muted" type="body-xs" weight="semibold">{title}</Typography>
      <RadioGroup onValueChange={() => undefined} value={value}>
        <RadioGroup.Item value={value}>{label}</RadioGroup.Item>
        <RadioGroup.Item isDisabled value={`${value}-later`}>{disabledLabel}</RadioGroup.Item>
      </RadioGroup>
    </View>
  );
}

function SettingSwitch({
  detail,
  label,
  onChange,
  value
}: {
  detail: string;
  label: string;
  onChange?: (value: boolean) => void;
  value: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.flexCopy}>
        <Typography type="body-sm" weight="semibold">{label}</Typography>
        <Typography color="muted" type="body-xs">{detail}</Typography>
      </View>
      <Switch isSelected={value} onSelectedChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 96
  },
  fixedHeader: {
    backgroundColor: '#f5f5f5',
    paddingBottom: 10,
    paddingTop: 4
  },
  fieldStack: {
    gap: 8
  },
  valueGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  flexCopy: {
    flex: 1,
    gap: 3,
    minWidth: 0
  },
  inlineTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  routeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 68,
    paddingVertical: 10
  },
  encryptionRow: {
    gap: 10,
    paddingVertical: 12
  },
  encryptionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  iconWell: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  advancedBody: {
    gap: 14,
    paddingBottom: 8
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  diagnostics: {
    gap: 10
  },
  gate: {
    gap: 4,
    paddingVertical: 3
  },
  gateHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between'
  },
  gateTitle: {
    flex: 1
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  monoText: {
    fontFamily: 'Courier',
    lineHeight: 17
  },
  inlineAlert: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 9
  },
  alertText: {
    color: '#a12f37',
    flex: 1
  },
  checkoutDock: {
    alignItems: 'center',
    bottom: 12,
    flexDirection: 'row',
    gap: 12,
    left: 0,
    minHeight: 68,
    position: 'absolute',
    right: 0
  },
  dockCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  }
});
