import type { ComponentType } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';

import EthereumLogo from '@assets/+logos/ethereum-eth-logo.svg';
import ArbitrumLogo from '@assets/images/network/arbitrum-arb-logo.svg';
import BaseLogo from '@assets/images/network/base.svg';
import SolanaLogo from '@assets/images/network/solana-sol-logo.svg';
import UsdcLogo from '@assets/images/token/usdc.svg';
import UsdtLogo from '@assets/images/token/usdt.svg';
import type { TransferAsset } from '@/features/transfer/services/transferAssets';

type LogoComponent = ComponentType<SvgProps>;

function networkLogo(chainId: number): LogoComponent | null {
  if (chainId === 42161 || chainId === 421614) return ArbitrumLogo;
  if (chainId === 1 || chainId === 11155111) return EthereumLogo;
  if (chainId === 8453) return BaseLogo;
  if (chainId === 101 || chainId === 103) return SolanaLogo;
  return null;
}

function tokenLogo(asset: TransferAsset): LogoComponent | null {
  if (asset.symbol === 'USDC') return UsdcLogo;
  if (asset.symbol === 'USDT') return UsdtLogo;
  if (asset.symbol === 'ETH') return EthereumLogo;
  if (asset.symbol === 'SOL') return SolanaLogo;
  return null;
}

export function TransferNetworkMark({ chainId, size = 18 }: { chainId: number; size?: number }) {
  const Logo = networkLogo(chainId);
  return Logo ? <Logo accessibilityElementsHidden height={size} width={size} /> : null;
}

export function TransferAssetMark({ asset, size = 40 }: { asset: TransferAsset; size?: number }) {
  const TokenLogo = tokenLogo(asset);
  const NetworkLogo = networkLogo(asset.chainId);
  const logoSize = Math.round(size * 0.68);
  const badgeSize = Math.round(size * 0.39);

  return (
    <View
      accessibilityLabel={`${asset.symbol} on ${asset.chainLabel}`}
      accessibilityRole="image"
      style={[styles.frame, { height: size, width: size }]}
    >
      {TokenLogo ? (
        <TokenLogo accessibilityElementsHidden height={logoSize} width={logoSize} />
      ) : (
        <Text style={styles.fallback}>{asset.symbol.slice(0, 3)}</Text>
      )}
      {NetworkLogo && asset.kind !== 'native' ? (
        <View style={[styles.badge, { height: badgeSize + 4, width: badgeSize + 4 }]}>
          <NetworkLogo accessibilityElementsHidden height={badgeSize} width={badgeSize} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    backgroundColor: '#f4f4f5',
    borderRadius: 8,
    justifyContent: 'center'
  },
  fallback: {
    color: '#18181b',
    fontSize: 10,
    fontWeight: '800'
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e4e4e7',
    borderRadius: 999,
    borderWidth: 1,
    bottom: -2,
    justifyContent: 'center',
    position: 'absolute',
    right: -2
  }
});
