import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Fuel Tracker',
        short_name: 'Fuel Tracker',
        description: 'A daily food journal for the Medi-Weightloss way of eating: lean protein by the ounce, counted carbs, ketones and weight.',
        theme_color: '#c2410c',
        background_color: '#fbf7f1',
        display: 'standalone',
        icons: [
          { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          { src: 'icon-1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
})
