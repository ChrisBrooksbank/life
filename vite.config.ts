import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    preact(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: "Conway's Game of Life",
        short_name: 'Life',
        description:
          "GPU-accelerated Conway's Game of Life with WebGL2 rendering, HashLife engine, drawing tools, time travel, and pattern library.",
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        categories: ['games', 'entertainment', 'education'],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
})
