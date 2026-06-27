import { describe, expect, it } from 'vitest';

import {
  buildEnvBlocks,
  normalizeDeployment,
  renderEnvBlocks
} from '../../../scripts/ua-v2-env.mjs';

const deployment = {
  chainId: 421614,
  gatewayVersion: 'v2',
  v2GatewayAddress: '0x1111111111111111111111111111111111111111',
  fundedGiftcardCollection: '0x2222222222222222222222222222222222222222',
  paymentRecipient: '0x3333333333333333333333333333333333333333'
};

describe('ua-v2-env handoff', () => {
  it('normalizes deployment JSON into mobile and server env blocks', () => {
    const blocks = buildEnvBlocks(deployment);

    expect(blocks.mobile).toMatchObject({
      targetFile: 'apps/mobile/src/config/networkProfiles.ts',
      chainId: '421614'
    });
    expect(blocks.mobile.networkProfilesPatch).toContain(deployment.v2GatewayAddress);
    expect(blocks.mobile.networkProfilesPatch).toContain(deployment.fundedGiftcardCollection);
    expect(blocks.mobile.networkProfilesPatch).not.toContain(deployment.paymentRecipient);
    expect(blocks.server).toMatchObject({
      MOGATE_MINT_GATEWAY_VERSION: 'v2',
      MOGATE_V2_GATEWAY_ADDRESS: deployment.v2GatewayAddress,
      MOGATE_FUNDED_GIFTCARD_COLLECTION: deployment.fundedGiftcardCollection,
      MOGATE_PAYMENT_RECIPIENT: deployment.paymentRecipient
    });
  });

  it('renders shell exports for the selected target', () => {
    const output = renderEnvBlocks(buildEnvBlocks(deployment), {
      target: 'mobile',
      format: 'shell'
    });

    expect(output).toContain('# mobile');
    expect(output).toContain('networkProfiles.ts');
    expect(output).toContain(`v2Address: '${deployment.v2GatewayAddress}'`);
    expect(output).not.toContain('MOGATE_V2_GATEWAY_ADDRESS');
  });

  it('rejects missing deployment addresses', () => {
    expect(() =>
      normalizeDeployment({
        ...deployment,
        paymentRecipient: ''
      })
    ).toThrow(/paymentRecipient/);
  });
});
