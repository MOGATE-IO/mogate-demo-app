import { useMemo, useState } from 'react';

import type { CheckoutReceiverType, CheckoutSelection } from '@/screens/types';

const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

export function useMintCheckoutForm(input: {
  selection: CheckoutSelection | null;
  onChange: (selection: Partial<CheckoutSelection>) => void;
}) {
  const [regionOpen, setRegionOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const regionOptions = useMemo(() => {
    const selection = input.selection;
    if (!selection) return [];
    return Array.from(new Set([
      selection.region,
      ...selection.merchant.regions,
      selection.merchant.country
    ].filter((region): region is string => Boolean(region))));
  }, [input.selection]);

  const receiverType = input.selection?.receiverType ?? 'wallet';
  const receiverAddress = input.selection?.receiverAddress.trim() ?? '';
  const receiverError = receiverType !== 'wallet'
    ? `${receiverType === 'email' ? 'Email' : 'X'} delivery is not enabled for direct testnet checkout.`
    : receiverAddress && !EVM_ADDRESS_PATTERN.test(receiverAddress)
      ? 'Enter a valid EVM receiver address.'
      : null;

  return {
    advancedOpen,
    regionOpen,
    regionOptions,
    receiverError,
    receiverValid: receiverType === 'wallet' && Boolean(receiverAddress) && !receiverError,
    toggleAdvanced: () => setAdvancedOpen((open) => !open),
    toggleRegion: () => setRegionOpen((open) => !open),
    selectAmount: (amount: number) => input.onChange({ amount }),
    selectRegion: (region: string) => {
      input.onChange({ region });
      setRegionOpen(false);
    },
    setReceiverAddress: (receiverAddress: string) => input.onChange({ receiverAddress }),
    setReceiverContact: (receiverContact: string) => input.onChange({ receiverContact }),
    setReceiverType: (receiverType: CheckoutReceiverType) => input.onChange({ receiverType }),
    setCouponCode: (couponCode: string) => input.onChange({ couponCode }),
    setAutoMint: (autoMint: boolean) => input.onChange({ autoMint }),
    setAutoUnwrap: (autoUnwrap: boolean) => input.onChange({ autoUnwrap }),
    setReserveGas: (reserveGas: boolean) => input.onChange({ reserveGas })
  };
}
