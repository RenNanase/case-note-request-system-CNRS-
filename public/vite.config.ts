import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/crns/public/frontend/', // Correct base path for Laravel subdirectory
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    outDir: 'dist',
  },
  server: {
    host: '0.0.0.0', // Bind to all interfaces for network access
    port: 3000,
  },
})
