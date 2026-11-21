import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      BASE_URL: 'http://localhost:3000',
      JWT_SECRET: 'test-secret',
    },
  },
});