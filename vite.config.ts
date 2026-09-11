import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [
        react(),
        tsconfigPaths(),
        {
            name: 'fix-electrobun-paths',
            enforce: 'post',
            apply: 'build',
            transformIndexHtml(html) {
                // This looks for src="../projectsview/projectsview.js"
                // and changes it to src="projectsview.js"
                return html.replace(/\.\.\/[^/]+\//g, './');
            },
        },
    ],
    root: 'src',
    base: './',
    build: {
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                mainview: resolve(__dirname, 'src/mainview/index.html'),
            },
            output: {
                // Force the JS to be inside the view folder
                entryFileNames: '[name]/[name].js',
                assetFileNames: (assetInfo) => {
                    const name = assetInfo.name ?? '';
                    // Keep fonts + icons inside the view folder so electrobun
                    // (which only packages dist/mainview) includes them
                    if (/\.(ttf|otf|woff2?|eot)$/i.test(name)) {
                        return `mainview/assets/fonts/${name}`;
                    }
                    if (/\.(ico|png|svg|jpg|jpeg|webp|gif)$/i.test(name)) {
                        return `mainview/${name}`;
                    }
                    return '[name]/[name].[ext]';
                },

                // CRITICAL: Disable code splitting
                // This forces 'client-Xk-RIFYY.js' content INTO projectsview.js
                manualChunks: undefined,
                inlineDynamicImports: false,

                // This helper ensures that shared dependencies don't
                // create a separate 'chunks' folder
                chunkFileNames: '[name]/[name].js',
            },
        },
    },
});
