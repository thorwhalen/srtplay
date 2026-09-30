// VITE_PUBLIC_BASE is injected by tw_platform's deploy (e.g. "/srtplay/"); "/" locally.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: process.env.VITE_PUBLIC_BASE ?? '/',
  plugins: [react()],
  test: { environment: 'node' },
});
