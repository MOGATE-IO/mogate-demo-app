import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  Button,
  Chip,
  Input,
  Label,
  Separator,
  Skeleton,
  Surface,
  Switch,
  TextField,
  Typography
} from 'heroui-native';
import {
  AtSign,
  CheckCircle2,
  CircleAlert,
  Coins,
  Mail,
  Send,
  Wallet
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HeroBottomSheet } from '@/components/HeroBottomSheet.ui';
import { formatUsdAmount } from '@/features/checkout/services/paymentBalances';
import type {
  TransferRecipientType,
  UniversalAccountTransferState
} from '@/features/transfer/hooks/useUniversalAccountTransfer';
import type { TransferAsset } from '@/features/transfer/services/transferAssets';
import { shortenAddress } from '@/utils/format';
import { TransferAssetMark, TransferNetworkMark } from './TransferAssetMark.ui';

const RECIPIENT_MODES: Array<{
  id: TransferRecipientType;
  label: string;
  Icon: typeof Wallet;
  enabled: boolean;
}> = [
  { id: 'wallet', label: 'Wallet', Icon: Wallet, enabled: true },
  { id: 'email', label: 'Email', Icon: Mail, enabled: false },
  { id: 'x', label: 'X', Icon: AtSign, enabled: false }
];

export function TransferMoneySheet({
  transfer
}: {
  transfer: UniversalAccountTransferState;
}) {
  const review = transfer.stage === 'review';
  const success = transfer.stage === 'success';
  const preparing = transfer.stage === 'quoting';
  const footer = success ? (
    <Button className="w-full rounded-lg" onPress={transfer.close} variant="primary">
      <Button.Label>Done</Button.Label>
    </Button>
  ) : review ? (
    <View style={styles.footerRow}>
      <Button className="flex-1 rounded-lg" onPress={transfer.returnToEdit} variant="secondary">
        <Button.Label>Back</Button.Label>
      </Button>
      <Button
        className="flex-1 rounded-lg"
        isDisabled={transfer.sending}
        onPress={transfer.confirmTransfer}
        variant="primary"
      >
        <Send color="#ffffff" size={17} />
        <Button.Label>{transfer.sending ? 'Sending...' : 'Confirm transfer'}</Button.Label>
      </Button>
    </View>
  ) : (
    <Button
      className="w-full rounded-lg"
      isDisabled={preparing || transfer.sending || !transfer.selectedAsset}
      onPress={transfer.stage === 'error' ? transfer.returnToEdit : transfer.reviewTransfer}
      variant="primary"
    >
      <Button.Label>
        {preparing ? 'Preparing route...' : transfer.stage === 'error' ? 'Edit transfer' : 'Review transfer'}
      </Button.Label>
    </Button>
  );

  return (
    <HeroBottomSheet
      description="Particle UA EIP-7702"
      footer={<View style={styles.footer}>{footer}</View>}
      onClose={transfer.close}
      title="Transfer money"
      visible={transfer.visible}
    >
      <View style={styles.sheetBody}>
        <BottomSheetScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {success ? (
            <TransferSuccess transfer={transfer} />
          ) : review || transfer.sending ? (
            <TransferReview transfer={transfer} />
          ) : (
            <TransferEditor transfer={transfer} />
          )}
        </BottomSheetScrollView>
      </View>
    </HeroBottomSheet>
  );
}

