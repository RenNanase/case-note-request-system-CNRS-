import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: '0.0.0.0', // Bind to all interfaces for network access
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // Laravel backend
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
