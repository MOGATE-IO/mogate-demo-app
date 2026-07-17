# Funded Giftcard Execution Boundary

## Active Testnet Route

The mobile app prepares a signed funded checkout through OTA and submits it to the UUPS proxy on
Ethereum Sepolia:

```text
Collection: 0x557ceE3F7B829169251d6eAA9FCC3211C1008E0D
Gateway:    0x5915cBB93c96C5d3D0eCBa39dD396ef959D8Af13
Version:    signed-v2
```

The default product is a fixed funded card with direct native gas reserve enabled. A 50 USDC card
and 1 USDC service fee produces two separate economic amounts: 50 USDC is transferred into the
collection as token backing, while 1 USDC remains in the gateway proxy as withdrawable fee
surplus.

```text
Mobile -> OTA /giftcard/checkout/create
OTA -> signs exact checkout, fee, funding, reserve, policy, nonce, and deadline
Mobile -> USDC.approve(collection, 50 USDC)
Mobile -> USDC.approve(gateway, 1 USDC)
Mobile -> gateway.checkout(...)
Gateway -> collection.mint(...)
Mobile -> OTA /api/checkouts/reconcile
```

Native value and direct reserve are supplied with the checkout transaction as `msg.value`. The
reserve is stored by token ID in the collection; it does not pay the mint transaction itself.

## Value Policy

- `fixed`: default; value assets cannot change after mint, but native gas reserve may be added.
- `top_up_existing`: anyone may add more of an asset accepted at mint.
- `holder_managed`: anyone may top up accepted assets; only the current holder may introduce a
  new value asset.

OTA persists the high-level giftcard type, stable/volatile/mixed funded category, value policy,
fixed-state flag, and multi-token flag in prepared data and metadata.

## Balance UI

The profile renders a single USD total with USDC and USDT tabs. Mainnet includes canonical
Ethereum/Base/Arbitrum and Solana USDC/USDT routes plus native ETH/SOL reads. Ethereum Sepolia
uses the OTA-configured Mogate Test USDC at `0x16369CD4B9533795dCdc0D67DB3E4c621ef97D68` and does
not invent a Solana devnet USDT mint. Testnet-only
native totals appear below the top-up controls and are hidden in mainnet mode.

## Particle UA Later

Particle UA is a future transaction transport, not a Solidity dependency. It can eventually
submit the same `approve` and `checkout` calls after cross-chain balance preparation. The gateway
still validates OTA's EIP-712 signature and the NFT still settles on the target EVM chain.
