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
      EXPO_PUBLIC_PARTICLE_PROJECT_ID: '',
      EXPO_PUBLIC_PARTICLE_CLIENT_KEY: '',
      EXPO_PUBLIC_PARTICLE_APP_ID: '',
      EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY: '',
      EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI: ''
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[BLOCKED] Particle project');
    expect(result.stdout).toContain('[BLOCKED] Signer project');
    expect(result.stdout).toContain('[OK] Gateway execution');
    expect(result.stdout).toContain('[OK] Particle UA chain');
    expect(result.stdout).toContain('[OK] USDC Primary Asset');
    expect(result.stdout).toContain('[OK] USDT Primary Asset');
    expect(result.stdout).toContain('[OK] UA funded gateway');
    expect(result.stdout).toContain('[OK] API base');
    expect(result.stdout).toContain('Product UA sends must stay disabled');
  });

  it('moves login and top-up gates to ready when provider credentials exist', () => {
    const result = runPreflight({
      EXPO_PUBLIC_PARTICLE_PROJECT_ID: '',
      EXPO_PUBLIC_PARTICLE_CLIENT_KEY: '',
      EXPO_PUBLIC_PARTICLE_APP_ID: '',
      EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY: 'magic-publishable',
      EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI: 'mogate-ua://magic-oauth',
      EXPO_API_BASE: 'http://localhost:4000'
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[BLOCKED] Particle project');
    expect(result.stdout).toContain('[OK] EIP-7702 signer');
    expect(result.stdout).toContain('[OK] Signer project');
    expect(result.stdout).toContain('[OK] API base');
    expect(result.stdout).toContain('[OK] Particle UA chain');
    expect(result.stdout).toContain('[OK] UA funded gateway');
  });

  it('ignores env attempts to switch the product signer stack', () => {
    const result = runPreflight({
      ['EXPO_PUBLIC_' + 'CURRENT_WALLET_STACK']: 'particle',
      EXPO_PUBLIC_PARTICLE_PROJECT_ID: '',
      EXPO_PUBLIC_PARTICLE_CLIENT_KEY: '',
      EXPO_PUBLIC_PARTICLE_APP_ID: '',
      EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY: 'magic-publishable',
      EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI: 'mogate-ua://magic-oauth',
      EXPO_API_BASE: 'http://localhost:4000'
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('[OK] EIP-7702 signer: magic is product-enabled');
    expect(result.stdout).not.toContain('Particle RN Auth is a probe');
  });

  it('passes Mainnet UA preflight when Particle and Magic are configured', () => {
    const result = runPreflight({
      EXPO_PUBLIC_PARTICLE_PROJECT_ID: 'particle-project',
      EXPO_PUBLIC_PARTICLE_CLIENT_KEY: 'particle-client',
      EXPO_PUBLIC_PARTICLE_APP_ID: 'particle-app',
      EXPO_PUBLIC_MAGIC_PUBLISHABLE_KEY: 'magic-publishable',
      EXPO_PUBLIC_MAGIC_GOOGLE_REDIRECT_URI: 'mogate-ua://magic-oauth',
      EXPO_API_BASE: 'http://localhost:4000'
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Preflight passed');
  });
});
