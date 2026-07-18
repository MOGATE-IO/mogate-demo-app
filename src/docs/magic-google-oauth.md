# Magic Google Login Setup

This app now mounts Magic as the embedded EOA provider. Particle remains the
Universal Account router for funded-gateway checkout; it is not the login
provider.

## Required Values

Set these in the mobile app's `.env`, then restart Metro and rebuild the iOS
development client because Magic adds native Expo dependencies:

```env
EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY=pk_live_or_test_from_magic
EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI=https://your-approved-oauth-callback
```

`EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI` must be the exact redirect URI
registered with Google. Do not guess a custom scheme; copy the URI configured
for the Magic flow and register that same value in Google Cloud.

## Google OAuth Client

Google credentials are needed for the Google button. They are not needed if we
offer Magic email OTP only.

1. Create or select the Mogate project in Google Cloud Console.
2. Configure the OAuth consent screen. During development, add each tester as
   a test user.
3. Create an OAuth 2.0 client, then record its Client ID and Client Secret.
4. Add the exact Magic redirect URI under Google Authorized redirect URIs.
5. In Magic Dashboard, select the Mogate app, open **Social Login**, enable
   **Google / Gmail**, paste the Google Client ID and Client Secret, save, and
   use **Test Connection**.
6. Copy the Magic publishable key into `EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY` and
   copy the same approved callback into
   `EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI`.
7. Run `npm run ios -- --device DBDFE3EC-4AE3-4430-A577-75108EA46C91` from
   `apps/mobile`, then authenticate with Google on the iPhone 17 Pro simulator.

The app calls Magic's React Native `oauth.loginWithPopup({ provider: 'google',
redirectURI, scope })`, uses Magic's EIP-1193 provider for EIP-712 signatures,
and uses `magic.wallet.sign7702Authorization()` when Particle UA requests an
inline EIP-7702 authorization.

## Address Migration Warning

Magic and Privy are different embedded-wallet custodians. Signing in through
Magic creates or recovers the Magic EOA for that user; it does not recover the
existing Privy EOA. Existing Privy-held NFTs, reserves, and balances need an
explicit holder-authorized transfer before changing the default production
signer for users with live assets.
