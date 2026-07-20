import QRCodeStyled from 'react-native-qrcode-styled';
import {
  Button,
  Chip,
  Input,
  Label,
  Separator,
  Surface,
  TextField,
  Typography
} from 'heroui-native';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  Copy,
  Download,
  Eye,
  Fuel,
  KeyRound,
  PackageOpen,
  QrCode,
  Send
} from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import { PageHeader } from '@/components/PageHeader.ui';
import { InventoryGiftcardItem } from '@/features/inventory/components/InventoryGiftcardItem.ui';
import {
  giftcardActionLabel,
  type GiftcardAction
} from '@/features/inventory/services/giftcardActions';
import type { GiftcardInventoryItem } from '@/features/inventory/services/giftcardInventory';
import { shortenAddress } from '@/utils/format';

export function GiftcardActionView({
  action,
  claimComplete,
  claimedCode,
  claimedPinCode,
  claiming,
  copied,
  copiedFullPaymentCode,
  error,
  generatingPaymentCode,
  item,
  onBack,
  onClaim,
  onCopyFullPaymentCode,
  onCopyPaymentCode,
  onGeneratePaymentCode,
  onOpenExplorer,
  onRecipientChange,
  onSend,
  onUnwrap,
  onWithdrawAll,
  paymentCode,
  fullPaymentCode,
  paymentCodeConfigured,
  paymentCodeExpiry,
  recipient,
  sending,
  unwrapping,
  withdrawing
}: {
  action: GiftcardAction;
  claimComplete: boolean;
  claimedCode: string | null;
  claimedPinCode: string | null;
  claiming: boolean;
  copied: boolean;
  copiedFullPaymentCode: boolean;
  error: string | null;
  generatingPaymentCode: boolean;
  item: GiftcardInventoryItem;
  onBack: () => void;
  onClaim: () => void | Promise<void>;
  onCopyFullPaymentCode: () => void | Promise<void>;
  onCopyPaymentCode: () => void | Promise<void>;
  onGeneratePaymentCode: () => void | Promise<void>;
  onOpenExplorer: () => void | Promise<void>;
  onRecipientChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  onUnwrap: () => void | Promise<void>;
  onWithdrawAll: () => void | Promise<void>;
  paymentCode: string | null;
  fullPaymentCode: string | null;
  paymentCodeConfigured: boolean;
  paymentCodeExpiry: number | null;
  recipient: string;
  sending: boolean;
  unwrapping: boolean;
  withdrawing: boolean;
}) {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.stack}
      header={<PageHeader
        backLabel="Back to giftcard"
        onBack={onBack}
        subtitle={`NFT #${item.tokenId} / ${item.networkLabel}`}
        title={giftcardActionLabel(action)}
      />}
    >
      <InventoryGiftcardItem item={item} />
      <ActionContent
        action={action}
        claimComplete={claimComplete}
        claimedCode={claimedCode}
        claimedPinCode={claimedPinCode}
        claiming={claiming}
        copied={copied}
        copiedFullPaymentCode={copiedFullPaymentCode}
        error={error}
        generatingPaymentCode={generatingPaymentCode}
        item={item}
        onClaim={onClaim}
        onCopyFullPaymentCode={onCopyFullPaymentCode}
        onCopyPaymentCode={onCopyPaymentCode}
        onGeneratePaymentCode={onGeneratePaymentCode}
        onOpenExplorer={onOpenExplorer}
        onRecipientChange={onRecipientChange}
        onSend={onSend}
        onUnwrap={onUnwrap}
        onWithdrawAll={onWithdrawAll}
        paymentCode={paymentCode}
        fullPaymentCode={fullPaymentCode}
        paymentCodeConfigured={paymentCodeConfigured}
        paymentCodeExpiry={paymentCodeExpiry}
        recipient={recipient}
        sending={sending}
        unwrapping={unwrapping}
        withdrawing={withdrawing}
      />
    </FixedHeaderScrollView>
  );
}

