import type { RuntimeNetworkProfile } from '@/config/networkProfiles';

export type PinnedCommerceCode = {
  cid: string;
  uri: string;
  network: string;
  chainId: string;
  recipient: string;
  expiresAtUnixSeconds: string;
};

/**
 * Pinning happens through OTA so a Pinata credential never ships in the Expo
 * bundle. OTA verifies the holder's EIP-712 signature and requires a locked
 * recipient before making the envelope publicly addressable by CID.
 */
export async function pinCommerceCodeEnvelope({
  envelope,
  profile
}: {
  envelope: Record<string, unknown>;
  profile: RuntimeNetworkProfile;
}): Promise<PinnedCommerceCode> {
  const response = await fetch(`${profile.apiBase.replace(/\/+$/, '')}/mogate/commerce-codes/pin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ envelope }, bigintReplacer)
  });
  const payload = await response.json().catch(() => null) as Partial<PinnedCommerceCode> & {
    message?: string;
  } | null;
  if (!response.ok || !payload?.cid || !payload.uri) {
    throw new Error(payload?.message || `Commerce Code CID could not be published (${response.status}).`);
  }
  return {
    cid: payload.cid,
    uri: payload.uri,
    network: payload.network || '',
    chainId: payload.chainId || '',
    recipient: payload.recipient || '',
    expiresAtUnixSeconds: payload.expiresAtUnixSeconds || ''
  };
}

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === 'bigint' ? value.toString() : value;
}
