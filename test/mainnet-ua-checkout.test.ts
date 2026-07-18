import { Signature, parseEther } from 'ethers';
import { describe, expect, it, vi } from 'vitest';
import type { ITransaction } from '@particle-network/universal-account-sdk';

import {
  buildGiftcardExpectTokens,
  createUniversalAccount,
  getUniversalTransactionState,
  signEip7702Authorizations
} from '../src/@web3/services/particleUniversalAccount';
import type { WalletAdapter } from '../src/@web3/types/wallet';
import {
  DEFAULT_NETWORK_MODE,
  getNetworkProfile
} from '../src/config/networkProfiles';
import { getCheckoutFundingReadiness } from '../src/features/checkout/services/checkoutReadiness';
import type { PreparedUnsafeCheckout } from '../src/features/checkout/services/giftcardCheckout';
import { assertGatewayExecutionMode } from '../src/features/checkout/services/giftcardPayment';

describe('Mainnet Particle UA checkout policy', () => {
  it('understands Particle v2 numeric terminal states', () => {
    expect(getUniversalTransactionState({ status: 3 })).toBe('wait_to_refund');
    expect(getUniversalTransactionState({ status: 6 })).toBe('execution_failed');
    expect(getUniversalTransactionState({ status: 7 })).toBe('finished');
    expect(getUniversalTransactionState({ status: 11 })).toBe('refund_finished');
  });

  it('starts on Mainnet and locks each profile to its configured execution mode', () => {
    expect(DEFAULT_NETWORK_MODE).toBe('mainnet');
    expect(getNetworkProfile('mainnet').gatewayExecutionMode).toBe('ua7702');
    expect(getNetworkProfile('testnet').gatewayExecutionMode).toBe('direct');
  });

  it('rejects direct Mainnet execution before a wallet provider is used', () => {
    expect(() => assertGatewayExecutionMode({
      profile: getNetworkProfile('mainnet'),
      ua7702: false
    })).toThrow(/requires ua7702 execution/);

    expect(() => assertGatewayExecutionMode({
      profile: getNetworkProfile('testnet'),
      ua7702: true
    })).toThrow(/requires direct execution/);
  });

  it('uses unified stablecoins and does not require target-chain native gas in UA mode', () => {
    expect(getCheckoutFundingReadiness({
      executionMode: 'ua7702',
      balanceStatus: 'ready',
      requestedAmount: 50,
      targetNativeAmount: 0,
      targetUsdcAmount: 0,
      unifiedStablecoinAmount: 75
    })).toEqual({
      hasSpendableBalance: true,
      hasTargetGas: true
    });

    expect(getCheckoutFundingReadiness({
      executionMode: 'direct',
      balanceStatus: 'ready',
      requestedAmount: 50,
      targetNativeAmount: 0,
      targetUsdcAmount: 75,
      unifiedStablecoinAmount: 75
    }).hasTargetGas).toBe(false);
  });

  it('routes both target stablecoins and payable gateway value before checkout', () => {
    const profile = getNetworkProfile('mainnet');
    const usdc = profile.stablecoinRoutes
      .find((route) => route.chainId === profile.ua.targetChainId)!
      .tokens.find((token) => token.symbol === 'USDC')!;

    const expectTokens = buildGiftcardExpectTokens(
      { SUPPORTED_TOKEN_TYPE: { ETH: 'eth', USDC: 'usdc', USDT: 'usdt' } },
      {
        paymentToken: usdc.address,
        amountAtomic: 25_000n,
        tokenDecimals: usdc.decimals,
        fundedAssets: [{
          token: usdc.address,
          amountAtomic: 75_000n,
          amountDisplay: '0.075',
          currency: 'USDC',
          tokenDecimals: usdc.decimals
        }]
      } as PreparedUnsafeCheckout,
      [{ value: `0x${parseEther('0.0001').toString(16)}` }],
      profile
    );

    expect(expectTokens).toEqual([
      { type: 'usdc', amount: '0.1' },
      { type: 'eth', amount: '0.0001' }
    ]);
  });

  it('fails closed before loading the SDK when Particle credentials are missing', async () => {
    const profile = {
      ...getNetworkProfile('mainnet'),
      particle: {
        ...getNetworkProfile('mainnet').particle,
        projectId: '',
        clientKey: '',
        appId: ''
      }
    };

    await expect(
      createUniversalAccount('0x1111111111111111111111111111111111111111', profile)
    ).rejects.toThrow(/EXPO_PUBLIC_PARTICLE_PROJECT_ID/);
  });

  it('reuses one 7702 signature for duplicate chain, delegate, and nonce requests', async () => {
    const signature = Signature.from({
      r: `0x${'00'.repeat(31)}01`,
      s: `0x${'00'.repeat(31)}02`,
      v: 27
    }).serialized as `0x${string}`;
    const sign7702Authorization = vi.fn().mockResolvedValue({ signature });
    const wallet = {
      stack: 'privy',
      label: 'Privy',
      connect: vi.fn(),
      disconnect: vi.fn(),
      refresh: vi.fn(),
      signMessage: vi.fn(),
      sign7702Authorization
    } as unknown as WalletAdapter;
    const auth = {
      chainId: 42161,
      nonce: 9,
      address: '0x2222222222222222222222222222222222222222'
    };
    const transaction = {
      userOps: [
        { userOpHash: '0xaaa', eip7702Auth: auth, eip7702Delegated: false },
        { userOpHash: '0xbbb', eip7702Auth: auth, eip7702Delegated: false },
        { userOpHash: '0xccc', eip7702Auth: auth, eip7702Delegated: true }
      ]
    } as unknown as ITransaction;

    const authorizations = await signEip7702Authorizations(wallet, transaction);

    expect(sign7702Authorization).toHaveBeenCalledTimes(1);
    expect(authorizations).toEqual([
      { userOpHash: '0xaaa', signature },
      { userOpHash: '0xbbb', signature }
    ]);
  });
});
