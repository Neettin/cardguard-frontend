import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import sitemap from 'vite-plugin-sitemap'

export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: 'https://cardguard.vercel.app',  // Vercel URL
      routes: ['/', '/predict', '/batch', '/dashboard'],
    }),
  ],
})