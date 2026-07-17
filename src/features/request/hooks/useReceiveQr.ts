import { useCallback, useState } from 'react';
import * as Clipboard from 'expo-clipboard';

export function useReceiveQr(ownerAddress: string) {
  const [copied, setCopied] = useState(false);

  const copyAddress = useCallback(async () => {
    if (!ownerAddress) return;
    await Clipboard.setStringAsync(ownerAddress);
    setCopied(true);
  }, [ownerAddress]);

  return {
    copied,
    copyAddress,
    payload: ownerAddress ? `ethereum:${ownerAddress}` : ''
  };
}
