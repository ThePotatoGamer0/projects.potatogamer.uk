import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/time/',
  build: {
    outDir: '../../dist/time' // Builds to root/dist/time
  }
})