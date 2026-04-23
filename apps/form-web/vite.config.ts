import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/admin': 'http://localhost:5174',
      '/public': 'http://localhost:5174',
      '/health': 'http://localhost:5174',
    },
  },
})