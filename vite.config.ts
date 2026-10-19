/// <reference types="vitest/config" />
import { renameSync, readFileSync } from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'
import pkg from './package.json' with { type: 'json' }

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/BowelApp/"). Defaults to "/".
const base = process.env.BASE_PATH || '/'

/**
 * `--mode single` builds one self-contained dist-single/gut-tracker.html that runs when
 * opened straight from disk (file://): no service worker, no external files.
 */
function singleFileHtml(): Plugin {
  const icon = `data:image/svg+xml;base64,${readFileSync('public/icon.svg').toString('base64')}`
  return {
    name: 'gut-tracker-single-file',
    transformIndexHtml: (html) =>
      html
        .replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="${icon}" type="image/svg+xml" />`)
        .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, ''),
    closeBundle: () => renameSync('dist-single/index.html', 'dist-single/gut-tracker.html'),
  }
}

export default defineConfig(({ mode }) => {
  const single = mode === 'single'
  return {
    base: single ? './' : base,
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    publicDir: single ? false : 'public',
    resolve: single ? { alias: { 'virtual:pwa-register': '/src/lib/pwaRegisterStub.ts' } } : undefined,
    build: single ? { outDir: 'dist-single', chunkSizeWarningLimit: 2000 } : undefined,
    plugins: [
      react(),
      tailwindcss(),
      single
        ? [viteSingleFile(), singleFileHtml()]
        : VitePWA({
            registerType: 'prompt',
            injectRegister: false,
            includeAssets: ['icon.svg', 'apple-touch-icon.png'],
            manifest: {
              name: 'Gut Tracker',
              short_name: 'Gut Tracker',
              description: 'Personal offline tracker for GI symptoms, triggers, trials and labs.',
              theme_color: '#0f766e',
              background_color: '#0b1120',
              display: 'standalone',
              orientation: 'portrait',
              start_url: base,
              scope: base,
              icons: [
                { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
                { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
                { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
              ],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
              navigateFallback: 'index.html',
              cleanupOutdatedCaches: true,
            },
          }),
    ],
    test: {
      environment: 'node',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})