function ActionContent({
  action,
  claimComplete,
  claimedCode,
  claimedPinCode,
  claiming,
  copied,
  copiedFullPaymentCode,
  error,
  generatingPaymentCode,
  item,
  onClaim,
  onCopyFullPaymentCode,
  onCopyPaymentCode,
  onGeneratePaymentCode,
  onOpenExplorer,
  onRecipientChange,
  onSend,
  onUnwrap,
  onWithdrawAll,
  paymentCode,
  fullPaymentCode,
  paymentCodeConfigured,
  paymentCodeExpiry,
  recipient,
  sending,
  unwrapping,
  withdrawing
}: Omit<Parameters<typeof GiftcardActionView>[0], 'onBack'>) {
  if (action === 'view') {
    return (
      <View style={styles.section}>
        <View style={styles.sectionLead}>
          <View style={styles.iconWell}><Eye color="#d95f14" size={21} /></View>
          <View style={styles.sectionCopy}>
            <Typography.Heading type="h5">NFT record</Typography.Heading>
            <Typography color="muted" type="body-xs">Token and ownership information.</Typography>
          </View>
        </View>
        <Surface className="overflow-hidden rounded-lg border border-border bg-surface px-3 shadow-none">
          <DetailRow label="Collection" value={shortenAddress(item.collection)} />
          <Separator />
          <DetailRow label="Region" value={item.region} />
          <Separator />
          <DetailRow label="Network" value={item.networkLabel} />
          <Separator />
          <DetailRow label="Token ID" value={item.tokenId} />
        </Surface>
        <Button className="w-full rounded-lg" onPress={onOpenExplorer} variant="primary">
          <Button.Label>Open network record</Button.Label>
          <ArrowUpRight color="#ffffff" size={18} />
        </Button>
      </View>
    );
  }

  if (action === 'send') {
    return (
      <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.sectionLead}>
          <View style={styles.iconWell}><Send color="#d95f14" size={21} /></View>
          <View style={styles.sectionCopy}>
            <Typography.Heading type="h5">Recipient</Typography.Heading>
            <Typography color="muted" type="body-xs">Transfer ownership to another EVM wallet.</Typography>
          </View>
        </View>
        {item.isFunded ? (
          <ReserveGasSummary
            item={item}
            note={hasVisibleReserve(item)
              ? 'This transfer uses the NFT reserve for execution gas. The remaining reserve moves with the NFT.'
              : 'No reserved gas is available, so the connected wallet pays network gas.'}
          />
        ) : null}
        <TextField isInvalid={Boolean(error)}>
          <Label>Wallet address</Label>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-lg border border-border bg-surface font-mono"
            editable={!sending}
            onChangeText={onRecipientChange}
            placeholder="0x recipient address"
            spellCheck={false}
            value={recipient}
          />
        </TextField>
        {error ? <Typography style={styles.error} type="body-xs">{error}</Typography> : null}
        <Button className="w-full rounded-lg" isDisabled={!recipient.trim() || sending} onPress={onSend} variant="primary">
          {sending ? <ActivityIndicator color="#ffffff" size="small" /> : <Send color="#ffffff" size={18} />}
          <Button.Label>{sending ? 'Sending' : 'Confirm transfer'}</Button.Label>
        </Button>
      </Surface>
    );
  }

  if (action === 'unwrap') {
    return (
      <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.sectionLead}>
          <View style={styles.warningIcon}><AlertTriangle color="#a12f37" size={21} /></View>
          <View style={styles.sectionCopy}>
            <Typography.Heading type="h5">Unwrap funded giftcard</Typography.Heading>
            <Typography color="muted" type="body-xs">Unlock its value for owner withdrawal.</Typography>
          </View>
        </View>
        <ReserveGasSummary
          item={item}
          note="After unwrap, Withdraw all releases this reserve together with every funded asset."
        />
        <Typography color="muted" type="body-sm">
          Unwrapping is permanent. The NFT becomes soulbound and can no longer be sent or used to create a Commerce Code.
        </Typography>
        {error ? <Typography style={styles.error} type="body-xs">{error}</Typography> : null}
        <Button
          className="w-full rounded-lg"
          isDisabled={unwrapping}
          onPress={onUnwrap}
          style={styles.dangerButton}
          variant="primary"
        >
          {unwrapping ? <ActivityIndicator color="#ffffff" size="small" /> : <PackageOpen color="#ffffff" size={18} />}
          <Button.Label>{unwrapping ? 'Confirming unwrap' : 'Unwrap giftcard'}</Button.Label>
        </Button>
      </Surface>
    );
  }

  if (action === 'claim') {
    return (
      <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.sectionLead}>
          <View style={claimComplete ? styles.secureIcon : styles.warningIcon}>
            {claimComplete ? <Check color="#2f8f5b" size={21} /> : <AlertTriangle color="#a12f37" size={21} />}
          </View>
          <View style={styles.sectionCopy}>
            <Typography.Heading type="h5">{item.isUnwrapped ? 'Reveal merchant code' : 'Unwrap and reveal'}</Typography.Heading>
            <Typography color="muted" type="body-xs">
              {item.isUnwrapped
                ? 'Sign a short-lived owner permit to decrypt the protected code.'
                : 'Make the NFT non-transferable and unlock its merchant code.'}
            </Typography>
          </View>
        </View>
        {claimedCode ? (
          <Surface className="rounded-lg bg-default p-5 shadow-none" variant="transparent">
            <Typography color="muted" style={styles.codeLabel} type="body-xs">MERCHANT CODE</Typography>
            <Typography selectable style={styles.code} weight="bold">{claimedCode}</Typography>
            {claimedPinCode ? (
              <>
                <Separator style={styles.codeSeparator} />
                <Typography color="muted" style={styles.codeLabel} type="body-xs">PIN</Typography>
                <Typography selectable style={styles.code} weight="bold">{claimedPinCode}</Typography>
              </>
            ) : null}
          </Surface>
        ) : claimComplete ? (
          <Surface className="rounded-lg bg-success-soft p-3 shadow-none" variant="transparent">
            <Typography style={styles.successText} type="body-sm">
              The merchant code was securely revealed for the current owner.
            </Typography>
          </Surface>
        ) : (
          <Typography color="muted" type="body-sm">
            {item.isUnwrapped
              ? 'The NFT is already soulbound. Only the current owner can authorize this reveal.'
              : 'Unwrapping is permanent. The voucher becomes soulbound before its encrypted merchant code can be revealed.'}
          </Typography>
        )}
        {error ? <Typography style={styles.error} type="body-xs">{error}</Typography> : null}
        {!claimComplete ? (
          <Button
            className="w-full rounded-lg"
            isDisabled={claiming}
            onPress={onClaim}
            variant="primary"
          >
            {claiming ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <KeyRound color="#ffffff" size={18} />
            )}
            <Button.Label>
              {claiming
                ? 'Confirming claim'
                : item.isUnwrapped
                  ? 'Reveal merchant code'
                  : 'Unwrap and reveal'}
            </Button.Label>
          </Button>
        ) : null}
      </Surface>
    );
  }

  if (action === 'withdraw-all') {
    return (
      <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.sectionLead}>
          <View style={styles.secureIcon}><Download color="#2f8f5b" size={21} /></View>
          <View style={styles.sectionCopy}>
            <Typography.Heading type="h5">Withdraw all balances</Typography.Heading>
            <Typography color="muted" type="body-xs">Release value to the current NFT owner.</Typography>
          </View>
        </View>
        <View style={styles.balanceRows}>
          {item.fundBalances.length > 0 ? item.fundBalances.map((balance, index) => (
            <View key={balance.token}>
              {index > 0 ? <Separator /> : null}
              <DetailRow label={balance.symbol} value={formatFundAmount(balance.amountDisplay, balance.symbol)} />
            </View>
          )) : <DetailRow label="Funded value" value="No active balance" />}
          <Separator />
          <DetailRow label="Reserved gas" value={formatFundAmount(item.gasReserveDisplay ?? '0', 'ETH')} />
        </View>
        <Typography color="muted" type="body-sm">
          Every attached token and the unused gas reserve are sent to the current owner. The recipient cannot be changed.
        </Typography>
        {error ? <Typography style={styles.error} type="body-xs">{error}</Typography> : null}
        <Button className="w-full rounded-lg" isDisabled={withdrawing} onPress={onWithdrawAll} variant="primary">
          {withdrawing ? <ActivityIndicator color="#ffffff" size="small" /> : <Download color="#ffffff" size={18} />}
          <Button.Label>{withdrawing ? 'Withdrawing balances' : 'Withdraw all'}</Button.Label>
        </Button>
      </Surface>
    );
  }

  if (action === 'payment-code') {
    return (
      <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.sectionLead}>
          <View style={styles.iconWell}><QrCode color="#d95f14" size={21} /></View>
          <View style={styles.sectionCopy}>
            <Typography.Heading type="h5">Commerce claim code</Typography.Heading>
            <Typography color="muted" type="body-xs">Recipient-locked EIP-712 intent with EIP-7702 authorization.</Typography>
          </View>
          <Chip color={paymentCodeConfigured ? 'accent' : 'warning'} size="sm" variant="soft">
            <Chip.Label>{paymentCodeConfigured ? '7702' : 'Setup required'}</Chip.Label>
          </Chip>
        </View>
        {paymentCode ? (
          <>
            <View style={styles.qrFrame}>
              <QRCodeStyled
                color="#7a2f22"
                data={paymentCode}
                errorCorrectionLevel="L"
                innerEyesOptions={{ borderRadius: 3, color: '#d95f14' }}
                outerEyesOptions={{ borderRadius: 5, color: '#7a2f22' }}
                padding={10}
                pieceBorderRadius={1}
                pieceSize={1.35}
              />
            </View>
            <Surface className="rounded-lg bg-default p-3 shadow-none" variant="transparent">
              <Typography selectable style={styles.paymentCode} type="body-xs">{paymentCode}</Typography>
            </Surface>
            <Typography color="muted" type="body-xs">Short CID. Merchant SDK resolves the signed Arbitrum envelope from IPFS.</Typography>
            <Typography color="muted" type="body-xs">
              {paymentCodeExpiry ? `Expires ${new Date(paymentCodeExpiry * 1000).toLocaleTimeString()}` : 'No expiry'}
            </Typography>
            <Button className="w-full rounded-lg" onPress={onCopyPaymentCode} variant="secondary">
              {copied ? <Check color="#23845b" size={18} /> : <Copy color="#52525b" size={18} />}
              <Button.Label>{copied ? 'Code copied' : 'Copy code'}</Button.Label>
            </Button>
            {fullPaymentCode ? (
              <Button className="w-full rounded-lg" onPress={onCopyFullPaymentCode} variant="ghost">
                {copiedFullPaymentCode ? <Check color="#23845b" size={18} /> : <Copy color="#52525b" size={18} />}
                <Button.Label>{copiedFullPaymentCode ? 'Full code copied' : 'Copy full code'}</Button.Label>
              </Button>
            ) : null}
          </>
        ) : paymentCodeConfigured ? (
          <>
            <Typography color="muted" type="body-sm">
              A public CID is safe only when it is locked to the recipient wallet. One signature creates both the short CID and a full fallback code.
            </Typography>
            <TextField isInvalid={Boolean(error)}>
              <Label>Recipient wallet</Label>
              <Input
                autoCapitalize="none"
                autoCorrect={false}
                className="rounded-lg border border-border bg-surface font-mono"
                editable={!generatingPaymentCode}
                onChangeText={onRecipientChange}
                placeholder="0x recipient address"
                spellCheck={false}
                value={recipient}
              />
            </TextField>
          </>
        ) : (
          <Typography color="muted" type="body-sm">
            Mogate7702Account and the Commerce Code gateway are not deployed on {item.networkLabel} yet. Generation stays disabled until their addresses are configured.
          </Typography>
        )}
        {error ? <Typography style={styles.error} type="body-xs">{error}</Typography> : null}
        {!paymentCode ? (
          <Button
            className="w-full rounded-lg"
            isDisabled={!paymentCodeConfigured || !recipient.trim() || generatingPaymentCode}
            onPress={onGeneratePaymentCode}
            variant="primary"
          >
            {generatingPaymentCode ? <ActivityIndicator color="#ffffff" size="small" /> : <QrCode color="#ffffff" size={18} />}
            <Button.Label>
              {generatingPaymentCode
                ? 'Waiting for signatures'
                : paymentCodeConfigured
                  ? 'Generate locked claim code'
                  : 'Mainnet setup required'}
            </Button.Label>
          </Button>
        ) : null}
      </Surface>
    );
  }

  return null;
}

