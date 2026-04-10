import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Позволяет запускать в Docker/Railway без конфликтов сети
    port: 3000,
    strictPort: true
  }
})