import { mount } from 'svelte'
import Fixture from './Fixture.svelte'
import { setFixture } from './transport'
import McpSessionState from '../../src/system/mcp/mcp-session-state'
mount(Fixture, { target: document.getElementById('app')! })
Object.assign(window, {
  diagnosticsHarness: {
    setFixture,
    stop: () => {
      McpSessionState.detailsStore.set(null)
      McpSessionState.set('stopped')
    },
  },
})
