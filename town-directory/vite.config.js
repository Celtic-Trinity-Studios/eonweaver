import { defineConfig } from 'vite';

export default defineConfig({
    root: './src',
    base: '/dev/',
    publicDir: '../public',
    build: {
        outDir: '../dev',
        emptyOutDir: false, // Don't wipe dev/ — it has the PHP proxy files
    },
    server: {
        port: 5173,
        open: true,
        // Proxy PHP API calls to a local PHP dev server (e.g. php -S localhost:8080)
        proxy: {
            '/api.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/simulate.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/auth.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/upload_portrait.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
        },
    },
});
