import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// photos is replaced with the app's slug by `pnpm new-app` at scaffold time.
export default defineConfig({
  base: '/photos/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5175,
    strictPort: true, // Fail if port is busy instead of incrementing
    proxy: {
      '/photos/api': {
        target: 'http://localhost:8789',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying for /api/ws
      },
    },
  },
})
