import { useEffect, useState } from 'react';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { PreparedUnsafeCheckout } from '@/features/checkout/services/giftcardCheckout';

type DirectTokenBalanceState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  amount: number;
  error: string | null;
};

const IDLE_BALANCE: DirectTokenBalanceState = {
  status: 'idle',
  amount: 0,
  error: null
};

function encodeBalanceOf(ownerAddress: string) {
  const owner = ownerAddress.replace(/^0x/i, '').toLowerCase().padStart(64, '0');
  return `0x70a08231${owner}`;
}

function formatTokenAmount(raw: bigint, decimals: number) {
  const base = 10n ** BigInt(decimals);
  const whole = raw / base;
  const fraction = (raw % base).toString().padStart(decimals, '0').replace(/0+$/, '');
  return Number(`${whole.toString()}${fraction ? `.${fraction}` : ''}`);
}

async function readTokenBalance(input: {
  rpcUrl: string;
  tokenAddress: string;
  ownerAddress: string;
  decimals: number;
}) {
  const response = await fetch(input.rpcUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `checkout-balance-${Date.now()}`,
      method: 'eth_call',
      params: [
        {
          to: input.tokenAddress,
          data: encodeBalanceOf(input.ownerAddress)
        },
        'latest'
      ]
    })
  });
  if (!response.ok) throw new Error(`Balance RPC request failed ${response.status}.`);

  const body = await response.json() as {
    error?: { message?: string };
    result?: `0x${string}`;
  };
  if (body.error) throw new Error(body.error.message || 'Balance RPC returned an error.');
  return formatTokenAmount(BigInt(body.result || '0x0'), input.decimals);
}

export function useDirectTokenBalance(input: {
  checkout: PreparedUnsafeCheckout | null;
  ownerAddress: string;
  profile: RuntimeNetworkProfile;
}) {
  const [state, setState] = useState<DirectTokenBalanceState>(IDLE_BALANCE);

  useEffect(() => {
    const checkout = input.checkout;
    if (!checkout || !input.ownerAddress || checkout.tokenType !== 'erc20') {
      setState(IDLE_BALANCE);
      return;
    }
    const paymentToken = checkout.paymentToken;
    const tokenDecimals = checkout.tokenDecimals;

    let active = true;
    setState({ status: 'loading', amount: 0, error: null });

    async function loadBalance() {
      try {
        const amount = await readTokenBalance({
          rpcUrl: input.profile.ua.rpcUrl,
          tokenAddress: paymentToken,
          ownerAddress: input.ownerAddress,
          decimals: tokenDecimals
        });
        if (!active) return;
        setState({
          status: 'ready',
          amount: Number.isFinite(amount) ? amount : 0,
          error: null
        });
      } catch (error) {
        if (!active) return;
        setState({
          status: 'error',
          amount: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    void loadBalance();
    return () => {
      active = false;
    };
  }, [input.checkout, input.ownerAddress, input.profile]);

  return state;
}
