import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'


export default defineConfig({
    base: '/CNRS/', // Add base path for network deployment
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve('./src'),
        },
    },

    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        open: false,
        hmr: {
            port: 5173,
        },
        cors: {
            origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://10.2.10.178'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            credentials: true
        }
    },
    build: {
        outDir: '../public/frontend',
        assetsDir: 'assets',
        manifest: true,
        rollupOptions: {
            output: {
                manualChunks: undefined,
                // Use timestamp for better cache busting
                assetFileNames: () => {
                    const timestamp = Date.now();
                    return `assets/[name]-[hash]-${timestamp}[extname]`;
                },
                chunkFileNames: () => {
                    const timestamp = Date.now();
                    return `assets/[name]-[hash]-${timestamp}.js`;
                },
                entryFileNames: () => {
                    const timestamp = Date.now();
                    return `assets/[name]-[hash]-${timestamp}.js`;
                },
            },
        },
        minify: 'esbuild',
        sourcemap: false,
        cssCodeSplit: true,
        emptyOutDir: true,
    },
});
