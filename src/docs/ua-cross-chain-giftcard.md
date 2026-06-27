# UA Cross-Chain Giftcard Mint

## Current v0

Particle UA executes the Arbitrum gateway call from the embedded EOA in EIP-7702 in-place mode:

```solidity
unsafeCheckout(checkout, paymentToken, amount)
```

The mobile app builds the same checkout tuple as the web app:

```ts
{
  orderId,
  collection,
  to,
  uri,
  encKey: { ctHash, securityZone, utype, signature },
  cipherRef
}
```

## Payment Calls

Native payment:

```text
UA -> AuthorityMintGateway.unsafeCheckout{value: amount}
```

ERC20 payment:

```text
UA -> paymentToken.approve(AuthorityMintGateway, amount)
UA -> AuthorityMintGateway.unsafeCheckout(checkout, paymentToken, amount)
```

## Mogate Funded Gateway v2

Funded giftcards use a new ERC721 collection, not ERC721MG. There is no encrypted giftcode payload. The collection owns the funded value and native reserved gas by tokenId.

ERC20-funded mint:

```text
UA -> paymentToken.approve(v2Gateway, checkoutPaymentAmount)
UA -> valueToken.approve(fundedGiftcardCollection, fundedGiftcardAmount)
UA -> MogateUAGiftcardMintGatewayV2.checkoutFundedV2(checkout, payment, funding)
Gateway -> fundedGiftcardCollection.mintFunded(...)
```

Native-funded mint:

```text
UA -> MogateUAGiftcardMintGatewayV2.checkoutFundedV2{value: nativePayment + nativeGiftcardValue + reservedGas}
Gateway -> fundedGiftcardCollection.mintFunded{value: nativeGiftcardValue + reservedGas}
```

## Delegation Policy

UA in EIP-7702 mode delegates the owner EOA to Particle's UA execution contract when a UA transaction needs it. The owner EOA remains the receiver/executor. Commerce Code later delegates the same EOA to Mogate7702 when that flow needs it.

No default `address(0)` clear step is included. Clearing costs gas and is only hygiene if Mogate explicitly wants blank EOA state between flows.

## Marketplace Extension

The same UA transaction builder can call marketplace buy functions on Arbitrum/Base. Payment can be sourced from supported primary assets across chains, but NFT ownership still settles on the NFT's native chain. Solana NFT marketplaces require a separate Solana-program transaction path if the UA SDK supports the needed Solana instructions.
