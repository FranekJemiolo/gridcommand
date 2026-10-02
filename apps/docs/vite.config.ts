import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/gridcommand/' : './',
  plugins: [react()],
  server: {
    port: 5175,
    host: true,
  },
});
