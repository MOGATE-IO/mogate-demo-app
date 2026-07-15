import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';

export type TopUpProvider = 'moonpay' | 'transak';

export function useTopUpSheet() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyAddress(label: string, address?: string | null) {
    if (!address) return;
    await Clipboard.setStringAsync(address);
    setCopied(label);
    setTimeout(() => setCopied(null), 1400);
  }

  return {
    visible,
    copied,
    open: () => setVisible(true),
    close: () => setVisible(false),
    copyAddress
  };
}

