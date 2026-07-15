import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const preflightPath = resolve(__dirname, '../scripts/preflight.mjs');

function runPreflight(env: Record<string, string> = {}) {
  try {
    const stdout = execFileSync('node', [preflightPath], {
      cwd: resolve(__dirname, '..'),
      env: {
        PATH: process.env.PATH ?? '',
        ...env
      },
      encoding: 'utf8'
    });
    return {
      status: 0,
      stdout
    };
  } catch (error) {
    const maybe = error as { status?: number; stdout?: string };
    return {
      status: maybe.status ?? 1,
      stdout: maybe.stdout ?? ''
    };
  }
}

describe('mobile preflight', () => {
  it('fails closed when product configuration is missing', () => {
    const result = runPreflight({
      EXPO_PUBLIC_PRIVY_APP_ID: '',
      EXPO_PUBLIC_PRIVY_CLIENT_ID: ''
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[BLOCKED] Particle project');
    expect(result.stdout).toContain('[BLOCKED] Signer project');
    expect(result.stdout).toContain('[BLOCKED] Particle UA chain');
    expect(result.stdout).toContain('networkProfiles.ts');
    expect(result.stdout).toContain('[OK] API base');
    expect(result.stdout).toContain('Product UA sends must stay disabled');
  });

  it('moves login and top-up gates to ready when provider credentials exist', () => {
    const result = runPreflight({
      EXPO_PUBLIC_PRIVY_APP_ID: 'privy-app',
      EXPO_PUBLIC_PRIVY_CLIENT_ID: 'privy-client',
      EXPO_API_BASE: 'http://localhost:4000'
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[BLOCKED] Particle project');
    expect(result.stdout).toContain('[OK] EIP-7702 signer');
    expect(result.stdout).toContain('[OK] Signer project');
    expect(result.stdout).toContain('[OK] API base');
    expect(result.stdout).toContain('[BLOCKED] Particle UA chain');
    expect(result.stdout).toContain('[BLOCKED] v2 gateway');
  });

  it('ignores env attempts to switch the product signer stack', () => {
    const result = runPreflight({
      ['EXPO_PUBLIC_' + 'CURRENT_WALLET_STACK']: 'particle',
      EXPO_PUBLIC_PRIVY_APP_ID: 'privy-app',
      EXPO_PUBLIC_PRIVY_CLIENT_ID: 'privy-client',
      EXPO_API_BASE: 'http://localhost:4000'
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[OK] EIP-7702 signer: privy is product-enabled');
    expect(result.stdout).not.toContain('Particle RN Auth is a probe');
  });
});
