# Mogate UA Mobile Lab

Expo proof-of-concept for Particle Network Universal Accounts in strict EIP-7702 in-place mode. The default path boots on Mainnet/Arbitrum One and targets the new v2 atomic mint/fund/reserve gateway, with the existing Arbitrum Sepolia `AuthorityMintGateway.unsafeCheckout` kept as the manual v0 proof fallback.

This app is a nested independent git repo under the parent UA lab workspace. Keep mobile history local to `apps/mobile` unless the parent repo is intentionally converted to a formal submodule.

## Scope

- Signer switch: `privy`, `magic`, `dynamic`, or `particle`.
- Particle path: UA SDK/router, balance probe, UniversalTransaction build, rootHash send.
- Privy path: embedded EOA signer with best-effort `eth_sign7702Authorization`.
- Magic path: reference-only signer. It is shown in the switch, but Magic RN packages are not bundled until their Expo native dependency tree is SDK 56 clean.
- Dynamic path: scaffolded planned signer until its RN WaaS connector is wired.
- Particle RN Auth path: probe only until a working 7702 authorization method is proven.
- Target chain default: Arbitrum One `42161`.
- Gateway mode default: v2 atomic mint/fund/reserve.
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

React Native Web status:

- `npm --workspace apps/mobile run web` can be used for UI review and catalogue/profile mock flows.
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
- Building the iOS simulator app on this machine is blocked by Xcode 16.2 / Swift 6.0.3 because Expo SDK 56 `expo-modules-jsi` declares Swift tools 6.2.

## Environment

Only these env values belong in `apps/mobile/.env`:

```bash
EXPO_API_BASE=http://localhost:4000
EXPO_PUBLIC_PRIVY_APP_ID=
EXPO_PUBLIC_PRIVY_CLIENT_ID=
EXPO_PUBLIC_DYNAMIC_ENVIRONMENT_ID=
```

Wallet stack, UA target, API paths, Particle UA config, and gateway addresses are code-level config, not env. Update:

- `src/config/walletStack.ts` for the active signer stack.
- `src/config/networkProfiles.ts` for Testnet/Mainnet chain IDs, backend paths, gateway addresses, and onramp defaults.

The mobile client builds checkout, catalogue, reconciliation, Privy onramp, and Transak fallback URLs from `EXPO_API_BASE` plus fixed API paths in `networkProfiles.ts`.
For v2 funded checkouts, the local demo server can also prepare unsigned `checkoutFundedV2` parameters from its `MOGATE_*` config. The user still signs and sends through Particle UA EIP-7702 in-place; the server does not mint with a private key.

`npm --workspace apps/mobile run preflight` reads `.env.example` as safe defaults, then overlays `.env` and shell environment variables. For the current Privy login/top-up milestone, only Privy IDs and `EXPO_API_BASE` are required. Particle UA minting remains blocked until the Particle project and v2 gateway are configured in code.

After a successful UA mint, the app posts to `${EXPO_API_BASE}/api/checkouts/reconcile`; the demo server stores records in `.mogate-flow/checkout-reconciliations.jsonl`.

## Native Particle Config

Particle RN Auth requires dashboard IDs in native project files. The local Expo config plugin `plugins/withParticleNetwork.js` injects:

- Android `manifestPlaceholders["PN_PROJECT_ID"]`
- Android `manifestPlaceholders["PN_PROJECT_CLIENT_KEY"]`
- Android `manifestPlaceholders["PN_APP_ID"]`
- iOS `ParticleNetwork-Info.plist`

Particle native config is not part of the default Privy login/top-up development build. Re-enable the local `withParticleNetwork` config plugin only when returning to the Particle RN Auth probe.

## Mint Flow

1. Connect an embedded EOA signer on the default Mainnet/Arbitrum profile.
2. Probe UA.
3. Load a prepared checkout from backend or paste prepared JSON.
4. Send UA mint.

The owner EOA is the NFT receiver and onchain executor. Existing supported primary assets can stay on their original supported chains; top-up is optional for adding fresh assets.

The app now has five main tabs:

- Home: user balance, top-up, recent activity, and trending giftcards.
- Search: API-backed catalogue, merchant detail, amount selection, and checkout launch.
- Request: draft payment requests.
- Inventory: protected owned-giftcard area with post-mint token state.
- Profile: identity, network mode, signer stack, and readiness gates.

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
- Missing v2 gateway or funded collection address.

The same checks are available from the command line:

```bash
npm --workspace apps/mobile run preflight
```

For v0 ERC20 payments, the app batches:

1. `approve(authorityGateway, amount)`
2. `unsafeCheckout(checkout, paymentToken, amount)`

For v2 ERC20 funded giftcards, the app can batch:

1. `approve(v2Gateway, checkoutPaymentAmount)`
2. `approve(fundedGiftcardCollection, fundedGiftcardAmount)`
3. `checkoutFundedV2(checkout, payment, funding)`

For native v2 funding/reserved gas, `checkoutFundedV2` carries `value = nativePayment + nativeFunding + reservedGas`.

The current deployed v0 gateway mints an unknown token ID into the encrypted collection, so funded value and reserved gas are not atomic in v0. v2 is the preferred funded-giftcard path once deployed.

## Known Blockers To Prove

- Testnet/Sepolia UA sends require explicit Particle dashboard/SDK proof before use. Mainnet/Arbitrum One is the default profile.
- If the selected signer does not expose EIP-7702 authorization signing, the app stops with a wallet capability blocker. Do not fall back to smart-account mode for this proof.
- Magic is intentionally blocked and not installed in the default app until its Expo RN package tree is native-clean for this SDK.
- Dynamic is intentionally blocked until the RN WaaS connector is wired and verified.
- Transak staging ERC20 onramp may deliver TRNSK instead of usable USDC.

Provider identity setup is documented in `../../docs/provider-identity-setup.md`. Same-login/same-address continuity requires the same embedded signer provider and project across web and mobile.

Native-build status and the Magic reference-signer decision are documented in `../../docs/mobile-native-build-notes.md`.
Magic and Dynamic promotion steps live in `../../docs/magic-signer-runbook.md` and `../../docs/dynamic-signer-runbook.md`.
