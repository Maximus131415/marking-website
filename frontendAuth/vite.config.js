import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 8080,
    allowedHosts: [
      'marking-website-production.up.railway.app',
      '.up.railway.app'
    ],
    watch: {
      usePolling: true
    }
  }
})
