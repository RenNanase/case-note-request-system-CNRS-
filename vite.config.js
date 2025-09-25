import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
    base: '/CNRS/', // Base path for network server subdirectory
    plugins: [
        tailwindcss(), // Add Tailwind CSS plugin for v4
        laravel({
            input: [
                'resources/css/app.css',
                'resources/js/app.js',
                'frontend/src/main.tsx', // Add React app entry point
            ],
            refresh: true,
            buildDirectory: 'build',
        }),
        react(), // Add React plugin
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'frontend/src'),
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
        assetsDir: 'assets',
        manifest: true,
        outDir: 'public/build',
        rollupOptions: {
            output: {
                manualChunks: undefined,
                // Add timestamp for better cache busting
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
        minify: 'terser',
        sourcemap: false,
        cssCodeSplit: true,
        emptyOutDir: true,
    },
});
