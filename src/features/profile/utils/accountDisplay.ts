import type { WalletSnapshot } from '@/@web3/types/wallet';
import { shortenAddress } from '@/utils/format';

function splitIdentityValue(value?: string | null) {
  if (!value) return null;
  return value.split(':').slice(1).join(':') || value;
}

export function getAccountDisplayName(snapshot: WalletSnapshot) {
  const displayName = snapshot.identity?.displayNames?.[0];
  if (displayName) return displayName;

  const email = splitIdentityValue(snapshot.identity?.oauthEmails?.[0]);
  if (email) return email;

  const socialSubject = snapshot.identity?.oauthSubjects
    ?.map((subject) => {
      if (subject.startsWith('twitter_oauth:')) return `@${splitIdentityValue(subject)}`;
      if (subject.startsWith('custom_oauth:')) return splitIdentityValue(subject);
      return null;
    })
    .find(Boolean);
  if (socialSubject) return socialSubject;

  const address = snapshot.ownerAddress || snapshot.address || '';
  if (address) return shortenAddress(address, 6, 4);

  return 'Not connected';
}

export function getAccountAvatarLabel(accountName: string) {
  if (accountName.startsWith('0x')) return '0x';
  const trimmed = accountName.replace(/^@/, '').trim();
  return (trimmed.slice(0, 1) || 'M').toUpperCase();
}
