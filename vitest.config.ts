import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'expo-constants': resolve(__dirname, 'test/mocks/expo-constants.ts')
    }
  },
  test: {
    environment: 'node',
    globals: false
  }
});
