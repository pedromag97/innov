import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'FibraCampo — Gestão de Trabalhos',
        short_name: 'FibraCampo',
        description: 'Gestão de trabalhos de campo de fibra ótica (FTTH)',
        lang: 'pt-PT',
        theme_color: '#1d4ed8',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Permite importar ../shared/states.js (fonte única de estados).
    fs: { allow: ['..'] },
    proxy: {
      // Em dev, encaminha /api para o backend Express.
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
});
