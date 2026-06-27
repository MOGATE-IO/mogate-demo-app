import type { MainTab } from '@/components/BottomTabBar';
import type { AppNetworkMode, RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { useBalance } from '@/hooks/useBalance';
import type { useGiftcardCatalogue } from '@/hooks/useGiftcardCatalogue';
import type { useUniversalAccountMint } from '@/hooks/useUniversalAccountMint';
import type { useUniversalWallet } from '@/hooks/useUniversalWallet';
import type { GiftcardMerchant } from '@/services/catalogue';

export type CheckoutSelection = {
  merchant: GiftcardMerchant;
  amount: number;
};

export type AppScreenContext = {
  profile: RuntimeNetworkProfile;
  networkMode: AppNetworkMode;
  setNetworkMode: (mode: AppNetworkMode) => void;
  wallet: ReturnType<typeof useUniversalWallet>;
  balance: ReturnType<typeof useBalance>;
  catalogue: ReturnType<typeof useGiftcardCatalogue>;
  mint: ReturnType<typeof useUniversalAccountMint>;
  productSignerReady: boolean;
  topUp: () => Promise<void>;
  goToTab: (tab: MainTab) => void;
  goToCheckout: (selection: CheckoutSelection) => void;
  checkoutSelection: CheckoutSelection | null;
};
