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
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
] as const;

export const AUTHORITY_GATEWAY_V3_ABI = [
  'function unsafeCheckout((string orderId,address collection,address to,string uri,(uint256 ctHash,uint8 securityZone,uint8 utype,bytes signature) encKey,string cipherRef) checkout,address paymentToken,uint256 amount) payable returns (uint256)'
] as const;

export const MOGATE_UA_FUNDED_GATEWAY_ABI = [
  'function checkout((string orderId,address collection,address to,string uri) checkout,(address token,uint256 amount) fee,(address token,uint256 amount)[] funding,(uint256 gasReserveAmount,uint256 nonce,uint256 deadline) permit,uint8 valuePolicy,bytes signature) payable returns (uint256 tokenId)',
  'function checkoutDigest((string orderId,address collection,address to,string uri) checkout,(address token,uint256 amount) fee,(address token,uint256 amount)[] funding,(uint256 gasReserveAmount,uint256 nonce,uint256 deadline) permit,uint8 valuePolicy,address payer) view returns (bytes32)',
  'function gatewayVersion() view returns (uint256)',
  'function backendSigner() view returns (address)',
  'function isPaused() view returns (bool)',
  'function allowedCollections(address collection) view returns (bool)',
  'function usedNonces(address payer, uint256 nonce) view returns (bool)',
  'function orders(bytes32 orderKey) view returns (uint8 state,address payer,address collection,bytes32 fundingHash,uint256 gasReserveAmount,uint256 refundDeadline,uint8 valuePolicy)'
] as const;

export const ERC721_TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
