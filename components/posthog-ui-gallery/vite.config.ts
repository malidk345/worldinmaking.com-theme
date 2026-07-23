// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      lib: path.resolve(__dirname, '../src/lib'),
      scenes: path.resolve(__dirname, '../src/scenes'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Allow base.scss to resolve its relative @imports (vars, mixins, etc.)
        // and react-toastify's absolute node_modules path
        loadPaths: [
          path.resolve(__dirname, '../src/styles'),
          path.resolve(__dirname, '../src'),
          path.resolve(__dirname, '..'),
          path.resolve(__dirname, '../node_modules'),
        ],
        quietDeps: true,
        silenceDeprecations: ['legacy-js-api', 'import'],
      },
    },
  },
  server: {
    port: 5174,
  },
})
