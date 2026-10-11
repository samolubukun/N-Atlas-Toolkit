import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: path.resolve(__dirname, '..'),
  envPrefix: ['VITE_', 'NATLAS_'],
})

