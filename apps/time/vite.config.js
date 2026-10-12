import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { timetableApiPlugin } from './vite.timetable-api.js'

export default defineConfig({
  plugins: [react(), timetableApiPlugin()],
  base: '/time/',
  build: {
    outDir: '../../dist/time' // Builds to root/dist/time
  }
})