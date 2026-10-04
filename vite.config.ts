import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative production URLs keep the same build usable both below
  // /apps/runtime/ and at the root of runtime.red-it.org.
  base: './',
  plugins: [react()],
  build: { sourcemap: false },
  server: {
    proxy: { '/api': 'http://127.0.0.1:8080' },
  },
});
