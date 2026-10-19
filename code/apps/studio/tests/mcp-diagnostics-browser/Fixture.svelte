<script lang="ts">
  import McpDiagnostics from '../../src/system/mcp/McpDiagnostics.svelte'
  import McpSessionState from '../../src/system/mcp/mcp-session-state'
  import { setLanguagePreview } from '../../src/system/application/localization'
  setLanguagePreview('ja')
  McpSessionState.detailsStore.set({
    sessionId: '11111111-1111-4111-8111-111111111111',
    endpoint: 'http://127.0.0.1:1',
    pid: 1,
  })
  McpSessionState.set('available')
</script>

<header><span>Mebaco · MCP 公開中</span><McpDiagnostics /></header>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #e8f7f8;
    font-family: sans-serif;
  }
</style>
