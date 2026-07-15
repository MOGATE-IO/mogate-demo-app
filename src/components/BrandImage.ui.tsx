import type { ReactNode } from 'react';
import { Image } from 'react-native';
import { SvgUri } from 'react-native-svg';

import { resolveLocalBrandAsset } from '@/config/brandAssets';

export function BrandImage({
  accessibilityLabel,
  fallback = null,
  height,
  source,
  width
}: {
  accessibilityLabel?: string;
  fallback?: ReactNode;
  height: number;
  source?: string | null;
  width: number;
}) {
  const localAsset = resolveLocalBrandAsset(source);

  if (localAsset?.kind === 'svg') {
    const Asset = localAsset.Component;
    return <Asset accessibilityLabel={accessibilityLabel} height={height} width={width} />;
  }

  if (localAsset?.kind === 'raster') {
    return (
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={accessibilityLabel}
        resizeMode="contain"
        source={localAsset.source}
        style={{ height, width }}
      />
    );
  }

  if (source && /^https?:\/\//i.test(source)) {
    if (/\.svg(?:\?|#|$)/i.test(source)) {
      return <SvgUri height={height} uri={source} width={width} />;
    }
    return (
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={accessibilityLabel}
        resizeMode="contain"
        source={{ uri: source }}
        style={{ height, width }}
      />
    );
  }

  return fallback;
}
