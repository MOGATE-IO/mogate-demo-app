import {
  Button,
  Input,
  Label,
  Separator,
  Surface,
  TextField,
  Typography
} from 'heroui-native';
import { Check, Copy, HandCoins } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import { PageHeader } from '@/components/PageHeader.ui';
import { shortenAddress } from '@/utils/format';

export type RequestPaymentViewProps = {
  amount: string;
  memo: string;
  ownerAddress: string;
  requestId: string;
  onBack: () => void;
  onAmountChange: (value: string) => void;
  onCreate: () => void;
  onMemoChange: (value: string) => void;
};

export function RequestPaymentView({
  amount,
  memo,
  onBack,
  onAmountChange,
  onCreate,
  onMemoChange,
  ownerAddress,
  requestId
}: RequestPaymentViewProps) {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.stack}
      header={<PageHeader
        backLabel="Back"
        onBack={onBack}
        subtitle="Create a USD request for your connected wallet"
        title="Request payment"
      />}
    >

      <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.recipientRow}>
          <View style={styles.iconWell}>
            <HandCoins color="#e9680c" size={21} />
          </View>
          <View style={styles.recipientCopy}>
            <Typography color="muted" type="body-xs">Recipient wallet</Typography>
            <Typography selectable type="body-sm" weight="semibold">
              {shortenAddress(ownerAddress)}
            </Typography>
          </View>
        </View>

        <Separator style={styles.separator} />

        <View style={styles.fields}>
          <TextField>
            <Label>Amount (USD)</Label>
            <Input
              className="rounded-lg"
              inputMode="decimal"
              keyboardType="decimal-pad"
              onChangeText={onAmountChange}
              placeholder="50"
              value={amount}
            />
          </TextField>
          <TextField>
            <Label>Memo</Label>
            <Input
              className="rounded-lg"
              onChangeText={onMemoChange}
              placeholder="Giftcard request"
              value={memo}
            />
          </TextField>
        </View>

        <Button
          className="mt-4 w-full rounded-lg"
          isDisabled={!ownerAddress || !amount.trim()}
          onPress={onCreate}
          variant="primary"
        >
          <HandCoins color="#ffffff" size={18} />
          <Button.Label>Create request</Button.Label>
        </Button>
      </Surface>

      {requestId ? (
        <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
          <View style={styles.draftHeader}>
            <View style={styles.successIcon}>
              <Check color="#2f8f5b" size={18} />
            </View>
            <View style={styles.draftCopy}>
              <Typography type="body-sm" weight="semibold">Request ready</Typography>
              <Typography color="muted" type="body-xs">{amount} USD / {memo}</Typography>
            </View>
          </View>
          <View style={styles.requestId}>
            <Typography selectable style={styles.mono} type="body-xs">{requestId}</Typography>
            <Copy color="#71717a" size={17} />
          </View>
        </Surface>
      ) : null}
    </FixedHeaderScrollView>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 18
  },
  recipientRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  iconWell: {
    alignItems: 'center',
    backgroundColor: '#fff0e5',
    borderRadius: 8,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  recipientCopy: {
    flex: 1,
    gap: 2
  },
  separator: {
    marginVertical: 14
  },
  fields: {
    gap: 14
  },
  draftHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  successIcon: {
    alignItems: 'center',
    backgroundColor: '#e7f7ef',
    borderRadius: 8,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  draftCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  requestId: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 12
  },
  mono: {
    flex: 1,
    fontFamily: 'Courier'
  }
});
