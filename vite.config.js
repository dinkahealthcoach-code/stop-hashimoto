import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-180.png'],
      manifest: {
        name: 'Proyecto Stop Hashimoto',
        short_name: 'Stop Hashimoto',
        description: 'Tu acompañante diario para el Método ERI: recetas, seguimiento y protocolo personalizado.',
        start_url: '/',
        display: 'standalone',
        background_color: '#2F6B63',
        theme_color: '#2F6B63',
        orientation: 'portrait',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
})
