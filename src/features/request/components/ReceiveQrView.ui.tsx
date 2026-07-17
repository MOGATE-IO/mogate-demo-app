import QRCodeStyled from 'react-native-qrcode-styled';
import { Button, Chip, Surface, Typography } from 'heroui-native';
import { Check, Copy, QrCode } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import { PageHeader } from '@/components/PageHeader.ui';
import { shortenAddress } from '@/utils/format';

export function ReceiveQrView({
  copied,
  networkLabel,
  onBack,
  onCopy,
  ownerAddress,
  payload
}: {
  copied: boolean;
  networkLabel: string;
  onBack: () => void;
  onCopy: () => void | Promise<void>;
  ownerAddress: string;
  payload: string;
}) {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.stack}
      header={<PageHeader backLabel="Back" onBack={onBack} subtitle={networkLabel} title="My QR code" />}
    >

      <Surface className="items-center gap-5 rounded-lg border border-border bg-surface p-5 shadow-none">
        <View style={styles.qrFrame}>
          {payload ? (
            <QRCodeStyled
              color="#7a2f22"
              data={payload}
              errorCorrectionLevel="H"
              innerEyesOptions={{ borderRadius: 4, color: '#d95f14' }}
              outerEyesOptions={{ borderRadius: 6, color: '#7a2f22' }}
              padding={16}
              pieceBorderRadius={2}
              pieceSize={6.4}
            />
          ) : (
            <QrCode color="#a1a1aa" size={120} />
          )}
        </View>
        <View style={styles.addressCopy}>
          <Typography align="center" type="body-sm" weight="semibold">
            {shortenAddress(ownerAddress)}
          </Typography>
          <Chip color="accent" size="sm" variant="soft">
            <Chip.Label>{networkLabel}</Chip.Label>
          </Chip>
        </View>
        <Button className="w-full rounded-lg" isDisabled={!ownerAddress} onPress={onCopy} variant="primary">
          {copied ? <Check color="#ffffff" size={18} /> : <Copy color="#ffffff" size={18} />}
          <Button.Label>{copied ? 'Address copied' : 'Copy address'}</Button.Label>
        </Button>
      </Surface>
    </FixedHeaderScrollView>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 20
  },
  qrFrame: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#ece7e5',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 250,
    minWidth: 250,
    overflow: 'hidden'
  },
  addressCopy: {
    alignItems: 'center',
    gap: 8
  }
});
