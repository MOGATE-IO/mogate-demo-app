import type { WalletIdentitySnapshot } from '@/@web3/types/wallet';

export function summarizeMagicIdentity(info: any): WalletIdentitySnapshot {
  const evmAddress = info?.wallets?.ethereum?.publicAddress ?? null;
  const solanaAddress = info?.wallets?.solana?.publicAddress ?? null;
  const email = typeof info?.email === 'string' ? info.email : null;
  const providerUserId = typeof info?.issuer === 'string' ? info.issuer : null;
  const warnings: string[] = [];
  if (!providerUserId) warnings.push('Magic did not return an issuer for this session.');
  if (!evmAddress) warnings.push('Magic did not return an embedded EVM address.');

  return {
    provider: 'magic',
    providerUserId,
    displayNames: email ? [email] : [],
    linkedAccountTypes: email ? ['google_oauth'] : [],
    loginMethods: email ? ['google_oauth'] : [],
    oauthSubjects: providerUserId ? [`magic:${providerUserId}`] : [],
    oauthEmails: email ? [`google_oauth:${email}`] : [],
    embeddedEvmWallets: evmAddress ? [evmAddress] : [],
    embeddedSolanaWallets: solanaAddress ? [solanaAddress] : [],
    warnings
  };
}
