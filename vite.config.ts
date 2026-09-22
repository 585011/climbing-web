import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    tanstackRouter({
      routesDirectory: './src/app/routes',
      // Keep co-located *.test.tsx files out of the generated route tree.
      routeFileIgnorePattern: '\\.test\\.',
      // Split each route's component into its own lazily loaded chunk. This also
      // keeps route components out of the route file's exports, so Fast Refresh
      // hot-swaps them instead of full-reloading the page. Off under Vitest: the
      // route tests import route files and render `component` directly.
      autoCodeSplitting: !process.env.VITEST,
    }),
    react(),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/testing/setup.ts',
  },
})