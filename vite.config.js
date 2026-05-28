import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // מאפשר לנו לבדוק את זה גם במחשב בפיתוח
      },
      manifest: {
        name: 'הסופר שלי - קניות חכמות',
        short_name: 'הסופר שלי',
        description: 'אפליקציית ניהול קניות, מתכונים ותקציב',
        theme_color: '#4361ee',
        background_color: '#f8f9fc',
        display: 'standalone', // מעלים את שורת הדפדפן!
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