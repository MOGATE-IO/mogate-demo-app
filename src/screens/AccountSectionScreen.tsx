import { AccountSectionView } from '@/features/account/components/AccountSectionView.ui';
import type { AccountSection } from '@/navigation/account';

export function AccountSectionScreen({
  onBack,
  section
}: {
  onBack: () => void;
  section: AccountSection;
}) {
  return <AccountSectionView onBack={onBack} section={section} />;
}
