import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In dev, forward /api requests to the Flask backend so the
      // frontend can just call fetch('/api/...') regardless of env.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
