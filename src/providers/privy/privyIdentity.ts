import type { WalletIdentitySnapshot } from '@/types/wallet';

const LOGIN_ACCOUNT_TYPES = new Set([
  'email',
  'phone',
  'google_oauth',
  'twitter_oauth',
  'apple_oauth',
  'discord_oauth',
  'github_oauth',
  'custom_auth',
  'custom_oauth',
  'farcaster',
  'telegram',
  'passkey'
]);

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function accountLabel(account: Record<string, any>) {
  if (account.type === 'wallet') {
    return `${account.chain_type ?? 'wallet'}:${account.connector_type ?? account.wallet_client_type ?? 'external'}`;
  }
  return String(account.type ?? 'unknown');
}

function accountSubject(account: Record<string, any>) {
  const subject = account.subject ?? account.custom_user_id ?? account.owner_address ?? account.fid;
  return subject == null ? null : `${account.type}:${subject}`;
}

function embeddedWalletAddress(account: Record<string, any>, chainType: 'ethereum' | 'solana') {
  if (account.type !== 'wallet') return null;
  if (account.connector_type !== 'embedded') return null;
  if (account.chain_type !== chainType) return null;
  const index = account.wallet_index == null ? '0' : String(account.wallet_index);
  return `${account.address} / index ${index}`;
}

export function summarizePrivyIdentity(input: {
  user?: Record<string, any> | null;
  evmWallets?: Array<Record<string, any>>;
  solanaWallets?: Array<Record<string, any>>;
}): WalletIdentitySnapshot {
  const linkedAccounts = (input.user?.linked_accounts ?? []) as Array<Record<string, any>>;
  const linkedAccountTypes = unique(linkedAccounts.map(accountLabel));
  const loginMethods = linkedAccountTypes.filter((type) => LOGIN_ACCOUNT_TYPES.has(type));
  const oauthSubjects = unique(linkedAccounts.map(accountSubject));
  const oauthEmails = unique(
    linkedAccounts.map((account) => {
      const email = account.email;
      return typeof email === 'string' ? `${account.type}:${email}` : null;
    })
  );
  const embeddedEvmWallets = unique([
    ...linkedAccounts.map((account) => embeddedWalletAddress(account, 'ethereum')),
    ...(input.evmWallets ?? []).map((wallet) =>
      wallet?.address ? `${wallet.address} / index ${wallet.walletIndex ?? wallet.wallet_index ?? 0}` : null
    )
  ]);
  const embeddedSolanaWallets = unique([
    ...linkedAccounts.map((account) => embeddedWalletAddress(account, 'solana')),
    ...(input.solanaWallets ?? []).map((wallet) =>
      wallet?.address ? `${wallet.address} / index ${wallet.walletIndex ?? wallet.wallet_index ?? 0}` : null
    )
  ]);

  const warnings: string[] = [];
  if (!input.user?.id) warnings.push('No Privy user ID is available yet.');
  if (loginMethods.length === 0) warnings.push('No linked login method is visible on this user.');
  if (embeddedEvmWallets.length === 0) warnings.push('No embedded EVM wallet is visible on this user.');
  if (embeddedEvmWallets.length > 1) warnings.push('Multiple embedded EVM wallets are linked; confirm which wallet index web uses.');
  if (oauthSubjects.length > 1) warnings.push('Multiple login subjects are linked; account-linking rules may affect address continuity.');

  return {
    provider: 'privy',
    providerUserId: input.user?.id ?? null,
    providerUserCreatedAt: input.user?.created_at ?? null,
    linkedAccountTypes,
    loginMethods,
    oauthSubjects,
    oauthEmails,
    embeddedEvmWallets,
    embeddedSolanaWallets,
    warnings
  };
}
