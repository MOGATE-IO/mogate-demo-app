export const ACCOUNT_SECTIONS = {
  notifications: {
    title: 'Notifications',
    description: 'Choose which payment, giftcard, and promotion updates reach you.'
  },
  'account-settings': {
    title: 'Account settings',
    description: 'Manage your identity, connected login methods, and account preferences.'
  },
  security: {
    title: 'Security',
    description: 'Review wallet protection, signing sessions, and connected devices.'
  },
  settings: {
    title: 'Settings',
    description: 'Configure app behavior, language, network visibility, and accessibility.'
  },
  'mogate-care': {
    title: 'Mogate Care',
    description: 'Get help with payments, giftcards, delivery, and account recovery.'
  },
  'terms-privacy': {
    title: 'Terms & privacy',
    description: 'Read the terms of service, privacy policy, and wallet disclosures.'
  }
} as const;

export type AccountSection = keyof typeof ACCOUNT_SECTIONS;

export function isAccountSection(value: string): value is AccountSection {
  return value in ACCOUNT_SECTIONS;
}
