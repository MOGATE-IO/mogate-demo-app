import { Button, Input, Label, Surface, TextField, Typography } from 'heroui-native';
import { CheckCircle2, ScanLine } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { FixedHeaderScrollView } from '@/components/FixedHeaderScrollView.ui';
import { PageHeader } from '@/components/PageHeader.ui';

export function ScanCodeView({
  onBack,
  onInspect,
  onPayloadChange,
  payload,
  result
}: {
  onBack: () => void;
  onInspect: () => void;
  onPayloadChange: (value: string) => void;
  payload: string;
  result: string | null;
}) {
  return (
    <FixedHeaderScrollView
      contentContainerStyle={styles.stack}
      header={<PageHeader backLabel="Back" onBack={onBack} subtitle="Mogate and wallet payment codes" title="Scan code" />}
    >

      <Surface className="rounded-lg border border-border bg-surface p-4 shadow-none">
        <View style={styles.scanFrame}>
          <View style={styles.scanIcon}>
            <ScanLine color="#d95f14" size={44} strokeWidth={1.8} />
          </View>
          <View style={styles.scanBeam} />
        </View>
      </Surface>

      <Surface className="gap-4 rounded-lg border border-border bg-surface p-4 shadow-none">
        <TextField>
          <Label>QR or payment code</Label>
          <Input
            autoCapitalize="none"
            autoCorrect={false}
            className="rounded-lg"
            onChangeText={onPayloadChange}
            placeholder="Paste scanned payload"
            value={payload}
          />
        </TextField>
        <Button className="w-full rounded-lg" isDisabled={!payload.trim()} onPress={onInspect} variant="primary">
          <ScanLine color="#ffffff" size={18} />
          <Button.Label>Review code</Button.Label>
        </Button>
        {result ? (
          <View style={styles.result}>
            <CheckCircle2 color="#2f8f5b" size={18} />
            <Typography style={styles.resultText} type="body-sm" weight="medium">{result}</Typography>
          </View>
        ) : null}
      </Surface>
    </FixedHeaderScrollView>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 18
  },
  scanFrame: {
    alignItems: 'center',
    backgroundColor: '#fff8f5',
    borderColor: '#efc9b8',
    borderRadius: 8,
    borderWidth: 1,
    height: 260,
    justifyContent: 'center',
    overflow: 'hidden'
  },
  scanIcon: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    height: 88,
    justifyContent: 'center',
    width: 88
  },
  scanBeam: {
    backgroundColor: '#e9680c',
    height: 2,
    left: 28,
    opacity: 0.72,
    position: 'absolute',
    right: 28,
    top: '50%'
  },
  result: {
    alignItems: 'center',
    backgroundColor: '#eaf7f0',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    padding: 12
  },
  resultText: {
    color: '#246b4a',
    flex: 1
  }
});
