import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { studioMcpIdentityPlugin } from '../../release/studio-mcp.mjs'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [studioMcpIdentityPlugin(), svelte()],
  resolve: {
    alias: {
      '@system': fileURLToPath(new URL('./src/system', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
  },
})
