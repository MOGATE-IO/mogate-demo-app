import { RequestHub } from '@/features/request/components/RequestHub.ui';
import type { AppScreenContext } from './types';

export function RequestHubScreen({ context }: { context: AppScreenContext }) {
  return <RequestHub onOpenTool={context.goToRequestTool} />;
}
