import { Buffer } from 'buffer';
import { Wallet } from 'ethers';
import { describe, expect, it, vi } from 'vitest';

import { getNetworkProfile } from '../src/config/networkProfiles';
import type { HexString, WalletAdapter } from '../src/@web3/types/wallet';
import type { GiftcardInventoryItem } from '../src/features/inventory/services/giftcardInventory';
import { generateProgrammablePaymentCode } from '../src/features/inventory/services/programmablePaymentCode';

const profile = getNetworkProfile('testnet');

function inventoryItem(): GiftcardInventoryItem {
  return {
    id: `${profile.gateway.legacyCollection.toLowerCase()}:59`,
    collection: profile.gateway.legacyCollection as HexString,
    collectionName: 'Mogate Giftcard',
    tokenId: '59',
    title: 'Mogate Giftcard',
    brandName: 'Mogate',
    category: 'FinTech',
    value: 25,
    currency: 'USD',
    region: 'GLOBAL',
    imageUrl: null,
    metadataUri: 'https://example.com/59.json',
    externalUrl: null,
    networkLabel: profile.ua.chainLabel,
    isUnwrapped: false,
    isEncrypted: true,
    encryptionType: 'fhenix',
    giftCode: null,
    isFunded: false,
    fundBalances: [],
    gasReserveAtomic: null,
    gasReserveDisplay: null,
    attributes: [],
    discovery: 'enumerable'
  };
}

function signerAdapter(signer: Wallet) {
  const signTypedData = vi.fn(async (payload: string) => {
    const parsed = JSON.parse(payload) as {
      domain: Parameters<Wallet['signTypedData']>[0];
      message: Parameters<Wallet['signTypedData']>[2];
      types: Record<string, Array<{ name: string; type: string }>>;
    };
    const { EIP712Domain: _domain, ...types } = parsed.types;
    return signer.signTypedData(parsed.domain, types, parsed.message) as Promise<HexString>;
  });
  const sign7702Authorization = vi.fn(async () => ({
    signature: await signer.signMessage('mogate-7702') as HexString
  }));
  const getProvider = vi.fn(async () => ({
    request: vi.fn(async ({ method }: { method: string }) => {
      if (method === 'eth_getTransactionCount') return '0x3';
      throw new Error(`Unexpected method ${method}`);
    })
  }));
  const adapter: WalletAdapter = {
    stack: 'privy',
    label: 'Test signer',
    connect: async () => ({
      stack: 'privy',
      status: 'connected',
      address: signer.address,
      capabilities: {
        eip712: 'supported',
        eip7702Authorization: 'supported',
        universalAccount: 'supported',
        topUp: 'unsupported'
      }
    }),
    disconnect: async () => undefined,
    refresh: async () => ({}),
    signMessage: async (message) => signer.signMessage(message) as Promise<HexString>,
    signTypedData,
    sign7702Authorization,
    getProvider
  };
  return { adapter, getProvider, sign7702Authorization, signTypedData };
}

function decodeEnvelope(code: string) {
  const [, version, encoded] = code.split(':');
  expect(version).toBe('MGPC1');
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as Record<string, any>;
}

describe('programmable payment code', () => {
  it('generates a direct signature-only code without invoking UA7702', async () => {
    const signer = Wallet.createRandom();
    const wallet = signerAdapter(signer);
    const result = await generateProgrammablePaymentCode({
      expirySeconds: 900,
      item: inventoryItem(),
      ownerAddress: signer.address,
      profile,
      ua7702: false,
      wallet: wallet.adapter
    });
    const envelope = decodeEnvelope(result.code);

    expect(result.authorization7702Included).toBe(false);
    expect(result.code.startsWith('sep:MGPC1:')).toBe(true);
    expect(envelope.generationMode).toBe('signature-only');
    expect(envelope.intent.holder).toBe(signer.address);
    expect(envelope.intent.tokenId).toBe('59');
    expect(envelope.authorization7702).toBeUndefined();
    expect(wallet.signTypedData).toHaveBeenCalledOnce();
    expect(wallet.sign7702Authorization).not.toHaveBeenCalled();
    expect(wallet.getProvider).not.toHaveBeenCalled();
  });

  it('attaches the optional UA7702 authorization only when requested', async () => {
    const signer = Wallet.createRandom();
    const wallet = signerAdapter(signer);
    const result = await generateProgrammablePaymentCode({
      item: inventoryItem(),
      ownerAddress: signer.address,
      profile,
      ua7702: true,
      wallet: wallet.adapter
    });
    const envelope = decodeEnvelope(result.code);

    expect(result.authorization7702Included).toBe(true);
    expect(envelope.authorization7702).toMatchObject({
      chainId: 11155111,
      nonce: '3'
    });
    expect(wallet.sign7702Authorization).toHaveBeenCalledOnce();
    expect(wallet.getProvider).toHaveBeenCalledOnce();
  });
});
