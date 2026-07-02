import { describe, expect, it } from 'vitest';

import {
  SIGNER_PROVIDER_INFO,
  isProductEip7702Signer
} from '../src/@web3/config/signerProviders';
import { getProductReadinessChecks } from '../src/config/productReadiness';
import {
  PARTICLE_PRIMARY_ASSETS,
  describeParticlePrimaryAssetConfig,
  getParticlePrimaryAssetsForChain,
  isParticlePrimaryAsset,
  isParticlePrimaryAssetOnChain,
  isPublicParticleUaChain
} from '../src/config/particleUaSupport';
import {
  assertCheckoutReceiverIsOwner,
  getDirectCheckoutTemplate,
  isSameEvmAddress,
  parsePreparedCheckoutJson
} from '../src/features/checkout/services/giftcardCheckout';
import { summarizePrivyIdentity } from '../src/@web3/providers/privy/privyIdentity';

describe('Particle UA EIP-7702 product invariants', () => {
  it('enables only native-clean embedded EIP-7702 signers for product sends', () => {
    expect(isProductEip7702Signer('privy')).toBe(true);
    expect(isProductEip7702Signer('magic')).toBe(false);
    expect(isProductEip7702Signer('dynamic')).toBe(false);
    expect(isProductEip7702Signer('particle')).toBe(false);
    expect(SIGNER_PROVIDER_INFO.privy.authorizationApi).toBe(
      'useSign7702Authorization().signAuthorization()'
    );
  });

  it('keeps reference-only Magic out of product sends', () => {
    expect(SIGNER_PROVIDER_INFO.magic.readiness).toBe('blocked');
    expect(SIGNER_PROVIDER_INFO.magic.productEnabled).toBe(false);
    expect(SIGNER_PROVIDER_INFO.magic.authorizationApi).toBe('magic.wallet.sign7702Authorization()');
  });

  it('keeps Particle Auth probe out of the product signer path', () => {
    expect(SIGNER_PROVIDER_INFO.particle.readiness).toBe('probe');
    expect(SIGNER_PROVIDER_INFO.particle.productEnabled).toBe(false);
    expect(SIGNER_PROVIDER_INFO.particle.authorizationApi).toMatch(/not a verified production signer/i);
  });

  it('surfaces product blockers before minting', () => {
    const checks = Object.fromEntries(
      getProductReadinessChecks('privy').map((check) => [check.id, check])
    );

    expect(checks['particle-config']?.status).toBe('blocked');
    expect(checks.signer?.status).toBe('ready');
    expect(checks['signer-config']?.status).toBe('blocked');
    expect(checks.chain?.status).toBe('ready');
    expect(checks.gateway?.status).toBe('blocked');
  });

  it('prepares checkout templates for the owner EOA, not a deposit account', () => {
    const owner = '0x1111111111111111111111111111111111111111';
    const parsed = parsePreparedCheckoutJson(getDirectCheckoutTemplate(owner), owner);

    expect(parsed.to).toBe(owner);
    expect(parsed.gatewayVersion).toBe('v2');
    expect(() => assertCheckoutReceiverIsOwner(parsed, owner)).not.toThrow();
  });

  it('blocks prepared checkout JSON for a different receiver before UA signing', () => {
    const owner = '0x1111111111111111111111111111111111111111';
    const wrongReceiver = '0x2222222222222222222222222222222222222222';
    const parsed = parsePreparedCheckoutJson(getDirectCheckoutTemplate(wrongReceiver), owner);

    expect(() => assertCheckoutReceiverIsOwner(parsed, owner)).toThrow(/does not match owner EOA/);
  });

  it('compares EVM addresses case-insensitively', () => {
    expect(
      isSameEvmAddress(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        '0xABCDEFABCDEFABCDEFABCDEFABCDEFABCDEFABCD'
      )
    ).toBe(true);
  });

  it('keeps Particle UA support explicit by public chain and primary asset', () => {
    expect(isPublicParticleUaChain(42161)).toBe(true);
    expect(isPublicParticleUaChain(101)).toBe(true);
    expect(isPublicParticleUaChain(421614)).toBe(false);
    expect(PARTICLE_PRIMARY_ASSETS).toContain('USDC');
    expect(PARTICLE_PRIMARY_ASSETS).toContain('SOL');
    expect(isParticlePrimaryAsset('USDC')).toBe(true);
    expect(isParticlePrimaryAsset('MOGATE')).toBe(false);
    expect(getParticlePrimaryAssetsForChain(101)).toEqual(['USDC', 'USDT', 'SOL']);
    expect(isParticlePrimaryAssetOnChain(8453, 'USDC')).toBe(true);
    expect(isParticlePrimaryAssetOnChain(8453, 'USDT')).toBe(false);
    expect(isParticlePrimaryAssetOnChain(421614, 'USDC')).toBe(false);
    expect(
      describeParticlePrimaryAssetConfig({
        chainId: 8453,
        asset: 'USDT'
      }).status
    ).toBe('blocked');
    expect(
      describeParticlePrimaryAssetConfig({
        chainId: 421614,
        asset: 'USDC',
        allowUnlistedTestnet: true
      }).status
    ).toBe('idle');
    expect(
      describeParticlePrimaryAssetConfig({
        chainId: 42161,
        asset: 'MOGATE'
      }).status
    ).toBe('blocked');
  });

  it('summarizes Privy identity continuity without hiding wallet-index mismatches', () => {
    const identity = summarizePrivyIdentity({
      user: {
        id: 'did:privy:user-1',
        created_at: 1780000000,
        linked_accounts: [
          {
            type: 'google_oauth',
            subject: 'google-subject',
            email: 'alice@example.com'
          },
          {
            type: 'wallet',
            chain_type: 'ethereum',
            connector_type: 'embedded',
            address: '0x1111111111111111111111111111111111111111',
            wallet_index: 0
          },
          {
            type: 'wallet',
            chain_type: 'ethereum',
            connector_type: 'embedded',
            address: '0x2222222222222222222222222222222222222222',
            wallet_index: 1
          }
        ]
      },
      evmWallets: [],
      solanaWallets: []
    });

    expect(identity.providerUserId).toBe('did:privy:user-1');
    expect(identity.loginMethods).toEqual(['google_oauth']);
    expect(identity.oauthSubjects).toEqual(['google_oauth:google-subject']);
    expect(identity.oauthEmails).toEqual(['google_oauth:alice@example.com']);
    expect(identity.embeddedEvmWallets).toHaveLength(2);
    expect(identity.warnings).toContain(
      'Multiple embedded EVM wallets are linked; confirm which wallet index web uses.'
    );
  });
});
