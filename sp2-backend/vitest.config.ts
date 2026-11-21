import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    env: {
      ...loadEnv('test', process.cwd(), ''),
      BASE_URL: 'http://localhost:3000',
      JWT_SECRET: 'test-secret',
    },
  },
});