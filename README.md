# Mogate Funded Giftcard Mobile

Expo mobile client for OTA-authorized funded giftcard checkout. The current default is direct wallet
execution against the signed UUPS gateway on Ethereum Sepolia. Particle UA remains a later
transaction wrapper and is not required by the funded contract or OTA signing flow.

This app is a nested independent git repo under the parent UA lab workspace. Keep mobile history local to `apps/mobile` unless the parent repo is intentionally converted to a formal submodule.

## Scope

- Signer switch: `privy`, `magic`, `dynamic`, or `particle`.
- Particle path: UA SDK/router, balance probe, UniversalTransaction build, rootHash send.
- Privy path: embedded EOA signer with best-effort `eth_sign7702Authorization`.
- Magic path: reference-only signer. It is shown in the switch, but Magic RN packages are not bundled until their Expo native dependency tree is SDK 56 clean.
- Dynamic path: scaffolded planned signer until its RN WaaS connector is wired.
- Particle RN Auth path: probe only until a working 7702 authorization method is proven.
- Target chain default: Ethereum Sepolia `11155111`.
- Gateway mode default: `signed-v2` atomic fee/backing/reserve checkout.
- Runtime network switch: Mainnet/Testnet profiles are code-level config for chain IDs, checkout/catalogue paths, gateway addresses, and onramp settings.
- No silent mainnet fallback.
- No default undelegate. Particle UA and Mogate7702 can replace delegation when each flow needs it.

## Setup

```bash
cd /Users/dellwatson/Desktop/MOGATE_DEFI/mogate-ua-crosschain-giftcard
cp apps/mobile/.env.example apps/mobile/.env
npm install
npm --workspace apps/mobile run preflight
npm --workspace apps/mobile run devbuild:android
npm --workspace apps/mobile run start:dev-client
```

This app uses native modules from Particle and Privy, and will add Dynamic/Magic only through development builds. Expo Go is not enough.

## Architecture

Expo Router owns navigation while the application code remains split by responsibility:

- `app/` contains route and layout adapters only. The five persistent routes live under `app/(tabs)`; onboarding, mint checkout, profile detail, and not-found screens live in the root stack.
- `src/screens/` composes feature hooks and UI props. Screens do not own the navigation container, wallet adapters, or API implementations.
- `src/features/<feature>/components/*.ui.tsx` owns presentation. Hooks own interaction state and handlers; services own data mapping, API calls, and transaction preparation.
- `src/@web3/` remains the wallet/Particle boundary and is independent from route and visual component choices.
- `src/hooks/useMobileAppController.ts` composes shared product state above the Router stack so changing tabs does not recreate wallet, catalogue, balance, or inventory state.
- `src/navigation/` owns route names and tab-to-path mappings. The bottom tab bar is replaceable UI under `src/components/BottomTabBar.ui.tsx`.

The custom `entrypoint.js` loads wallet crypto polyfills before registering `expo-router/entry`. Keep that order for development builds.

Shared frontend visuals preserve their paths under mobile `assets`: frontend `public/+logos`, `public/external`, and `public/images` map to `assets/+logos`, `assets/external`, and `assets/images`. SVG stays SVG; raster files stay in their original formats. API-provided frontend paths are translated into native image sources by the brand-asset resolver instead of by feature handlers.

React Native Web status:

- `npm --workspace apps/mobile run web` can be used for visual review of the shared screen/component positions.
- Real Privy React Native login, EIP-7702 authorization signing, Particle native Auth probing, and Privy funding require iOS/Android in an Expo development build.
- Web mode intentionally mounts a no-native Privy bridge, so UA sends remain blocked there.

Development build tradeoffs:

- Pro: native wallet/onramp modules are compiled into the app binary, so Privy/Particle OAuth, deep links, and future Dynamic/Magic signer packages can run.
- Pro: the app still loads JS from Metro during development.
- Con: native dependency or config-plugin changes require rebuilding the app.
- Con: device testing needs simulator/device builds instead of opening the project inside the Expo Go app.

EAS development-build profiles live in `eas.json`:

- `development`: internal simulator/dev-client build.
- `device-development`: internal device/dev-client build.
- `preview`: internal test distribution.
- `production`: mainnet-smoke shaped profile, still requiring real credentials and legal/compliance review.

Local Android dev build status:

- `npm --workspace apps/mobile run devbuild:android` builds and installs `android/app/build/outputs/apk/debug/app-debug.apk`.
- On Android emulator, open the dev-client URL with `10.0.2.2` if the LAN URL fails: `exp+mogate-ua-lab://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8081`.

Local iOS dev build status:

- `expo prebuild --clean` generates iOS and installs Pods.
- The development client is running on the iPhone 17 Pro simulator with iOS 26.5.

## Environment

The checked-in example contains the active Sepolia addresses. Local credentials belong in
`apps/mobile/.env`:

```bash
EXPO_API_BASE=http://localhost:4000
EXPO_PUBLIC_PRIVY_APP_ID=
EXPO_PUBLIC_PRIVY_CLIENT_ID=
EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID=
EXPO_PUBLIC_MINT_GATEWAY_VERSION=signed-v2
EXPO_PUBLIC_FUNDED_GATEWAY_ADDRESS=0x5915cBB93c96C5d3D0eCBa39dD396ef959D8Af13
EXPO_PUBLIC_FUNDED_GIFTCARD_COLLECTION=0x557ceE3F7B829169251d6eAA9FCC3211C1008E0D
```

