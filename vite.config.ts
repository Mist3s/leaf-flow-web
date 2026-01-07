import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // SPA fallback — все пути ведут на index.html
  appType: 'spa',
});
