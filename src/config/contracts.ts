import type { HexString } from '@/@web3/types/wallet';

export { PUBLIC_PARTICLE_UA_CHAIN_IDS, isPublicParticleUaChain } from './particleUaSupport';

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

export const ARBITRUM_SEPOLIA_GIFTCARD = {
  chainId: 421614,
  network: 'arbitrum',
  cluster: 'testnet',
  authorityGateway: '0x58C18578885BdB7f469612aAB662cfDF33dde3e1' as HexString,
  collection: '0xb5b1f04020b1226c545bed6f122a5726664aec0f' as HexString,
  nativePaymentToken: ZERO_ADDRESS
} as const;

export const ERC20_APPROVAL_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)'
] as const;

export const AUTHORITY_GATEWAY_V3_ABI = [
  'function unsafeCheckout((string orderId,address collection,address to,string uri,(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encKey,string cipherRef) checkout,address paymentToken,uint256 amount) payable returns (uint256)'
] as const;

export const MOGATE_UA_MINT_GATEWAY_V2_ABI = [
  'function checkoutFundedV2((string orderId,address collection,address to,string uri) checkout,(address token,uint256 amount,address recipient) payment,(address valueToken,uint256 valueAmount,uint256 gasReserveAmount) funding) payable returns (uint256 tokenId)'
] as const;

export const ERC721_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
