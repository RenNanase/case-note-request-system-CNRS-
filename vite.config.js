import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';

export default defineConfig({
    base: '/CNRS/', // Base path for network server subdirectory
    plugins: [
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
            ],
            refresh: true,
        }),
    ],
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
        assetsDir: 'build',
        manifest: true,
        outDir: 'public/build',
        rollupOptions: {
            output: {
                manualChunks: undefined,
                assetFileNames: 'build/[name]-[hash][extname]',
                chunkFileNames: 'build/[name]-[hash].js',
                entryFileNames: 'build/[name]-[hash].js',
            },
        },
        minify: 'terser',
        sourcemap: false,
        cssCodeSplit: true,
        emptyOutDir: true,
    },
});
