export type RequestTool = 'qr' | 'scan' | 'payment';

export const REQUEST_TOOL_PATHS: Record<RequestTool, '/request/qr' | '/request/scan' | '/request/payment'> = {
  qr: '/request/qr',
  scan: '/request/scan',
  payment: '/request/payment'
};
