# Short Commerce Code CID

The app supports two equivalent Commerce Code share forms:

- Long fallback: `arb1:MGPC1:<base64url envelope>`.
- Short form: a bare IPFS CID, for example `bafy...`.

The short form is only a content reference. IPFS stores the unchanged signed
MGPC1 envelope: `network`, `chainId`, payment-code gateway, collection,
tokenId, holder, recipient, expiry, secret commitment, EIP-712 signature, and
the optional EIP-7702 authorization.

```text
Owner signs recipient-locked intent
  -> Mobile POST /mogate/commerce-codes/pin
  -> OTA verifies holder EIP-712 signature and recipient is not address(0)
  -> OTA pins envelope with Pinata
  -> Mobile displays bare CID as QR / copy value
  -> Merchant SDK resolves CID from IPFS
  -> Merchant validates network, expiry, signature, ownership, and recipient
  -> Existing executeSignedPaymentCode consume path
```

Public CID sharing is safe only for a recipient-locked code. The OTA pin endpoint
rejects an unlocked `address(0)` recipient, an invalid commitment, an expired
intent, a bad holder signature, and unsupported visibility mode. Configure its
server-only Pinata credential as `MOGATE_IPFS_PINATA_JWT`; it must never be put
in an Expo public variable.

Merchant integration uses `resolveMerchantPaymentCode(code, expectedNetwork?,
resolver?)` from `@mogate/programmable-payment-sdk/evm`. It accepts either
format, discovers the native chain from the envelope, produces the existing
payment-code package, and returns the normal execution function.