function TransferEditor({ transfer }: { transfer: UniversalAccountTransferState }) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <View style={styles.flexCopy}>
          <Typography.Heading type="h5">Choose asset</Typography.Heading>
          <Typography color="muted" type="body-xs">Select the destination network and token.</Typography>
        </View>
        <View style={styles.hideSmallRow}>
          <Typography color="muted" type="body-xs">Hide small</Typography>
          <Switch
            accessibilityLabel="Hide balances below one cent"
            isSelected={transfer.hideSmallBalances}
            onSelectedChange={transfer.setHideSmallBalances}
          />
        </View>
      </View>

      <ScrollView
        accessibilityRole="tablist"
        contentContainerStyle={styles.networkTabs}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {transfer.networks.map((network) => {
          const active = transfer.selectedChainId === network.chainId;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={network.chainId}
              onPress={() => transfer.setSelectedChainId(network.chainId)}
              style={({ pressed }) => [
                styles.networkTab,
                active && styles.networkTabActive,
                pressed && styles.pressed
              ]}
            >
              <TransferNetworkMark chainId={network.chainId} size={17} />
              <Typography
                color={active ? 'default' : 'muted'}
                numberOfLines={1}
                type="body-xs"
                weight="semibold"
              >
                {network.shortLabel}
              </Typography>
            </Pressable>
          );
        })}
      </ScrollView>

      {transfer.assets.length === 0 ? (
        <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
          <View style={styles.emptyState}>
            <Coins color="#71717a" size={24} />
            <View style={styles.flexCopy}>
              <Typography type="body-sm" weight="semibold">No transferable assets found</Typography>
              <Typography color="muted" type="body-xs">Refresh balances after funding this wallet.</Typography>
            </View>
          </View>
        </Surface>
      ) : transfer.visibleAssets.length === 0 ? (
        <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
          <Typography color="muted" type="body-sm">
            No balances remain after the small-balance filter.
          </Typography>
        </Surface>
      ) : (
        <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
          {transfer.visibleAssets.map((asset, index) => (
            <View key={asset.id}>
              {index > 0 ? <Separator /> : null}
              <TransferAssetRow
                asset={asset}
                onPress={() => transfer.setSelectedAssetId(asset.id)}
                selected={transfer.selectedAssetId === asset.id}
              />
            </View>
          ))}
        </Surface>
      )}

      {transfer.selectedAsset ? (
        <View style={styles.fieldStack}>
          <View style={styles.labelRow}>
            <Typography type="body-sm" weight="semibold">Amount</Typography>
            <Typography color="muted" type="body-xs">
              {transfer.formatAssetAmount(transfer.selectedAsset)} {transfer.selectedAsset.symbol} available
            </Typography>
          </View>
          <TextField>
            <Label className="sr-only">Transfer amount</Label>
            <View style={styles.amountInputWrap}>
              <Input
                accessibilityLabel="Transfer amount"
                className="flex-1 rounded-lg"
                inputMode="decimal"
                onChangeText={transfer.setAmount}
                placeholder="0.00"
                value={transfer.amount}
              />
              <Button className="rounded-lg" onPress={transfer.useMax} size="sm" variant="secondary">
                <Button.Label>Max</Button.Label>
              </Button>
            </View>
          </TextField>
          {transfer.amountError ? (
            <Typography className="text-danger" type="body-xs">{transfer.amountError}</Typography>
          ) : null}
        </View>
      ) : null}

      <View style={styles.fieldStack}>
        <Typography.Heading type="h5">Send to</Typography.Heading>
        <View accessibilityRole="radiogroup" style={styles.recipientModes}>
          {RECIPIENT_MODES.map(({ id, label, Icon, enabled }) => {
            const active = transfer.recipientType === id;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ disabled: !enabled, selected: active }}
                disabled={!enabled}
                key={id}
                onPress={() => transfer.setRecipientType(id)}
                style={({ pressed }) => [
                  styles.recipientMode,
                  active && styles.recipientModeActive,
                  !enabled && styles.recipientModeDisabled,
                  pressed && styles.pressed
                ]}
              >
                <Icon color={active ? '#18181b' : '#71717a'} size={17} />
                <Typography color={active ? 'default' : 'muted'} type="body-xs" weight="semibold">
                  {label}
                </Typography>
              </Pressable>
            );
          })}
        </View>
        <TextField>
          <Label>Wallet address</Label>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={transfer.setRecipient}
            placeholder={transfer.selectedAsset?.networkFamily === 'solana' ? 'Solana address' : '0x...'}
            spellCheck={false}
            value={transfer.recipient}
          />
        </TextField>
        {transfer.recipientError ? (
          <Typography className="text-danger" type="body-xs">{transfer.recipientError}</Typography>
        ) : null}
      </View>

      <Surface className="rounded-lg bg-default p-3 shadow-none" variant="transparent">
        <Typography color="muted" type="body-xs">
          Particle routes supported primary assets across its networks and prefers USD fee assets. The review shows the quoted fee token before signing.
        </Typography>
      </Surface>

      {transfer.stage === 'quoting' ? (
        <View style={styles.loadingStack}>
          <Skeleton className="h-16 w-full rounded-lg" />
          <Typography color="muted" type="body-xs">Building the cross-chain route and fee quote...</Typography>
        </View>
      ) : null}
      {transfer.error ? <InlineError>{transfer.error}</InlineError> : null}
    </>
  );
}

