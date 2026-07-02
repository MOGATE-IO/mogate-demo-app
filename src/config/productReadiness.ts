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
  const publicUaChain = isPublicParticleUaChain(profile.ua.targetChainId);
  const chainAllowed = publicUaChain || profile.ua.allowUnlistedTestnet;
  const assetSupport = describeParticlePrimaryAssetConfig({
    chainId: profile.ua.targetChainId,
    asset: profile.ua.expectTokenType,
    allowUnlistedTestnet: profile.ua.allowUnlistedTestnet
  });
  const v2GatewayReady =
    profile.gateway.version !== 'v2' ||
    (isAddress(profile.gateway.v2Address) && isAddress(profile.gateway.fundedCollection));
  const signerConfigReady = stack !== 'privy' || hasPrivyProfileConfig(profile);

  return [
    {
      id: 'particle-config',
      label: 'Particle project',
      status: hasParticleProjectConfig(profile) ? 'ready' : 'blocked',
      detail: hasParticleProjectConfig(profile)
        ? 'Particle UA project is configured in the active network profile.'
        : 'Configure the Particle UA project in src/config/networkProfiles.ts when UA minting resumes.'
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
      status: chainAllowed ? 'ready' : 'blocked',
      detail: publicUaChain
        ? `Chain ${profile.ua.targetChainId} is publicly listed by Particle UA.`
        : profile.ua.allowUnlistedTestnet
          ? `Chain ${profile.ua.targetChainId} is locally allowed for dashboard-confirmed testnet proof.`
          : `Chain ${profile.ua.targetChainId} is not publicly listed. Confirm in Particle dashboard/SDK before enabling sends.`
    },
    {
      id: 'primary-asset',
      label: 'Primary Asset',
      status: assetSupport.status,
      detail: assetSupport.detail
    },
    {
      id: 'gateway',
      label: `${profile.gateway.version} gateway`,
      status: v2GatewayReady ? 'ready' : 'blocked',
      detail: v2GatewayReady
        ? `Gateway mode ${profile.gateway.version} has required network config.`
        : `V2 gateway and funded collection are not configured for ${profile.label}.`
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
