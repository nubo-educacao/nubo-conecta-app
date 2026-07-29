import { defineConfig } from 'vitest/config';
import path from 'path';

// Config dedicada para rodar APENAS os reproducer tests (RCA).
// O CI/CD usa vitest.config.ts que exclui tests/reproducers/**.
// Para rodar: npx vitest run --config vitest.reproducers.config.ts
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    include: ['tests/reproducers/**/*.test.{ts,tsx}'],
  },
});
