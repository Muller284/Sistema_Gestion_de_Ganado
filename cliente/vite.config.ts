import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // HU-25: los archivos de idioma viven en idiomas/, en la raiz del
  // repositorio, porque los comparten el cliente y el servidor.
  server: { fs: { allow: ['..'] } },
  test: {
    environment: 'jsdom',
  },
})