import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CURRENT_WALLET_STACK = 'privy';
const API_PATHS = {
  checkout: '/api/checkouts/unsafe-arbitrum',
  checkoutReconcile: '/api/checkouts/reconcile',
  catalogue: '/api/giftcards/catalogue',
  privyOnrampSession: '/api/privy/onramp/session',
  transakSession: '/api/transak/session'
};
const MAINNET_PROFILE = {
  targetChainId: 42161,
  allowUnlistedTestnet: false,
  expectedPrimaryAsset: '',
  particle: {
    projectId: '',
    clientKey: '',
    appId: ''
  },
  gateway: {
    version: 'v2',
    v2Address: '',
    fundedCollection: ''
  }
};
const PRODUCT_SIGNERS = new Set(['privy']);
const BLOCKED_SIGNERS = new Map([
  ['magic', 'Magic is reference-only and not bundled in the default Expo SDK 56 product app.'],
  ['dynamic', 'Dynamic RN WaaS connector is not wired yet.'],
  ['particle', 'Particle RN Auth is a probe and is not listed as a verified Particle UA EIP-7702 signer.']
]);
const PUBLIC_PARTICLE_UA_CHAIN_IDS = new Set([1, 56, 196, 8453, 42161, 101]);
const PARTICLE_PRIMARY_ASSETS = new Set(['ETH', 'USDT', 'USDC', 'SOL', 'BNB']);
const PARTICLE_PRIMARY_ASSETS_BY_CHAIN = new Map([
  [1, new Set(['USDC', 'USDT', 'ETH'])],
  [56, new Set(['USDC', 'USDT', 'ETH', 'BNB'])],
  [8453, new Set(['USDC', 'ETH'])],
  [42161, new Set(['USDC', 'USDT', 'ETH'])],
  [101, new Set(['USDC', 'USDT', 'SOL'])]
]);
function parseDotEnv(text) {
  const values = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^['"]|['"]$/g, '');
    values[key] = value;
  }

  return values;
}

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  const exampleEnvPath = resolve(process.cwd(), '.env.example');
  const exampleEnv = existsSync(exampleEnvPath)
    ? parseDotEnv(readFileSync(exampleEnvPath, 'utf8'))
    : {};
  const fileEnv = existsSync(envPath) ? parseDotEnv(readFileSync(envPath, 'utf8')) : {};
  return {
    ...exampleEnv,
    ...fileEnv,
    ...process.env
  };
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value ?? ''));
}

function hasValue(value) {
  return String(value ?? '').trim().length > 0;
}

function check(id, label, ok, detail) {
  return {
    id,
    label,
    status: ok ? 'ready' : 'blocked',
    detail
  };
}

function checkPrimaryAsset(assetInput, targetChainId, allowUnlistedTestnet) {
  const asset = String(assetInput ?? '').trim().toUpperCase();
  if (!asset) {
    return {
      id: 'primary-asset',
      label: 'Primary Asset',
      status: 'ready',
      detail: 'No expected Primary Asset is pinned. Particle SDK may choose a supported source asset per transaction.'
    };
  }

  if (!PARTICLE_PRIMARY_ASSETS.has(asset)) {
    return {
      id: 'primary-asset',
      label: 'Primary Asset',
      status: 'blocked',
      detail: `${asset} is not in Particle's public Primary Asset allowlist. Use ETH, USDT, USDC, SOL, or BNB.`
    };
  }

  if (!PUBLIC_PARTICLE_UA_CHAIN_IDS.has(targetChainId)) {
    return {
      id: 'primary-asset',
      label: 'Primary Asset',
      status: allowUnlistedTestnet ? 'ready' : 'blocked',
      detail: allowUnlistedTestnet
        ? `${asset} is a Primary Asset, but chain ${targetChainId} is testnet/locally allowed. Confirm the route in Particle dashboard/SDK before sending.`
        : `Chain ${targetChainId} is not publicly listed by Particle UA, so ${asset} support cannot be assumed.`
    };
  }

  const assetsOnChain = PARTICLE_PRIMARY_ASSETS_BY_CHAIN.get(targetChainId) ?? new Set();
  if (!assetsOnChain.has(asset)) {
    return {
      id: 'primary-asset',
      label: 'Primary Asset',
      status: 'blocked',
      detail: `${asset} is a Primary Asset globally, but Particle's public availability table does not list it on chain ${targetChainId}.`
    };
  }

  return {
    id: 'primary-asset',
    label: 'Primary Asset',
    status: 'ready',
    detail: `${asset} is listed as a Particle Primary Asset on chain ${targetChainId}.`
  };
}

