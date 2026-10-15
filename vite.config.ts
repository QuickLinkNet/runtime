import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative production URLs keep the same build usable below a directory
  // or at the root of a dedicated host.
  base: './',
  plugins: [react()],
  build: { sourcemap: false },
  server: {
    proxy: { '/api': 'http://127.0.0.1:8080' },
  },
});
