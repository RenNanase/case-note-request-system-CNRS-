import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


export default defineConfig({
    base: '/CNRS/build/', // Base path for network server subdirectory
    plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
    },
  },

    server: {
        host: '0.0.0.0',
        port: 5174,
        strictPort: true,
        hmr: {
            host: '10.2.10.178',
            protocol: 'ws',
            port: 5174,
        },
        cors: {
            origin: ['http://10.2.10.178', 'http://10.2.10.178:5174'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
            credentials: true
        }
    },
    build: {
        outDir: '../public/build',
        assetsDir: 'assets',
        manifest: true,
        rollupOptions: {
            output: {
                manualChunks: undefined,
                assetFileNames: 'assets/[name]-[hash][extname]',
                chunkFileNames: 'assets/[name]-[hash].js',
                entryFileNames: 'assets/[name]-[hash].js',
            },
        },
        minify: 'esbuild',
        sourcemap: false,
        cssCodeSplit: true,
        emptyOutDir: true,
    },
});
