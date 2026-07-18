import type { WalletStack } from '@/@web3/types/wallet';

export type SignerProviderReadiness = 'ready' | 'blocked' | 'planned' | 'probe';

export type SignerProviderInfo = {
  label: string;
  readiness: SignerProviderReadiness;
  authSurface: string;
  authorizationApi: string;
  productEnabled: boolean;
  setupNote: string;
};

export const SIGNER_PROVIDER_INFO: Record<WalletStack, SignerProviderInfo> = {
  privy: {
    label: 'Privy embedded wallet',
    readiness: 'planned',
    authSurface: 'Email, social, or app-linked embedded EOA',
    authorizationApi: 'useSign7702Authorization().signAuthorization()',
    productEnabled: false,
    setupNote: 'Privy remains installed for migration reference, but this build mounts Magic as the active embedded EOA provider.'
  },
  magic: {
    label: 'Magic embedded wallet',
    readiness: 'ready',
    authSurface: 'Google OAuth Magic RN Expo embedded EOA',
    authorizationApi: 'magic.wallet.sign7702Authorization()',
    productEnabled: true,
    setupNote: 'Magic creates a new provider-owned embedded EOA. Configure the Magic Google OAuth client and redirect URI before enabling user sends.'
  },
  dynamic: {
    label: 'Dynamic WaaS',
    readiness: 'planned',
    authSurface: 'Dynamic WaaS embedded EOA',
    authorizationApi: 'waasConnector.signAuthorization()',
    productEnabled: false,
    setupNote: 'Wire Dynamic WaaS connector before enabling sends.'
  },
  particle: {
    label: 'Particle Auth probe',
    readiness: 'probe',
    authSurface: 'Particle RN Auth login',
    authorizationApi: 'Not a verified production signer in Particle UA wallet docs',
    productEnabled: false,
    setupNote: 'Use Particle here for Auth/UA probing only unless a working 7702 authorization method is proven.'
  }
};

export function getSignerProviderInfo(stack: WalletStack) {
  return SIGNER_PROVIDER_INFO[stack];
}

export function isProductEip7702Signer(stack: WalletStack) {
  return SIGNER_PROVIDER_INFO[stack].productEnabled;
}
