import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // jsdom definido per-file via // @vitest-environment jsdom
    // Arquivos de lógica pura (redirectService, types) rodam em node (padrão)
    globals: true,
  },
});
