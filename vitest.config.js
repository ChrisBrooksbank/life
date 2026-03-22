import { defineConfig } from 'vitest/config';
import preact from '@preact/preset-vite';
export default defineConfig({
    plugins: [preact()],
    resolve: {
        alias: {
            react: 'preact/compat',
            'react-dom': 'preact/compat',
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        exclude: ['e2e/**', 'node_modules/**'],
    },
});