function buildChecks(env) {
  const stack = CURRENT_WALLET_STACK;
  const targetChainId = MAINNET_PROFILE.targetChainId;
  const allowUnlistedTestnet = MAINNET_PROFILE.allowUnlistedTestnet;
  const gatewayVersion = MAINNET_PROFILE.gateway.version;
  const apiBase = env.EXPO_API_BASE || 'http://localhost:4000';

  const particleReady =
    hasValue(MAINNET_PROFILE.particle.projectId) &&
    hasValue(MAINNET_PROFILE.particle.clientKey) &&
    hasValue(MAINNET_PROFILE.particle.appId);

  const signerReady = PRODUCT_SIGNERS.has(stack);
  const signerDetail = signerReady
    ? `${stack} is product-enabled for Particle UA EIP-7702 in-place sends.`
    : BLOCKED_SIGNERS.get(stack) ?? `${stack} is not product-enabled.`;
  const signerProjectReady =
    stack !== 'privy' ||
    (hasValue(env.EXPO_PUBLIC_PRIVY_APP_ID) && hasValue(env.EXPO_PUBLIC_PRIVY_CLIENT_ID));
  const signerProjectDetail =
    stack === 'privy'
      ? signerProjectReady
        ? 'Privy app ID and client ID are configured.'
        : 'Fill EXPO_PUBLIC_PRIVY_APP_ID and EXPO_PUBLIC_PRIVY_CLIENT_ID.'
      : `${stack} is gated by the signer check before provider project config matters.`;

  const chainReady = PUBLIC_PARTICLE_UA_CHAIN_IDS.has(targetChainId) || allowUnlistedTestnet;
  const v2Ready =
    gatewayVersion !== 'v2' ||
    (isAddress(MAINNET_PROFILE.gateway.v2Address) &&
      isAddress(MAINNET_PROFILE.gateway.fundedCollection));

  return [
    check(
      'particle',
      'Particle project',
      particleReady,
      particleReady
        ? 'Particle project ID, client key, and app ID are configured.'
        : 'Configure the Particle UA project in apps/mobile/src/config/networkProfiles.ts when UA minting resumes.'
    ),
    check('signer', 'EIP-7702 signer', signerReady, signerDetail),
    check('signer-project', 'Signer project', signerProjectReady, signerProjectDetail),
    check(
      'chain',
      'Particle UA chain',
      chainReady,
      PUBLIC_PARTICLE_UA_CHAIN_IDS.has(targetChainId)
        ? `Chain ${targetChainId} is publicly listed by Particle UA.`
        : allowUnlistedTestnet
          ? `Chain ${targetChainId} is enabled by local testnet override. Use only after Particle dashboard/SDK confirmation.`
          : `Chain ${targetChainId} is not publicly listed. Confirm testnet support before enabling the code-level testnet override.`
    ),
    checkPrimaryAsset(MAINNET_PROFILE.expectedPrimaryAsset, targetChainId, allowUnlistedTestnet),
    check(
      'gateway',
      `${gatewayVersion} gateway`,
      v2Ready,
      v2Ready
        ? `Gateway mode ${gatewayVersion} has required config.`
        : 'V2 gateway and funded collection are not configured in apps/mobile/src/config/networkProfiles.ts.'
    ),
    check(
      'checkout',
      'API base',
      hasValue(apiBase),
      hasValue(apiBase)
        ? `API base is configured; checkout path is ${API_PATHS.checkout}.`
        : 'EXPO_API_BASE is missing.'
    )
  ];
}

function main() {
  const env = loadEnv();
  const checks = buildChecks(env);
  const blocked = checks.filter((item) => item.status === 'blocked');

  console.log('Mogate UA mobile preflight');
  console.log('');

  for (const item of checks) {
    const mark = item.status === 'ready' ? 'OK' : 'BLOCKED';
    console.log(`[${mark}] ${item.label}: ${item.detail}`);
  }

  if (blocked.length) {
    console.log('');
    console.log(`${blocked.length} blocker${blocked.length === 1 ? '' : 's'} found. Product UA sends must stay disabled.`);
    process.exitCode = 1;
  } else {
    console.log('');
    console.log('Preflight passed. Product UA sends may be tested on the configured environment.');
  }
}

main();
