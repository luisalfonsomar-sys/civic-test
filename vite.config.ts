import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Bind to all interfaces (not just localhost) so other devices on the same
    // network — a phone, for instance — can reach the dev server at this
    // machine's LAN IP, e.g. http://192.168.1.23:5173.
    host: true,
  },
})
