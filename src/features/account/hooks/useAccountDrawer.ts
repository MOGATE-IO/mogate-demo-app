import { useCallback, useState } from 'react';

import type { AccountSection } from '@/navigation/account';

export function useAccountDrawer({
  onAccountSection,
  onProfile
}: {
  onAccountSection: (section: AccountSection) => void;
  onProfile: () => void;
}) {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);
  const openProfile = useCallback(() => {
    setVisible(false);
    onProfile();
  }, [onProfile]);
  const openSection = useCallback((section: AccountSection) => {
    setVisible(false);
    onAccountSection(section);
  }, [onAccountSection]);

  return {
    close,
    open,
    openProfile,
    openSection,
    visible
  };
}
