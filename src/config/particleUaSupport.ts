export const PUBLIC_PARTICLE_UA_CHAIN_IDS = [1, 56, 196, 8453, 42161, 101] as const;

export const PARTICLE_PRIMARY_ASSETS = ['ETH', 'USDT', 'USDC', 'SOL', 'BNB'] as const;

export type ParticlePrimaryAsset = (typeof PARTICLE_PRIMARY_ASSETS)[number];

export const PARTICLE_PRIMARY_ASSETS_BY_CHAIN: Partial<
  Record<(typeof PUBLIC_PARTICLE_UA_CHAIN_IDS)[number], readonly ParticlePrimaryAsset[]>
> = {
  1: ['USDC', 'USDT', 'ETH'],
  56: ['USDC', 'USDT', 'ETH', 'BNB'],
  8453: ['USDC', 'ETH'],
  42161: ['USDC', 'USDT', 'ETH'],
  101: ['USDC', 'USDT', 'SOL']
} as const;

export function isPublicParticleUaChain(chainId: number) {
  return PUBLIC_PARTICLE_UA_CHAIN_IDS.includes(chainId as (typeof PUBLIC_PARTICLE_UA_CHAIN_IDS)[number]);
}

export function isParticlePrimaryAsset(asset: string) {
  return PARTICLE_PRIMARY_ASSETS.includes(asset.toUpperCase() as ParticlePrimaryAsset);
}

export function getParticlePrimaryAssetsForChain(chainId: number) {
  return PARTICLE_PRIMARY_ASSETS_BY_CHAIN[
    chainId as keyof typeof PARTICLE_PRIMARY_ASSETS_BY_CHAIN
  ] ?? [];
}

export function isParticlePrimaryAssetOnChain(chainId: number, asset: string) {
  return getParticlePrimaryAssetsForChain(chainId).includes(asset.toUpperCase() as ParticlePrimaryAsset);
}

export function describeParticlePrimaryAssetConfig(input: {
  chainId: number;
  asset?: string | null;
  allowUnlistedTestnet?: boolean;
}) {
  const asset = input.asset?.trim().toUpperCase();
  const publicChain = isPublicParticleUaChain(input.chainId);

  if (!asset) {
    return {
      status: 'ready' as const,
      detail: 'No expected Primary Asset is pinned. Particle SDK may choose a supported source asset per transaction.'
    };
  }

  if (!isParticlePrimaryAsset(asset)) {
    return {
      status: 'blocked' as const,
      detail: `${asset} is not in Particle's public Primary Asset allowlist. Use ETH, USDT, USDC, SOL, or BNB.`
    };
  }

  if (!publicChain) {
    return {
      status: input.allowUnlistedTestnet ? ('idle' as const) : ('blocked' as const),
      detail: input.allowUnlistedTestnet
        ? `${asset} is a Primary Asset, but chain ${input.chainId} is testnet/locally allowed. Confirm the route in Particle dashboard/SDK before sending.`
        : `Chain ${input.chainId} is not publicly listed by Particle UA, so ${asset} support cannot be assumed.`
    };
  }

  if (!isParticlePrimaryAssetOnChain(input.chainId, asset)) {
    return {
      status: 'blocked' as const,
      detail: `${asset} is a Primary Asset globally, but Particle's public availability table does not list it on chain ${input.chainId}.`
    };
  }

  return {
    status: 'ready' as const,
    detail: `${asset} is listed as a Particle Primary Asset on chain ${input.chainId}.`
  };
}
