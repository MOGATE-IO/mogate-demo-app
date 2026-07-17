import { useCallback, useState } from 'react';

export function useScanCode() {
  const [payload, setPayload] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const inspect = useCallback(() => {
    const value = payload.trim();
    if (!value) return;
    setResult(value.startsWith('mogate:') || value.startsWith('ethereum:')
      ? 'Payment code recognized.'
      : 'Code captured for review.');
  }, [payload]);

  return { inspect, payload, result, setPayload };
}
