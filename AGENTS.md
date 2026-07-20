# Mobile UA Lab Agent Notes

- Keep this Expo app isolated under `apps/mobile`; do not move Particle/Privy RN dependencies into the web app package.
- Do not create git commits unless the user explicitly asks for a commit in the current turn.
- Default profile is Testnet/Arbitrum Sepolia `421614` for the current proof. Keep Mainnet/Arbitrum One available as a manual profile switch.
- Particle UA must use EIP-7702 in-place mode. If authorization signing is rejected, report the blocker instead of switching to smart-account fallback.
- Do not clear EIP-7702 delegation by default. Replacing delegation is enough for Particle UA versus Mogate7702 flows.
- Contract target v0 is the existing `AuthorityMintGateway.unsafeCheckout` at `0x58C18578885BdB7f469612aAB662cfDF33dde3e1`.
- Collection target v0 is `0xb5b1f04020b1226c545bed6f122a5726664aec0f`.
- Reserved gas is not atomic in v0 because the gateway returns an unknown token ID after mint. Use a new gateway variant for v1.
- Transak belongs in client top-up UX plus backend webhook recording. The backend must not mint with a private key for the normal user-paid flow.

## 2026-06-27

- Wallet stack, UA chain/mode, API paths, gateway addresses, and payment recipients are code-level config. Do not move them back into Expo env.
- Mobile supports v0/v2 gateway modes through `src/config/networkProfiles.ts`.
- v2 requires gateway address and funded collection in the active network profile. The backend supplies payment recipient per checkout.
- HeroUI Native/examples are a UI reference unless an actual HeroUI package is added to `apps/mobile`. If added, keep HeroUI imports inside `*.ui.tsx` files.
- Funded v2 uses a new ERC721-compatible funded collection, not `ERC721MG`; the collection owns tokenId value and native reserved gas directly.

## 2026-06-27: Signer Provider Policy

- Treat Particle as the UA SDK/router. Do not assume Particle RN Auth is a verified EIP-7702 signer unless the installed SDK exposes a working authorization method.
- The product signer candidates are Privy, Magic, and Dynamic embedded/WaaS wallets.
- In-place mode means the EOA address is the receiver and executor. Do not default checkout receiver to a smart-account/deposit address.
- Magic is reference-only in the default app. Re-add Magic only in a separate native-clean experiment, then map `magic.wallet.sign7702Authorization()` before enabling sends.
- Dynamic is scaffolded as a planned provider until its RN WaaS connector is wired.
- Top-up is optional. Do not tell users they must transfer existing Base/Arbitrum primary assets into a UA address before minting. Solana assets can only be considered when the UA identity exposes a recognized Solana source/address.
- Same-login/same-address requires the same embedded signer provider and project across web and mobile; Particle UA does not merge EOAs created by different login providers.
- `0xUA` or deposit addresses must not become the checkout receiver in the in-place product path; `checkout.to` must stay the owner EOA.

## 2026-07-02: Mobile Structure Policy

- Keep `src/@web3` as the future package boundary for wallet providers, wallet stores, wallet types, and UA/Particle execution services.
- Keep screen files thin. Screens may compose feature hooks and feature UI, but they should not contain API clients, wallet adapters, or large visual trees.
- Keep feature code isolated under `src/features/<feature>/{components,hooks,services}`. Hooks/services own handlers, wallet calls, API calls, clipboard, and async state.
- Feature UI components must be named `FileName.ui.tsx`. These files receive props and callbacks only, and they are the only feature files that should hold large visual trees or future HeroUI dependencies.
- The handler app and the separate UI app must share import positions for replaceable UI. The funded giftcard visual slot is `src/features/giftcard/components/GiftcardComponent.ui.tsx`.
- Do not put mock catalogue rows in the mobile handler app. `/mogate/giftcard/brands` from `EXPO_API_BASE` must provide real merchants, including the Mogate Giftcard 0.1 USD smoke-test product when that product is needed.
- Shared UI primitives belong in `src/components`, including Button, Card, PageHeader, BottomSheet, segmented controls, rows, and other reusable building blocks. Feature components may specialize or compose these primitives, but must not recreate a one-off modal/sheet/button/header when the primitive can serve multiple features.
- HeroUI Native/examples remain the visual reference unless the actual package is installed. If HeroUI is added later, keep HeroUI imports inside `*.ui.tsx` files and preserve handler/hook boundaries.