Wallet stack, UA target, API paths, and public route defaults remain code-level config. Update:

- `src/@web3/config/walletStack.ts` for the active signer stack.
- `src/config/networkProfiles.ts` for Testnet/Mainnet chain IDs, backend paths, gateway addresses, and onramp defaults.

The mobile client builds checkout, catalogue, reconciliation, Privy onramp, and Transak fallback URLs from `EXPO_API_BASE` plus fixed API paths in `networkProfiles.ts`.
The catalogue is not mocked in the handler app. `${EXPO_API_BASE}/mogate/giftcard/brands` must return the real merchant list, including the Mogate Giftcard 0.1 USD product when testing that mint path.
OTA prepares a backend-signed `checkout` payload. The user approves the exact fee/backing amounts
and sends the transaction; the server does not mint with a private key.

`npm --workspace apps/mobile run preflight` reads `.env.example`, then overlays `.env` and shell
variables. Direct funded checkout can be ready while Particle UA remains blocked on Sepolia.

After a successful UA mint, the app posts to `${EXPO_API_BASE}/api/checkouts/reconcile`; the demo server stores records in `.mogate-flow/checkout-reconciliations.jsonl`.

## Native Particle Config

Particle RN Auth requires dashboard IDs in native project files. The local Expo config plugin `plugins/withParticleNetwork.js` injects:

- Android `manifestPlaceholders["PN_PROJECT_ID"]`
- Android `manifestPlaceholders["PN_PROJECT_CLIENT_KEY"]`
- Android `manifestPlaceholders["PN_APP_ID"]`
- iOS `ParticleNetwork-Info.plist`

Particle native config is not part of the default Privy login/top-up development build. Re-enable the local `withParticleNetwork` config plugin only when returning to the Particle RN Auth probe.

## Mint Flow

1. Connect the Privy embedded EOA.
2. Select a funded catalogue product; fixed value and direct gas reserve are defaults.
3. OTA returns a signed `checkout` with separate service fee, backing, reserve, and value policy.
4. The client sends required ERC20 approvals and calls the funded gateway proxy.
5. The client submits the target-chain transaction hash to OTA reconciliation.

The owner EOA pays transaction gas and receives the funded NFT. Particle UA may later transport
the same calls after cross-chain asset preparation.

The app now has five main tabs:

- Catalogue: API-backed merchants, amount selection, and checkout launch.
- Updates: account and product activity.
- Request: draft payment requests.
- Leaderboard: catalogue activity ranking.
- Inventory: protected owned-giftcard area with post-mint token state.

The app blocks UA mint signing when `checkout.to` does not match the connected owner EOA. This is intentional: in-place UA minting means the signer, executor, and NFT receiver are the same EOA.

The app also blocks unsupported expected Primary Assets. Particle's public Primary Asset list is an allowlist, not a promise that every ERC20 or every token using the `USDC` symbol can pay gas. For example, public docs list Base with `USDC` and `ETH`, while Solana uses the separate Solana Universal Address path returned by Particle UA.

The app also shows an `Identity continuity` card after wallet connection. Use it to compare mobile and web when the same Google/email/X login returns different addresses:

- Provider user ID.
- Login method and OAuth subject.
- Embedded EVM wallet address and wallet index.
- Particle EVM UA and Solana UA after probing.
- Provider Solana wallet, if present.

The “Product readiness” card also blocks obvious setup mistakes before signing:

- Missing Particle project config for UA minting.
- Missing Privy app/client IDs for the active network profile.
- Non-product signer stack.
- Missing Particle UA project config for minting.
- Missing signed funded gateway or funded collection address.

The same checks are available from the command line:

```bash
npm --workspace apps/mobile run preflight
```

For v0 ERC20 payments, the app batches:

1. `approve(authorityGateway, amount)`
2. `unsafeCheckout(checkout, paymentToken, amount)`

For signed ERC20 funded giftcards, the app sends:

1. `approve(fundedGiftcardCollection, backingAmount)`
2. `approve(gatewayProxy, serviceFeeAmount)`
3. `gatewayProxy.checkout(checkout, fee, funding, permit, signature)`

For native funding/reserve/fee, `checkout` carries their exact signed total in `msg.value`.

The active Sepolia proxy mints backing and direct reserve atomically. The legacy encrypted v0 route
remains parser-compatible but is not the default funded path.

## Known Blockers To Prove

- Testnet/Sepolia UA sends require explicit Particle dashboard/SDK proof before use. The mobile demo currently defaults to Testnet/Arbitrum Sepolia; Mainnet/Arbitrum One remains a manual profile switch.
- If the selected signer does not expose EIP-7702 authorization signing, the app stops with a wallet capability blocker. Do not fall back to smart-account mode for this proof.
- Magic is intentionally blocked and not installed in the default app until its Expo RN package tree is native-clean for this SDK.
- Dynamic is intentionally blocked until the RN WaaS connector is wired and verified.
- Transak staging ERC20 onramp may deliver TRNSK instead of usable USDC.

Provider identity setup is documented in `../../docs/provider-identity-setup.md`. Same-login/same-address continuity requires the same embedded signer provider and project across web and mobile.

Native-build status and the Magic reference-signer decision are documented in `../../docs/mobile-native-build-notes.md`.
Magic and Dynamic promotion steps live in `../../docs/magic-signer-runbook.md` and `../../docs/dynamic-signer-runbook.md`.
