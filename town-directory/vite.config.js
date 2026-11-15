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
            '/dev/api.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
            '/simulate.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/dev/simulate.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
            '/dev/auth.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
            '/dev/upload_content.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
            '/dev/upload_portrait.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
            '/dev/upload_world_map.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
            '/auth.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/upload_portrait.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/upload_campaign_map.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/dev/upload_campaign_map.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
            '/upload_encounter_table.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/upload_town_map.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
            },
            '/dev/upload_town_map.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
            '/dev/upload_encounter_table.php': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/dev/, ''),
            },
        },
    },
});
