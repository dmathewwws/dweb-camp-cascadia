import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// people is replaced with the app's slug by `pnpm new-app` at scaffold time.
export default defineConfig({
  base: '/people/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true, // Fail if port is busy instead of incrementing
    proxy: {
      '/people/api': {
        target: 'http://localhost:8788',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for /api/ws
      },
    },
  },
})
