import type { MainTab } from '@/components/BottomTabBar';
import type { AppNetworkMode, RuntimeNetworkProfile } from '@/config/networkProfiles';
import type { useBalance } from '@/@web3/hooks/useBalance';
import type { useGiftcardCatalogue } from '@/features/catalogue/hooks/useGiftcardCatalogue';
import type { useGiftcardInventory } from '@/features/inventory/hooks/useGiftcardInventory';
import type { useUniversalAccountMint } from '@/features/checkout/hooks/useUniversalAccountMint';
import type { usePaymentBalances } from '@/features/checkout/hooks/usePaymentBalances';
import type { useUniversalWallet } from '@/@web3/hooks/useUniversalWallet';
import type { GiftcardMerchant } from '@/features/catalogue/services/catalogue';

export type CheckoutNetwork = 'ethereum' | 'arbitrum';
export type CheckoutPaymentMode = 'direct' | 'ua7702';
export type CheckoutReceiverType = 'wallet' | 'email' | 'x';

export type CheckoutSelection = {
  merchant: GiftcardMerchant;
  amount: number;
  region: string;
  receiverType: CheckoutReceiverType;
  receiverAddress: string;
  receiverContact: string;
  network: CheckoutNetwork;
  paymentMode: CheckoutPaymentMode;
  giftcardMode: 'voucher' | 'funded';
  mintMode: 'public';
  autoMint: boolean;
  autoUnwrap: boolean;
  reserveGas: boolean;
  couponCode: string;
};

export type CheckoutSelectionInput = Pick<CheckoutSelection, 'merchant' | 'amount'> &
  Partial<Omit<CheckoutSelection, 'merchant' | 'amount'>>;

export type AppScreenContext = {
  profile: RuntimeNetworkProfile;
  networkMode: AppNetworkMode;
  setNetworkMode: (mode: AppNetworkMode) => void;
  wallet: ReturnType<typeof useUniversalWallet>;
  balance: ReturnType<typeof useBalance>;
  paymentBalances: ReturnType<typeof usePaymentBalances>;
  catalogue: ReturnType<typeof useGiftcardCatalogue>;
  inventory: ReturnType<typeof useGiftcardInventory>;
  mint: ReturnType<typeof useUniversalAccountMint>;
  productSignerReady: boolean;
  topUpStatus: {
    status: 'idle' | 'opening' | 'success' | 'error';
    message: string | null;
  };
  topUp: () => void | Promise<void>;
  goToTab: (tab: MainTab) => void;
  goToCheckout: (selection: CheckoutSelectionInput) => void;
  updateCheckoutSelection: (selection: Partial<CheckoutSelection>) => void;
  goToProfileAbout: () => void;
  checkoutSelection: CheckoutSelection | null;
};
