import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'הרשימה של הבית',
        short_name: 'קניות', /* השם הקצר שיופיע מתחת לאייקון בטלפון */
        description: 'אפליקציה חכמה לניהול קניות הבית',
        theme_color: '#4CAF50', /* הצבע הירוק של הכפתורים שלנו */
        background_color: '#ffffff',
        display: 'standalone', /* זה מה שמעלים את שורת הדפדפן! */
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})