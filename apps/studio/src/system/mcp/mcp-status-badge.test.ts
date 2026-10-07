import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import { clearLanguagePreview, setLanguagePreview } from '@system/application/localization'
import McpSessionState from './mcp-session-state'
import McpEditSessionState from './mcp-edit-session-state'
import McpStatusBadge from './McpStatusBadge.svelte'

vi.mock('./mcp-edit-session-controller', () => ({ default: { release: vi.fn() } }))

describe('Unified MCP status badge', () => {
  beforeEach(() => {
    McpEditSessionState.reset()
    setLanguagePreview('ja')
    McpSessionState.set('available')
    McpSessionState.detailsStore.set({ sessionId: '12345678-test-session', endpoint: 'http://127.0.0.1:12345', pid: 1 })
  })
  afterEach(() => { McpEditSessionState.reset(); McpSessionState.detailsStore.set(null); McpSessionState.set('stopped'); clearLanguagePreview() })

  it('shows the normal non-interactive badge outside checkout', () => {
    const { body } = render(McpStatusBadge)
    expect(body).toContain('MCP 公開中')
    expect(body).toContain('12345678')
    expect(body).not.toContain('<button')
  })

  it('uses one amber editing badge that doubles as the release button', () => {
    McpEditSessionState.checkout('12345678-test-session', 0)
    const { body } = render(McpStatusBadge)
    expect(body.match(/class="mcp-status/g)).toHaveLength(1)
    expect(body).toContain('mcp-status editing')
    expect(body).toContain('エージェント編集中')
    expect(body).not.toContain('MCP 公開中')
    expect(body).toContain('<button')
    expect(body).toContain('このバッジをクリックすると')
    expect(body).toContain('編集セッションを解除')
  })

  it('keeps one recoverable badge visible after publication disappears', () => {
    McpEditSessionState.checkout('12345678-test-session', 0)
    McpSessionState.reset()
    const { body } = render(McpStatusBadge)
    expect(body.match(/class="mcp-status/g)).toHaveLength(1)
    expect(body).toContain('エージェント編集の復旧待ち')
    expect(body).toContain('<button')
    expect(body).toContain('12345678-test-session')
  })

  it('restores the normal badge on checkin and hides the badge when MCP stops', () => {
    const checkout = McpEditSessionState.checkout('12345678-test-session', 0)
    McpEditSessionState.checkin(checkout.sessionId, checkout.checkoutId, 0)
    const { body } = render(McpStatusBadge)
    expect(body).toContain('MCP 公開中')
    expect(body).not.toContain('mcp-status editing')
    McpSessionState.set('stopped')
    expect(render(McpStatusBadge).body).not.toContain('class="mcp-status')
  })
})
