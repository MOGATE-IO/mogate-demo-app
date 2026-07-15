import { describe, expect, it } from 'vitest';

import {
  getStablecoinPortfolio,
  withTargetUsdcBalance
} from '../src/features/checkout/services/paymentBalances';

describe('stablecoin checkout portfolio', () => {
  it('combines visible USDC and USDT while limiting direct spend to target-chain USDC', () => {
    const portfolio = getStablecoinPortfolio([
      {
        tokenType: 'usdc',
        amount: 110,
        amountInUSD: 110,
        chainAggregation: [
          {
            token: { chainId: 1, address: '0x111', symbol: 'USDC' },
            amount: 90,
            amountInUSD: 90
          },
          {
            token: { chainId: 421614, address: '0x222', symbol: 'USDC' },
            amount: 20,
            amountInUSD: 20
          }
        ]
      },
      {
        tokenType: 'usdt',
        amount: 15,
        amountInUSD: 15,
        chainAggregation: [
          {
            token: { chainId: 421614, address: '0x333', symbol: 'USDT' },
            amount: 15,
            amountInUSD: 15
          }
        ]
      },
      {
        tokenType: 'eth',
        amount: 5,
        amountInUSD: 15000
      }
    ], 421614);

    expect(portfolio.totalUsd).toBe(125);
    expect(portfolio.targetUsdc).toBe(20);
    expect(portfolio.rows).toHaveLength(3);
  });

  it('does not show zero stablecoin rows', () => {
    const portfolio = getStablecoinPortfolio([
      {
        tokenType: 'USDC',
        amount: 0,
        amountInUSD: 0,
        chainAggregation: [
          {
            token: { chainId: 421614, address: '0x222', symbol: 'USDC' },
            amount: 0,
            amountInUSD: 0
          }
        ]
      }
    ], 421614);

    expect(portfolio).toEqual({
      rows: [],
      totalUsd: 0,
      targetUsdc: 0
    });
  });

  it('replaces aggregate target-chain USDC with the exact direct token read', () => {
    const aggregate = getStablecoinPortfolio([
      {
        tokenType: 'USDC',
        amount: 100,
        amountInUSD: 100,
        chainAggregation: [
          {
            token: { chainId: 1, address: '0x111', symbol: 'USDC' },
            amount: 90,
            amountInUSD: 90
          },
          {
            token: { chainId: 11155111, address: '0xold', symbol: 'USDC' },
            amount: 10,
            amountInUSD: 10
          }
        ]
      }
    ], 11155111);

    const portfolio = withTargetUsdcBalance(aggregate, {
      amount: 20,
      chainId: 11155111,
      chainLabel: 'Ethereum Sepolia',
      tokenAddress: '0xnew'
    });

    expect(portfolio.totalUsd).toBe(110);
    expect(portfolio.targetUsdc).toBe(20);
    expect(portfolio.rows.find((row) => row.chainId === 11155111)).toMatchObject({
      amount: 20,
      tokenAddress: '0xnew'
    });
  });
});