function hasVisibleReserve(item: GiftcardInventoryItem) {
  try {
    return BigInt(item.gasReserveAtomic || '0') > 0n;
  } catch {
    return false;
  }
}

function ReserveGasSummary({
  item,
  note
}: {
  item: GiftcardInventoryItem;
  note: string;
}) {
  return (
    <View style={styles.reserveBlock}>
      <View style={styles.reserveSummaryRow}>
        <View style={styles.reserveLabel}>
          <Fuel color="#2f8f5b" size={17} />
          <Typography type="body-sm" weight="semibold">Reserved gas</Typography>
        </View>
        <Typography type="body-sm" weight="semibold">
          {formatFundAmount(item.gasReserveDisplay ?? '0', 'ETH')}
        </Typography>
      </View>
      <Typography color="muted" type="body-xs">{note}</Typography>
    </View>
  );
}

function formatFundAmount(value: string, symbol: string) {
  const [whole, fraction = ''] = value.split('.');
  const compactFraction = fraction.slice(0, 6).replace(/0+$/, '');
  return `${compactFraction ? `${whole}.${compactFraction}` : whole} ${symbol}`;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Typography color="muted" type="body-sm">{label}</Typography>
      <Typography numberOfLines={1} style={styles.detailValue} type="body-sm" weight="semibold">{value}</Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 20
  },
  section: {
    gap: 12
  },
  sectionLead: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  iconWell: {
    alignItems: 'center',
    backgroundColor: '#fff0e7',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  secureIcon: {
    alignItems: 'center',
    backgroundColor: '#e9f7ef',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  warningIcon: {
    alignItems: 'center',
    backgroundColor: '#fff0f1',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  dangerButton: {
    backgroundColor: '#a12f37'
  },
  reserveBlock: {
    borderBottomColor: '#e4e4e7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e4e7',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingVertical: 12
  },
  reserveSummaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  reserveLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  balanceRows: {
    borderBottomColor: '#e4e4e7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e4e4e7',
    borderTopWidth: StyleSheet.hairlineWidth
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 2
  },
  detailValue: {
    flex: 1,
    textAlign: 'right'
  },
  error: {
    color: '#a12f37'
  },
  code: {
    fontFamily: 'Courier',
    fontSize: 24,
    textAlign: 'center'
  },
  codeLabel: {
    marginBottom: 8,
    textAlign: 'center'
  },
  codeSeparator: {
    marginVertical: 16
  },
  successText: {
    color: '#246b4a',
    lineHeight: 20
  },
  qrFrame: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e4e4e7',
    borderRadius: 8,
    borderWidth: 1,
    height: 270,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 270
  },
  paymentCode: {
    fontFamily: 'Courier',
    lineHeight: 17,
    maxHeight: 86
  }
});
