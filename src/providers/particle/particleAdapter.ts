import { Signature } from 'ethers';

import {
  getDefaultNetworkProfile,
  hasParticleProjectConfig
} from '@/config/networkProfiles';
import type {
  Eip7702AuthorizationRequest,
  HexString,
  WalletAdapter,
  WalletSnapshot
} from '@/types/wallet';
import { CapabilityBlockedError } from '@/utils/errors';

import { probeUniversalAccount } from '@/services/particleUniversalAccount';

type ParticleModules = {
  base: Record<string, any>;
  auth: Record<string, any>;
  chains: Record<string, any>;
};

let modulesPromise: Promise<ParticleModules> | null = null;
let initialized = false;

async function loadParticleModules() {
  modulesPromise ??= Promise.all([
    import('@particle-network/rn-base'),
    import('@particle-network/rn-auth-core'),
    import('@particle-network/chains')
  ]).then(([base, auth, chains]) => ({
    base: base as Record<string, any>,
    auth: auth as Record<string, any>,
    chains: chains as Record<string, any>
  }));
  return modulesPromise;
}

function findChainInfo(chains: Record<string, any>, chainId: number) {
  const seen = new Set<unknown>();
  const stack = Object.values(chains);

  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    if (typeof current === 'object') {
      if (Number(current.id ?? current.chainId) === chainId) return current;
      stack.push(...Object.values(current));
    }
  }

  return chains.Ethereum ?? chains.ethereum ?? Object.values(chains)[0];
}

function getParticleEnv(base: Record<string, any>) {
  const env = base.Env ?? base.default?.Env ?? {};
  const normalized = getDefaultNetworkProfile().particle.env.toLowerCase();
  if (normalized === 'production') return env.Production ?? env.production ?? 'production';
  if (normalized === 'dev') return env.Dev ?? env.dev ?? 'dev';
  return env.Staging ?? env.staging ?? env.Production ?? 'staging';
}

async function ensureParticleInitialized() {
  const profile = getDefaultNetworkProfile();
  if (!hasParticleProjectConfig(profile)) {
    throw new Error('Particle Auth probe project is not configured in src/config/networkProfiles.ts.');
  }

  const modules = await loadParticleModules();
  if (!initialized) {
    const chainInfo = findChainInfo(modules.chains, profile.ua.targetChainId);
    modules.base.init?.(chainInfo, getParticleEnv(modules.base));
    modules.auth.init?.();
    initialized = true;
  }
  return modules;
}

function getLoginType(base: Record<string, any>, auth: Record<string, any>, key: string) {
  const loginType = base.LoginType ?? auth.LoginType ?? {};
  return loginType[key] ?? loginType[key.toLowerCase()] ?? key.toLowerCase();
}

function getSocialPrompt(base: Record<string, any>) {
  const prompt = base.SocialLoginPrompt ?? {};
  return prompt.SelectAccount ?? prompt.selectAccount ?? prompt.Consent ?? null;
}

function extractSignature(result: unknown): HexString {
  if (typeof result === 'string') return result as HexString;
  const maybe = result as Record<string, any>;
  const signature = maybe?.signature?.serialized ?? maybe?.signature ?? maybe?.data ?? maybe?.result;
  if (typeof signature === 'string') return signature as HexString;
  throw new Error('Particle returned an unexpected signature response.');
}

function normalizeParticleAddress(address: unknown) {
  if (typeof address === 'string') return address;
  const maybe = address as Record<string, any>;
  return maybe?.address ?? maybe?.publicAddress ?? maybe?.result ?? null;
}

async function getParticleEvmAddress(modules: ParticleModules) {
  const evm = modules.auth.evm ?? modules.auth.Evm ?? {};
  const address = await evm.getAddress?.();
  return normalizeParticleAddress(address);
}

async function getParticleSolanaAddress(modules: ParticleModules) {
  const solana = modules.auth.solana ?? modules.auth.Solana ?? {};
  const address = await solana.getAddress?.().catch(() => null);
  return normalizeParticleAddress(address);
}

