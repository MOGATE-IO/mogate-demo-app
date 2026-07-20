import { describe, expect, it } from 'vitest';

import { NETWORK_PROFILES } from '@/config/networkProfiles';
import {
  buildTransferAssets,
  formatTransferAssetAmount,
  getTransferNetworks,
  isSmallTransferAsset,
  validateTransferAmount,
  validateTransferRecipient
} from '@/features/transfer/services/transferAssets';

describe('transfer assets', () => {
  it('prefers exact RPC balances over Particle aggregation', () => {
    const assets = buildTransferAssets({
      profile: NETWORK_PROFILES.mainnet,
      portfolio: {
        totalUsd: 12,
        targetUsdc: 12,
        rows: [{
          id: 'USDC-42161',
          symbol: 'USDC',
          chainId: 42161,
          chainLabel: 'Arbitrum',
          tokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
          amount: 12,
          amountInUsd: 12
        }]
      },
      nativeRows: [],
      particleAssets: [{
        tokenType: 'USDC',
        chainAggregation: [{
          amount: 8,
          amountInUSD: 8,
          token: {
            chainId: 42161,
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 18,
            realDecimals: 6
          }
        }]
      }]
    });

    expect(assets).toHaveLength(1);
    expect(assets[0]).toMatchObject({ amount: 12, amountUsd: 12, decimals: 6 });
  });

  it('validates EVM and Solana recipients by selected network', () => {
    const evmAsset = {
      id: 'evm',
      chainId: 42161,
      chainLabel: 'Arbitrum',
      networkFamily: 'evm' as const,
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      decimals: 6,
      amount: 10,
      amountUsd: 10,
      kind: 'token' as const
    };
    const solanaAsset = {
      ...evmAsset,
      id: 'solana',
      chainId: 101,
      chainLabel: 'Solana',
      networkFamily: 'solana' as const,
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    };

    expect(validateTransferRecipient(evmAsset, '0x3024C1E1D91Ab3730bed94610CC1CdD546702D80')).toBeNull();
    expect(validateTransferRecipient(evmAsset, 'not-a-wallet')).toContain('0x');
    expect(validateTransferRecipient(solanaAsset, '8opHzTAnfzRpPEx21XtnrVTX28YQuCpAjcn1PczScKh')).toBeNull();
  });

  it('guards max balance, decimals, and small-balance visibility', () => {
    const asset = {
      id: 'usdc',
      chainId: 1,
      chainLabel: 'Ethereum',
      networkFamily: 'evm' as const,
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      amount: 2,
      amountUsd: 2,
      kind: 'token' as const
    };

    expect(validateTransferAmount(asset, '2')).toBeNull();
    expect(validateTransferAmount(asset, '2.1')).toContain('Maximum');
    expect(validateTransferAmount(asset, '0.0000001')).toContain('6 decimals');
    expect(isSmallTransferAsset({ ...asset, amount: 0.005, amountUsd: 0.005 })).toBe(true);
    expect(isSmallTransferAsset({ ...asset, amount: 0.01, amountUsd: 0.01 })).toBe(false);
    expect(formatTransferAssetAmount({ ...asset, amount: 0.01 })).toBe('0.01');
    expect(formatTransferAssetAmount({
      ...asset,
      amount: 0.000000123456,
      amountUsd: null,
      decimals: 18,
      kind: 'native',
      symbol: 'ETH'
    })).toBe('0.0000001235');
  });

  it('keeps configured networks visible with Arbitrum first and Solana included', () => {
    const networks = getTransferNetworks(NETWORK_PROFILES.mainnet, []);
    expect(networks.map((network) => network.chainId)).toEqual([42161, 1, 8453, 101]);
  });
});
