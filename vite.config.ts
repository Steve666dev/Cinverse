/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/tmdb-img': {
        target: 'https://image.tmdb.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tmdb-img/, ''),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.js', 'tests/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/.gemini/**', '**/security-audit-skill/**'],
    testTimeout: 60000,
  },
})
