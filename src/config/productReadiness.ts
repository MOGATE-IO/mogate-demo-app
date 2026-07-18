import { isPublicParticleUaChain } from '@/config/contracts';
import {
  getDefaultNetworkProfile,
  hasParticleProjectConfig,
  hasPrivyProfileConfig,
  type RuntimeNetworkProfile
} from '@/config/networkProfiles';
import { describeParticlePrimaryAssetConfig } from '@/config/particleUaSupport';
import { getSignerProviderInfo, isProductEip7702Signer } from '@/@web3/config/signerProviders';
import type { WalletStack } from '@/@web3/types/wallet';

export type ProductReadinessCheck = {
  id: string;
  label: string;
  status: 'ready' | 'blocked' | 'idle';
  detail: string;
};

function isAddress(value?: string | null) {
  return Boolean(value && /^0x[a-fA-F0-9]{40}$/.test(value));
}

export function getProductReadinessChecks(
  stack: WalletStack,
  profile: RuntimeNetworkProfile = getDefaultNetworkProfile()
): ProductReadinessCheck[] {
  const provider = getSignerProviderInfo(stack);
  const uaRequired = profile.gatewayExecutionMode === 'ua7702';
  const publicUaChain = isPublicParticleUaChain(profile.ua.targetChainId);
  const chainAllowed = publicUaChain;
  const assetSupport = describeParticlePrimaryAssetConfig({
    chainId: profile.ua.targetChainId,
    asset: profile.ua.expectTokenType,
    allowUnlistedTestnet: profile.ua.allowUnlistedTestnet
  });
  const fundedGatewayReady =
    profile.gateway.version === 'signed-v1' || profile.gateway.version === 'signed-v2'
        ? isAddress(profile.gateway.signedAddress) && isAddress(profile.gateway.fundedCollection)
        : isAddress(profile.gateway.legacyAddress) && isAddress(profile.gateway.legacyCollection);
  const signerConfigReady = stack !== 'privy' || hasPrivyProfileConfig(profile);

  return [
    {
      id: 'particle-config',
      label: 'Particle project',
      status: uaRequired
        ? hasParticleProjectConfig(profile) ? 'ready' : 'blocked'
        : 'idle',
      detail: uaRequired
        ? hasParticleProjectConfig(profile)
          ? 'Particle UA project is configured for Mainnet checkout.'
          : 'Configure the Particle project ID, client key, and app ID before Mainnet checkout.'
        : 'The direct Testnet checkout does not use Particle UA.'
    },
    {
      id: 'signer',
      label: '7702 signer',
      status: isProductEip7702Signer(stack) ? 'ready' : 'blocked',
      detail: isProductEip7702Signer(stack)
        ? `${provider.label} is enabled for product UA sends.`
        : `${provider.label} is ${provider.readiness}. ${provider.setupNote}`
    },
    {
      id: 'signer-config',
      label: 'Signer project',
      status: signerConfigReady ? (stack === 'privy' ? 'ready' : 'idle') : 'blocked',
      detail:
        stack === 'privy'
          ? hasPrivyProfileConfig(profile)
            ? 'Privy app ID and client ID are configured.'
            : 'Fill EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID.'
          : `${provider.label} is gated by signer readiness before provider project config matters.`
    },
    {
      id: 'chain',
      label: 'UA chain',
      status: uaRequired ? chainAllowed ? 'ready' : 'blocked' : 'idle',
      detail: uaRequired
        ? publicUaChain
          ? `Chain ${profile.ua.targetChainId} is publicly listed by Particle UA.`
          : `Particle UA SDK 2.x does not support chain ${profile.ua.targetChainId}.`
        : 'The direct Testnet checkout does not require Particle chain routing.'
    },
    {
      id: 'primary-asset',
      label: 'Primary Asset',
      status: assetSupport.status,
      detail: assetSupport.detail
    },
    {
      id: 'gateway',
      label: `${profile.gateway.version} ${profile.gatewayExecutionMode} gateway`,
      status: fundedGatewayReady ? 'ready' : 'blocked',
      detail: fundedGatewayReady
        ? `Gateway mode ${profile.gateway.version} has required network config.`
        : `The selected gateway and collection are not configured for ${profile.label}.`
    },
    {
      id: 'checkout',
      label: 'Checkout source',
      status: profile.checkoutEndpoint ? 'ready' : 'idle',
      detail: profile.checkoutEndpoint
        ? 'Checkout endpoint is configured.'
        : 'No endpoint configured. Paste prepared checkout JSON manually.'
    }
  ];
}
