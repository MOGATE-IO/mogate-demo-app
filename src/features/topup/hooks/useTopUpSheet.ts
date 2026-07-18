import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';

export type TopUpProvider = 'moonpay' | 'transak';

export function useTopUpSheet() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  async function copyAddress(label: string, address?: string | null) {
    if (!address) return;
    setCopyError(null);

    try {
      const copiedToClipboard = await Clipboard.setStringAsync(address);
      if (!copiedToClipboard) throw new Error('Clipboard rejected the address.');
      setCopied(label);
      setTimeout(() => setCopied(null), 1400);
    } catch (_error) {
      setCopyError('Could not copy the address. Try selecting the address text instead.');
    }
  }

  return {
    visible,
    copied,
    copyError,
    open: () => setVisible(true),
    close: () => setVisible(false),
    copyAddress
  };
}
