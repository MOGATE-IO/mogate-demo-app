import type { WalletStack } from '@/types/wallet';

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
    readiness: 'ready',
    authSurface: 'Email, social, or app-linked embedded EOA',
    authorizationApi: 'useSign7702Authorization().signAuthorization()',
    productEnabled: true,
    setupNote: 'Use one Privy app across web and mobile, with embedded Ethereum create-on-login enabled, if the same login must keep the same EOA.'
  },
  magic: {
    label: 'Magic embedded wallet',
    readiness: 'blocked',
    authSurface: 'Magic RN Expo embedded EOA reference',
    authorizationApi: 'magic.wallet.sign7702Authorization()',
    productEnabled: false,
    setupNote: 'Magic packages are intentionally not bundled in the default app because they introduce duplicate native modules on Expo SDK 56. Re-enable only in a separate Magic experiment or after the packages align.'
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
