export type MogateNewsItem = {
  id: string;
  title: string;
  summary: string;
  dateLabel: string;
  status: 'Live' | 'Product' | 'Preview';
};

export const MOCK_MOGATE_NEWS: MogateNewsItem[] = [
  {
    id: 'mainnet-live',
    title: 'Mogate is live on mainnet',
    summary: 'The first funded giftcard route is ready for mainnet settlement and inventory tracking.',
    dateLabel: 'Today',
    status: 'Live'
  },
  {
    id: 'funded-giftcards',
    title: 'Funded giftcards enter rollout',
    summary: 'Merchant checkout is moving from voucher claims toward directly funded onchain giftcards.',
    dateLabel: 'Jul 14',
    status: 'Product'
  },
  {
    id: 'ua7702-routing',
    title: 'UA7702 routing preview',
    summary: 'Cross-network USDC payment preparation is now visible before the mainnet routing phase.',
    dateLabel: 'Jul 12',
    status: 'Preview'
  }
];
