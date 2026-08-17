import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'
import obfuscatorPlugin from 'vite-plugin-javascript-obfuscator'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['@nut-tree-fork/nut-js', 'bufferutil', 'utf-8-validate'],
            },
          },
        },
      },
      preload: {
        input: 'electron/preload.ts',
      },
      renderer: {},
    }),
  ],
  server: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: false,
    watch: {
      ignored: ['**/public/**']
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
    strictPort: false,
  }
})