function TransferReview({ transfer }: { transfer: UniversalAccountTransferState }) {
  const quote = transfer.quote;
  if (!quote) {
    return transfer.error ? <InlineError>{transfer.error}</InlineError> : null;
  }
  const feeLabel = quote.fees.freeGasFee
    ? 'Sponsored'
    : quote.fees.totalFeeUsd > 0
      ? formatUsdAmount(quote.fees.totalFeeUsd)
      : 'Included in route';
  const status = transfer.stage === 'authorizing'
    ? 'Waiting for EIP-7702 and account signatures'
    : transfer.stage === 'submitting'
      ? 'Submitting Universal Transaction'
      : transfer.stage === 'confirming'
        ? 'Confirming on the destination chain'
        : null;

  return (
    <>
      <View style={styles.reviewHero}>
        <View style={styles.reviewIcon}><Send color="#d95f14" size={22} /></View>
        <Typography color="muted" type="body-xs">You send</Typography>
        <Typography.Heading type="h2">
          {quote.amount} {quote.asset.symbol}
        </Typography.Heading>
        <Typography color="muted" type="body-xs">on {quote.asset.chainLabel}</Typography>
      </View>
      <Surface className="rounded-lg border border-border bg-surface px-4 shadow-none">
        <ReviewRow label="Recipient" value={shortenAddress(quote.recipient, 8, 6)} />
        <Separator />
        <ReviewRow label="Network" value={quote.asset.chainLabel} />
        <Separator />
        <ReviewRow label="Particle fee" value={feeLabel} />
        <Separator />
        <ReviewRow
          label="Fee asset"
          value={quote.fees.feeSymbols.length > 0 ? quote.fees.feeSymbols.join(' + ') : 'USD preferred'}
        />
      </Surface>
      {status ? (
        <Surface className="rounded-lg bg-default p-4 shadow-none" variant="transparent">
          <View style={styles.statusRow}>
            <Send color="#d95f14" size={18} />
            <View style={styles.flexCopy}>
              <Typography type="body-sm" weight="semibold">Transfer in progress</Typography>
              <Typography color="muted" type="body-xs">{status}</Typography>
            </View>
          </View>
        </Surface>
      ) : null}
      {transfer.error ? <InlineError>{transfer.error}</InlineError> : null}
    </>
  );
}

function TransferSuccess({ transfer }: { transfer: UniversalAccountTransferState }) {
  return (
    <View style={styles.successState}>
      <View style={styles.successIcon}><CheckCircle2 color="#168a52" size={30} /></View>
      <Typography.Heading type="h3">Transfer confirmed</Typography.Heading>
      <Typography color="muted" style={styles.centerText} type="body-sm">
        The destination-chain transaction finished through Particle Universal Accounts.
      </Typography>
      {transfer.result?.transactionHash ? (
        <Chip color="success" variant="soft">
          <Chip.Label>{shortenAddress(transfer.result.transactionHash, 10, 8)}</Chip.Label>
        </Chip>
      ) : null}
    </View>
  );
}

