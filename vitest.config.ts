import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    alias: {
      'lib': path.resolve(__dirname, './src/lib'),
      '~nb-lib': path.resolve(__dirname, './src/notebook-app/lib'),
      'components': path.resolve(__dirname, './src/components')
    }
  }
})
