import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the same build works on GitHub Pages (/summit-home/) and locally.
export default defineConfig({
  base: './',
  plugins: [react()],
})
