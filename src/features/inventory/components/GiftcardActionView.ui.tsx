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
  Eye,
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
  error,
  generatingPaymentCode,
  item,
  onBack,
  onClaim,
  onCopyPaymentCode,
  onGeneratePaymentCode,
  onOpenExplorer,
  onRecipientChange,
  onSend,
  paymentCode,
  paymentCodeExpiry,
  recipient,
  sending
}: {
  action: GiftcardAction;
  claimComplete: boolean;
  claimedCode: string | null;
  claimedPinCode: string | null;
  claiming: boolean;
  copied: boolean;
  error: string | null;
  generatingPaymentCode: boolean;
  item: GiftcardInventoryItem;
  onBack: () => void;
  onClaim: () => void | Promise<void>;
  onCopyPaymentCode: () => void | Promise<void>;
  onGeneratePaymentCode: () => void | Promise<void>;
  onOpenExplorer: () => void | Promise<void>;
  onRecipientChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  paymentCode: string | null;
  paymentCodeExpiry: number | null;
  recipient: string;
  sending: boolean;
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
        error={error}
        generatingPaymentCode={generatingPaymentCode}
        item={item}
        onClaim={onClaim}
        onCopyPaymentCode={onCopyPaymentCode}
        onGeneratePaymentCode={onGeneratePaymentCode}
        onOpenExplorer={onOpenExplorer}
        onRecipientChange={onRecipientChange}
        onSend={onSend}
        paymentCode={paymentCode}
        paymentCodeExpiry={paymentCodeExpiry}
        recipient={recipient}
        sending={sending}
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
  error,
  generatingPaymentCode,
  item,
  onClaim,
  onCopyPaymentCode,
  onGeneratePaymentCode,
  onOpenExplorer,
  onRecipientChange,
  onSend,
  paymentCode,
  paymentCodeExpiry,
  recipient,
  sending
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
        <TextField isInvalid={Boolean(error)}>
          <Label>Wallet address</Label>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-lg font-mono"
            onChangeText={onRecipientChange}
            placeholder="0x recipient address"
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

  if (action === 'claim') {
    return (
      <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.sectionLead}>
          <View style={claimComplete ? styles.secureIcon : styles.warningIcon}>
            {claimComplete ? <Check color="#2f8f5b" size={21} /> : <AlertTriangle color="#a12f37" size={21} />}
          </View>
          <View style={styles.sectionCopy}>
            <Typography.Heading type="h5">
              {item.isFunded
                ? 'Unwrap funded giftcard'
                : item.isUnwrapped
                  ? 'Reveal merchant code'
                  : 'Unwrap and claim'}
            </Typography.Heading>
            <Typography color="muted" type="body-xs">
              {item.isFunded
                ? 'Make the NFT soulbound and unlock its attached balances.'
                : item.isUnwrapped
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
              {item.isFunded
                ? 'The giftcard is soulbound. Withdraw each attached balance from the owner wallet.'
                : 'The merchant code was securely revealed for the current owner.'}
            </Typography>
          </Surface>
        ) : (
          <Typography color="muted" type="body-sm">
            {item.isFunded
              ? 'Unwrapping is permanent. The current owner can withdraw value and unused gas reserve afterward.'
              : item.isUnwrapped
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
            style={item.isFunded ? styles.dangerButton : undefined}
            variant="primary"
          >
            {claiming ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : item.isFunded ? (
              <PackageOpen color="#ffffff" size={18} />
            ) : (
              <KeyRound color="#ffffff" size={18} />
            )}
            <Button.Label>
              {claiming
                ? 'Confirming claim'
                : item.isFunded
                  ? 'Unwrap funded giftcard'
                  : item.isUnwrapped
                    ? 'Reveal merchant code'
                    : 'Unwrap and reveal'}
            </Button.Label>
          </Button>
        ) : null}
      </Surface>
    );
  }

  if (action === 'payment-code') {
    return (
      <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.sectionLead}>
          <View style={styles.iconWell}><QrCode color="#d95f14" size={21} /></View>
          <View style={styles.sectionCopy}>
            <Typography.Heading type="h5">Programmable payment code</Typography.Heading>
            <Typography color="muted" type="body-xs">15-minute signature-only handoff.</Typography>
          </View>
          <Chip color="accent" size="sm" variant="soft"><Chip.Label>Direct</Chip.Label></Chip>
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
            <Typography color="muted" type="body-xs">
              {paymentCodeExpiry ? `Expires ${new Date(paymentCodeExpiry * 1000).toLocaleTimeString()}` : 'No expiry'}
            </Typography>
            <Button className="w-full rounded-lg" onPress={onCopyPaymentCode} variant="secondary">
              {copied ? <Check color="#23845b" size={18} /> : <Copy color="#52525b" size={18} />}
              <Button.Label>{copied ? 'Code copied' : 'Copy code'}</Button.Label>
            </Button>
          </>
        ) : (
          <Typography color="muted" type="body-sm">
            Sign a bearer payment code for this NFT. The current direct phase does not attach a UA7702 authorization.
          </Typography>
        )}
        {error ? <Typography style={styles.error} type="body-xs">{error}</Typography> : null}
        {!paymentCode ? (
          <Button className="w-full rounded-lg" isDisabled={generatingPaymentCode} onPress={onGeneratePaymentCode} variant="primary">
            {generatingPaymentCode ? <ActivityIndicator color="#ffffff" size="small" /> : <QrCode color="#ffffff" size={18} />}
            <Button.Label>{generatingPaymentCode ? 'Waiting for signature' : 'Generate payment code'}</Button.Label>
          </Button>
        ) : null}
      </Surface>
    );
  }

  return null;
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
