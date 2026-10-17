import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // The front desk PC is on old Windows, stuck on Chrome 109.
  build: { target: ['chrome109', 'edge109', 'firefox115', 'safari15'] },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeManifestIcons: false, // already matched by globPatterns
      manifest: {
        name: 'CourageD POS',
        short_name: 'CourageD',
        start_url: '/',
        display: 'standalone',
        background_color: '#19171B',
        theme_color: '#19171B',
        icons: [
          { src: '/assets/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/assets/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell only. No runtimeCaching, so cross-origin calls (Supabase REST,
        // auth, realtime) are never intercepted and always go to the network.
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
