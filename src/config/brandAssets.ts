import type { ComponentType } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import MogateMark from '@assets/mogate-mark-white.svg';
import MogateText from '@assets/mogate-text-white.svg';
import MogateTextSharp from '@assets/mogate-text-white-sharp.svg';
import MogateTextPng from '@assets/logo_mogate_white_text.png';
import AdidasLogo from '@assets/images/company/adidas-logo.png';
import AirbnbLogo from '@assets/images/company/airbnb-logo.png';
import DominosLogo from '@assets/images/company/dominos-logo.png';
import DoordashLogo from '@assets/images/company/doordash-logo.png';
import EmilessLogo from '@assets/images/company/emiless-logo.svg';
import LezgoLogo from '@assets/images/company/lezgo_logo.svg';
import LezgoLogoPng from '@assets/images/company/lezgo_logo.png';
import LezgoLogoWhite from '@assets/images/company/lezgo_logo_white.svg';
import LezgoLogoWhitePng from '@assets/images/company/lezgo_logo_white.png';
import NetflixLogo from '@assets/images/company/netflix-logo.png';
import SephoraLogo from '@assets/images/company/sephora-logo.png';
import StarbucksLogo from '@assets/images/company/starbucks-logo.png';
import UberLogo from '@assets/images/company/uber-logo.png';
import AdidasGiftcard from '@assets/images/giftcards/adidas.svg';
import AirbnbGiftcard from '@assets/images/giftcards/airbnb.svg';
import ComingSoonGiftcard from '@assets/images/giftcards/coming-soon.svg';
import DominoGiftcard from '@assets/images/giftcards/domino.svg';
import DoordashGiftcard from '@assets/images/giftcards/doordash.svg';
import LezgoGiftcard from '@assets/images/giftcards/lezgo.svg';
import MogateGiftcard from '@assets/images/giftcards/logo.svg';
import NetflixGiftcard from '@assets/images/giftcards/netflix.svg';
import SephoraGiftcard from '@assets/images/giftcards/sephora.svg';
import StarbucksGiftcard from '@assets/images/giftcards/starbucks.svg';
import UberGiftcard from '@assets/images/giftcards/uber.svg';
import { normalizeLocalAssetPath } from '@/utils/assetPaths';

export type LocalBrandAsset =
  | { kind: 'svg'; Component: ComponentType<SvgProps> }
  | { kind: 'raster'; source: ImageSourcePropType };

const svg = (Component: ComponentType<SvgProps>): LocalBrandAsset => ({ kind: 'svg', Component });
const raster = (source: ImageSourcePropType): LocalBrandAsset => ({ kind: 'raster', source });

const LOCAL_BRAND_ASSETS: Record<string, LocalBrandAsset> = {
  '/mogate-mark-white.svg': svg(MogateMark),
  '/mogate-text-white.svg': svg(MogateText),
  '/mogate-text-white-sharp.svg': svg(MogateTextSharp),
  '/logo_mogate_white_text.png': raster(MogateTextPng),
  '/images/company/mogate-logo.png': svg(MogateMark),
  '/images/company/adidas-logo.png': raster(AdidasLogo),
  '/images/company/airbnb-logo.png': raster(AirbnbLogo),
  '/images/company/dominos-logo.png': raster(DominosLogo),
  '/images/company/doordash-logo.png': raster(DoordashLogo),
  '/images/company/emiless-logo.svg': svg(EmilessLogo),
  '/images/company/lezgo_logo.svg': svg(LezgoLogo),
  '/images/company/lezgo_logo.png': raster(LezgoLogoPng),
  '/images/company/lezgo_logo_white.svg': svg(LezgoLogoWhite),
  '/images/company/lezgo_logo_white.png': raster(LezgoLogoWhitePng),
  '/images/company/netflix-logo.png': raster(NetflixLogo),
  '/images/company/sephora-logo.png': raster(SephoraLogo),
  '/images/company/starbucks-logo.png': raster(StarbucksLogo),
  '/images/company/uber-logo.png': raster(UberLogo),
  '/images/giftcards/adidas.svg': svg(AdidasGiftcard),
  '/images/giftcards/airbnb.svg': svg(AirbnbGiftcard),
  '/images/giftcards/coming-soon.svg': svg(ComingSoonGiftcard),
  '/images/giftcards/domino.svg': svg(DominoGiftcard),
  '/images/giftcards/doordash.svg': svg(DoordashGiftcard),
  '/images/giftcards/lezgo.svg': svg(LezgoGiftcard),
  '/images/giftcards/logo.svg': svg(MogateGiftcard),
  '/images/giftcards/netflix.svg': svg(NetflixGiftcard),
  '/images/giftcards/sephora.svg': svg(SephoraGiftcard),
  '/images/giftcards/starbucks.svg': svg(StarbucksGiftcard),
  '/images/giftcards/uber.svg': svg(UberGiftcard)
};

export function resolveLocalBrandAsset(value?: string | null) {
  const path = normalizeLocalAssetPath(value);
  if (!path) return null;
  return LOCAL_BRAND_ASSETS[path] ?? null;
}
