import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages: https://quantic001.github.io/coachpro-2.0/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? '/coachpro-2.0/',
})
