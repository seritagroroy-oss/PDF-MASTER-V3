import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  return {
    base: '/',
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          // Do not cache the PDF worker - always fetch fresh from server
          runtimeCaching: [
            {
              urlPattern: /pdf\.worker/,
              handler: 'NetworkOnly',
            },
          ],
        },
        manifest: {
          name: 'PDF Master - ROY INDUSTRIE',
          short_name: 'PDFMaster',
          description: 'Une plateforme moderne et professionnelle pour fusionner, modifier et gerer vos fichiers PDF.',
          theme_color: '#020617',
          background_color: '#020617',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icons/icon-192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            {
              src: '/icons/icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            if (id.includes('react') || id.includes('scheduler')) {
              return 'react-vendor';
            }

            if (id.includes('tesseract.js')) {
              return 'ocr-vendor';
            }

            if (id.includes('pdf-lib') || id.includes('pdfjs-dist') || id.includes('jszip')) {
              return 'pdf-vendor';
            }

            if (id.includes('motion') || id.includes('lucide-react')) {
              return 'ui-vendor';
            }

            return 'vendor';
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify; file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
