import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// During local development the React dev server (default port 5173) proxies
// API/auth calls to the Express server (default port 4000) so cookies and
// fetches behave the same way they will in production, where Express serves
// the built frontend itself and everything is same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/login': 'http://localhost:4000',
      '/logout': 'http://localhost:4000',
      '/auth': 'http://localhost:4000',
      '/dashboard': 'http://localhost:4000',
    },
  },
  build: {
    outDir: 'dist',
  },
});