async function signViaParticleEvm(methods: Record<string, any>, message: string) {
  const signer =
    methods.personalSign ??
    methods.personalSignUnique ??
    methods.signMessage ??
    methods.sign ??
    methods.signTypedData;
  if (!signer) {
    throw new Error('Particle EVM signer is not available after login.');
  }
  return extractSignature(await signer(message));
}

async function trySign7702(
  modules: ParticleModules,
  authorization: Eip7702AuthorizationRequest
) {
  const evm = modules.auth.evm ?? modules.auth.Evm ?? {};
  const candidates = [
    evm.sign7702Authorization,
    evm.signEip7702Authorization,
    evm.signEIP7702Authorization,
    evm.authorize7702,
    evm.authorizeEip7702,
    evm.authorizeSync
  ].filter(Boolean);

  if (!candidates.length) {
    throw new CapabilityBlockedError(
      'Particle RN Auth is connected, but this installed SDK does not expose sign7702Authorization/authorizeSync.'
    );
  }

  const result = await candidates[0](authorization);
  if (typeof result === 'string') return { signature: result as HexString };
  const signature = result?.signature?.serialized
    ? result.signature.serialized
    : result?.signature
      ? Signature.from(result.signature).serialized
      : Signature.from(result).serialized;
  return { signature: signature as HexString };
}

export function createParticleAdapter(): WalletAdapter {
  return {
    stack: 'particle',
    label: 'Particle Auth probe',
    async connect(): Promise<WalletSnapshot> {
      const modules = await ensureParticleInitialized();
      const loginType = getLoginType(modules.base, modules.auth, 'Google');
      const prompt = getSocialPrompt(modules.base);

      await modules.auth.connect?.(loginType, null, [], prompt);
      const address = await getParticleEvmAddress(modules);
      if (!address) throw new Error('Particle login completed but no EVM address was returned.');

      const uaProbe = await probeUniversalAccount(address);

      return {
        stack: 'particle',
        status: 'connected',
        address,
        ownerAddress: uaProbe.ownerAddress ?? address,
        evmUaAddress: uaProbe.evmUaAddress,
        solanaUaAddress: uaProbe.solanaUaAddress ?? (await getParticleSolanaAddress(modules)),
        balance: uaProbe.primaryAssets,
        capabilities: {
          eip712: 'supported',
          eip7702Authorization: 'unknown',
          universalAccount: 'supported',
          topUp: 'supported'
        },
        lastError: null
      };
    },
    async disconnect() {
      const modules = await ensureParticleInitialized();
      await modules.auth.disconnect?.();
    },
    async refresh() {
      const modules = await ensureParticleInitialized();
      const address = await getParticleEvmAddress(modules);
      if (!address) {
        return {
          status: 'idle',
          address: null,
          balance: null
        };
      }
      const uaProbe = await probeUniversalAccount(address);
      return {
        status: 'connected',
        address,
        ownerAddress: uaProbe.ownerAddress ?? address,
        evmUaAddress: uaProbe.evmUaAddress,
        solanaUaAddress: uaProbe.solanaUaAddress,
        balance: uaProbe.primaryAssets
      };
    },
    async signMessage(message) {
      const modules = await ensureParticleInitialized();
      const evm = modules.auth.evm ?? modules.auth.Evm ?? {};
      return signViaParticleEvm(evm, message);
    },
    async signTypedData(typedData) {
      const modules = await ensureParticleInitialized();
      const evm = modules.auth.evm ?? modules.auth.Evm ?? {};
      const signer = evm.signTypedData ?? evm.signTypedDataUnique;
      if (!signer) throw new Error('Particle EIP-712 signer is not available.');
      return extractSignature(await signer(typedData));
    },
    async sign7702Authorization(authorization) {
      const modules = await ensureParticleInitialized();
      return trySign7702(modules, authorization);
    }
  };
}
