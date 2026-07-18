import { AccountSectionView } from '@/features/account/components/AccountSectionView.ui';
import type { AppNetworkMode } from '@/config/networkProfiles';
import type { AccountSection } from '@/navigation/account';

export function AccountSectionScreen({
  onBack,
  section,
  networkMode,
  onNetworkModeChange
}: {
  onBack: () => void;
  section: AccountSection;
  networkMode: AppNetworkMode;
  onNetworkModeChange: (mode: AppNetworkMode) => void;
}) {
  return (
    <AccountSectionView
      networkMode={networkMode}
      onBack={onBack}
      onNetworkModeChange={onNetworkModeChange}
      section={section}
    />
  );
}