function TransferAssetRow({
  asset,
  onPress,
  selected
}: {
  asset: TransferAsset;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.assetRow, pressed && styles.pressed]}
    >
      <TransferAssetMark asset={asset} />
      <View style={styles.flexCopy}>
        <Typography type="body-sm" weight="semibold">{asset.symbol}</Typography>
        <Typography color="muted" numberOfLines={1} type="body-xs">{asset.name}</Typography>
      </View>
      <View style={styles.amountCopy}>
        <Typography type="body-sm" weight="semibold">
          {asset.symbol === 'USDC' || asset.symbol === 'USDT'
            ? asset.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : asset.amount.toLocaleString('en-US', {
                maximumFractionDigits: asset.kind === 'native' ? Math.min(asset.decimals, 10) : Math.min(asset.decimals, 6)
              })}
        </Typography>
        <Typography color="muted" type="body-xs">
          {asset.amountUsd == null ? asset.symbol : formatUsdAmount(asset.amountUsd)}
        </Typography>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]} />
    </Pressable>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Typography color="muted" type="body-sm">{label}</Typography>
      <Typography numberOfLines={1} style={styles.reviewValue} type="body-sm" weight="semibold">{value}</Typography>
    </View>
  );
}

function InlineError({ children }: { children: string }) {
  return (
    <Surface className="rounded-lg bg-danger-soft p-3 shadow-none" variant="transparent">
      <View style={styles.statusRow}>
        <CircleAlert color="#c43d45" size={18} />
        <Typography className="flex-1 text-danger" type="body-xs">{children}</Typography>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  sheetBody: { flex: 1 },
  scrollContent: { gap: 14, paddingBottom: 124, paddingHorizontal: 18 },
  footer: { padding: 14 },
  footerRow: { flexDirection: 'row', gap: 8 },
  flexCopy: { flex: 1, minWidth: 0 },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  hideSmallRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  networkTabs: { flexDirection: 'row', gap: 8, paddingRight: 6 },
  networkTab: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 82,
    paddingHorizontal: 12
  },
  networkTabActive: { backgroundColor: '#ffffff', borderColor: '#d95f14' },
  pressed: { opacity: 0.72 },
  emptyState: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  assetRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 68, paddingVertical: 9 },
  amountCopy: { alignItems: 'flex-end', gap: 2 },
  radio: { borderColor: '#d4d4d8', borderRadius: 8, borderWidth: 2, height: 16, width: 16 },
  radioSelected: { borderColor: '#d95f14', borderWidth: 5 },
  fieldStack: { gap: 8 },
  labelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  amountInputWrap: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  recipientModes: { backgroundColor: '#f4f4f5', borderRadius: 8, flexDirection: 'row', gap: 4, padding: 4 },
  recipientMode: { alignItems: 'center', borderRadius: 8, flex: 1, flexDirection: 'row', gap: 6, justifyContent: 'center', minHeight: 42 },
  recipientModeActive: { backgroundColor: '#ffffff' },
  recipientModeDisabled: { opacity: 0.45 },
  loadingStack: { gap: 8 },
  reviewHero: { alignItems: 'center', gap: 4, paddingVertical: 12 },
  reviewIcon: { alignItems: 'center', backgroundColor: '#fff0e7', borderRadius: 8, height: 48, justifyContent: 'center', marginBottom: 4, width: 48 },
  reviewRow: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 52 },
  reviewValue: { flex: 1, textAlign: 'right' },
  statusRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9 },
  successState: { alignItems: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 34 },
  successIcon: { alignItems: 'center', backgroundColor: '#e4f7ec', borderRadius: 8, height: 62, justifyContent: 'center', width: 62 },
  centerText: { textAlign: 'center' }
});
