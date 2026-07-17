import { useMemo, useState } from 'react';

export function usePaymentRequest({
  networkMode,
  ownerAddress
}: {
  networkMode: string;
  ownerAddress: string;
}) {
  const [amount, setAmount] = useState('50');
  const [memo, setMemo] = useState('Giftcard request');
  const [createdAt, setCreatedAt] = useState<number | null>(null);

  const requestId = useMemo(() => {
    if (!createdAt) return '';
    return `mogate:req:${networkMode}:${ownerAddress.slice(2, 8)}:${createdAt}`;
  }, [createdAt, networkMode, ownerAddress]);

  return {
    amount,
    create: () => setCreatedAt(Date.now()),
    memo,
    requestId,
    setAmount,
    setMemo
  };
}
