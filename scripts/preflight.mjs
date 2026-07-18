import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const CURRENT_WALLET_STACK = 'magic';
const API_PATHS = {
  checkoutInit: '/giftcard/checkout/init',
  checkout: '/giftcard/checkout/create',
  checkoutReconcile: '/api/checkouts/reconcile',
  catalogue: '/mogate/giftcard/brands',
  privyOnrampSession: '/api/privy/onramp/session',
  transakSession: '/api/transak/session'
};
const ACTIVE_PROFILE = {
  mode: 'mainnet',
  gatewayExecutionMode: 'ua7702',
  targetChainId: 42161,
  allowUnlistedTestnet: false,
  allowedPrimaryAssets: ['USDC', 'USDT'],
  particle: {
    projectId: '',
    clientKey: '',
    appId: ''
  },
  gateway: {
    version: 'signed-v2',
    signedAddress: '0x6dB964c89452761ad643dDa34090CF9e72D0f53D',
    fundedCollection: '0x24E050f703AFC2fC0C692B343906f4995754b5C9'
  }
};
const PRODUCT_SIGNERS = new Set(['magic']);
const BLOCKED_SIGNERS = new Map([
  ['privy', 'Privy is installed for migration reference, but Magic is the active embedded EOA provider.'],
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
  const targetChainId = ACTIVE_PROFILE.targetChainId;
  const allowUnlistedTestnet = ACTIVE_PROFILE.allowUnlistedTestnet;
  const gatewayVersion = ACTIVE_PROFILE.gateway.version;
  const apiBase = env.EXPO_API_BASE || 'http://localhost:4000';

  const particleReady =
    hasValue(env.EXPO_PUBLIC_PARTICLE_PROJECT_ID) &&
    hasValue(env.EXPO_PUBLIC_PARTICLE_CLIENT_KEY) &&
    hasValue(env.EXPO_PUBLIC_PARTICLE_APP_ID);

  const signerReady = PRODUCT_SIGNERS.has(stack);
  const signerDetail = signerReady
    ? `${stack} is product-enabled for Particle UA EIP-7702 in-place sends.`
    : BLOCKED_SIGNERS.get(stack) ?? `${stack} is not product-enabled.`;
  const signerProjectReady =
    stack === 'magic' &&
    hasValue(env.EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY) &&
    hasValue(env.EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI);
  const signerProjectDetail =
    stack === 'magic'
      ? signerProjectReady
        ? 'Magic publishable key and Google redirect URI are configured.'
        : 'Fill EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY and EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI.'
      : `${stack} is gated by the signer check before provider project config matters.`;

  const chainReady = PUBLIC_PARTICLE_UA_CHAIN_IDS.has(targetChainId);
  const signedAddress =
    env.EXPO_PUBLIC_FUNDED_GATEWAY_ADDRESS || ACTIVE_PROFILE.gateway.signedAddress;
  const fundedCollection =
    env.EXPO_PUBLIC_FUNDED_GIFTCARD_COLLECTION || ACTIVE_PROFILE.gateway.fundedCollection;
  const fundedGatewayReady = isAddress(signedAddress) && isAddress(fundedCollection);

  return [
    check(
      'execution-mode',
      'Gateway execution',
      ACTIVE_PROFILE.mode !== 'mainnet' || ACTIVE_PROFILE.gatewayExecutionMode === 'ua7702',
      ACTIVE_PROFILE.gatewayExecutionMode === 'ua7702'
        ? 'Mainnet funded checkout is locked to Particle UA EIP-7702 execution.'
        : 'Mainnet funded checkout must not use direct execution.'
    ),
    check(
      'particle',
      'Particle project',
      particleReady,
      particleReady
        ? 'Particle project ID, client key, and app ID are configured.'
        : 'Configure EXPO_PUBLIC_PARTICLE_PROJECT_ID, EXPO_PUBLIC_PARTICLE_CLIENT_KEY, and EXPO_PUBLIC_PARTICLE_APP_ID before Mainnet checkout.'
    ),
    check('signer', 'EIP-7702 signer', signerReady, signerDetail),
    check('signer-project', 'Signer project', signerProjectReady, signerProjectDetail),
    check(
      'chain',
      'Particle UA chain',
      chainReady,
      PUBLIC_PARTICLE_UA_CHAIN_IDS.has(targetChainId)
        ? `Chain ${targetChainId} is publicly listed by Particle UA.`
        : `Particle UA SDK 2.x does not support chain ${targetChainId}. Keep this testnet profile in direct mode.`
    ),
    ...ACTIVE_PROFILE.allowedPrimaryAssets.map((asset) => ({
      ...checkPrimaryAsset(asset, targetChainId, allowUnlistedTestnet),
      id: `primary-asset-${asset.toLowerCase()}`,
      label: `${asset} Primary Asset`
    })),
    check(
      'gateway',
      'UA funded gateway',
      fundedGatewayReady,
      fundedGatewayReady
        ? `Gateway mode ${gatewayVersion} has a configured proxy and collection.`
        : 'The signed funded gateway proxy and collection are not configured.'
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
