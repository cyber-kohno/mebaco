import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { studioMcpIdentityPlugin } from '../../release/studio-mcp.mjs'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [studioMcpIdentityPlugin(), svelte()],
  resolve: {
    alias: {
      '@system': fileURLToPath(new URL('./src/system', import.meta.url)),
    },
  },
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 1420,
    strictPort: true,
  },
})