## 2026-07-15: Router and Asset Boundaries

- Expo Router owns the route tree under `app/`; route modules must stay thin and may only select context, route params, frames, and screen composers.
- Keep product state above the route stack in `MobileAppProvider` and `useMobileAppController`. Do not move wallet, catalogue, balance, inventory, checkout, or top-up handlers into route files.
- The five-tab route group is Catalogue, Updates, Request, Leaderboard, and Inventory. Profile, account settings, mint checkout, and giftcard detail are stack routes and must not render the tab bar.
- Bottom navigation and route frames are replaceable `*.ui.tsx` components. Route names and path mappings belong in `src/navigation`, not inside the tab bar visual.
- Preserve frontend-relative shared asset paths under mobile `assets/+logos`, `assets/external`, and `assets/images`. Keep source formats instead of converting SVG logos to PNG.
- API image paths are data. Resolve them through the shared brand-asset registry and `BrandImage.ui.tsx`; feature hooks and services must not import rendering components.
- Keep the custom entrypoint so crypto shims initialize before `expo-router/entry` in native development builds.

## 2026-07-16: Signed Multi-Asset Inventory And Reconciliation

- Mobile gateway mode `signed-v1` consumes OTA `prepared.permit.execution.evm.funded_checkout`; do not reconstruct or alter signed funding arrays client-side.
- Build ERC20 payment approval to the signed gateway, one funded-asset approval to the collection for each ERC20, then the final `checkoutWithPermit` call. Native funding and reserved gas are summed into exact final-call value.
- Inventory reads live `giftcardBalances(tokenId)` and `gasReserveOf(tokenId)`. Display each ERC20/native balance separately and never infer live value from metadata.
- Funded unwrap calls `unwrap(tokenId)`, which makes the NFT soulbound only. The current owner must then call generic `withdraw(tokenId, balanceType, token, to, amount)` for each value asset and/or native gas reserve before an empty card can be burned.
- Reconciliation posts the chain transaction hash to `/api/checkouts/reconcile`. UniversalX transaction ID alone is not proof of a target-chain mint.
- The production OTA endpoint verifies receipt events before marking minted or sending email. The demo server endpoint remains an audit-only JSONL recorder.

## 2026-07-19: Profile Transfers

- Profile transfers use Particle Universal Accounts v2 `createTransferTransaction`; do not replace this with a raw EVM send when the active profile supports UA.
- Quote before asking for final confirmation. Show the fee asset and amount returned by Particle instead of claiming that gas is always paid in USDC.
- Keep UA trade configuration USD-preferred with USDC/USDT primary assets for this demo. EIP-7702 authorization is signed only when the returned Universal Account transaction requires it.
- Testnet profiles must remain blocked from UA submission while Particle UA v2 only exposes the supported mainnet path; direct testnet checkout is a separate flow.

## 2026-07-20: Magic Relayer Visibility During Signing

- Magic's React Native `Relayer` is an absolutely positioned WebView in the normal React Native view hierarchy. Native `Modal` and modal-backed sheet surfaces render above it regardless of the relayer's z-index.
- Checkout and transfer progress surfaces must yield while the wallet stage is `authorizing` so users can see and approve both `magic.wallet.sign7702Authorization()` and the following Particle `rootHash` signature.
- A Magic signing promise that times out while an app-owned native modal remains visible is a wallet-UI layering failure, not evidence that Particle omitted the EIP-7702 authorization or that Privy must be re-enabled.

## 2026-07-20: Funded Giftcard Send Routing

- A wrapped giftcard with a positive live `gasReserveOf(tokenId)` must not use the direct wallet-paid `safeTransferFrom` path. Mobile creates a recipient-locked, measured-reserve Commerce Code with a Magic-signed EIP-7702 authorization, and OTA relays `executeSignedPaymentCode` through `/mogate/commerce-codes/consume`.
- A zero-reserve giftcard may continue to use the direct EVM signer path and therefore requires native gas in the holder wallet.
- Reserve-backed sends require both live contract connections: the Commerce Code gateway's `gasSponsorVault` must be the funded collection, and the funded collection must authorize that gateway. The relayer also needs a dedicated funded executor key; never reuse the funded-checkout permit signer or contract-owner key as the public executor.
