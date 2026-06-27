import * as WebBrowser from 'expo-web-browser';

import type { RuntimeNetworkProfile } from '@/config/networkProfiles';

type TopUpInput = {
  profile: RuntimeNetworkProfile;
  walletAddress: string;
  fiatAmount?: string;
  partnerOrderId?: string;
};

async function fetchSignedWidgetUrl(input: TopUpInput) {
  const sessionEndpoint = `${input.profile.apiBase.replace(/\/+$/, '')}/${input.profile.paths.transakSession.replace(/^\/+/, '')}`;
  const response = await fetch(sessionEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      environment: input.profile.mode === 'mainnet' ? 'PRODUCTION' : 'STAGING',
      walletAddress: input.walletAddress,
      fiatAmount: input.fiatAmount,
      partnerOrderId: input.partnerOrderId
    })
  });

  if (!response.ok) {
    throw new Error(`Transak session endpoint failed ${response.status}: ${await response.text()}`);
  }

  const json = (await response.json()) as { url?: string; widgetUrl?: string };
  return json.url ?? json.widgetUrl ?? null;
}

export async function openTransakTopUp(input: TopUpInput) {
  const signedUrl = await fetchSignedWidgetUrl(input);
  if (!signedUrl) {
    throw new Error('Transak backend did not return a signed widget URL.');
  }

  return WebBrowser.openBrowserAsync(signedUrl);
}
