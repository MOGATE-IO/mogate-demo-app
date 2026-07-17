import { ScanCodeView } from '@/features/request/components/ScanCodeView.ui';
import { useScanCode } from '@/features/request/hooks/useScanCode';

export function ScanCodeScreen({ onBack }: { onBack: () => void }) {
  const scan = useScanCode();
  return (
    <ScanCodeView
      onBack={onBack}
      onInspect={scan.inspect}
      onPayloadChange={scan.setPayload}
      payload={scan.payload}
      result={scan.result}
    />
  );
}
