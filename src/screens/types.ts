import type { MainTab } from '@/components/BottomTabBar';
import type { AppNetworkMode, RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { useBalance } from '@/@web3/hooks/useBalance';
import type { useGiftcardCatalogue } from '@/features/catalogue/hooks/useGiftcardCatalogue';
import type { useUniversalAccountMint } from '@/features/checkout/hooks/useUniversalAccountMint';
import type { useUniversalWallet } from '@/@web3/hooks/useUniversalWallet';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';

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
  topUpStatus: {
    status: 'idle' | 'opening' | 'success' | 'error';
    message: string | null;
  };
  topUp: () => Promise<void>;
  goToTab: (tab: MainTab) => void;
  goToCheckout: (selection: CheckoutSelection) => void;
  goToProfileAbout: () => void;
  checkoutSelection: CheckoutSelection | null;
};
