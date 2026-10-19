import { afterEach, describe, expect, it, vi } from 'vitest'
import { render } from 'svelte/server'
import type TauriMcp from '@system/infra/tauri/mcp'
import {
  clearLanguagePreview,
  setLanguagePreview,
} from '@system/application/localization'
import { PRODUCT_INFO } from '@system/version'
import { createDiagnosticsPoller } from './mcp-diagnostics'
import McpDiagnosticsView from './McpDiagnosticsView.svelte'

const snapshot = (sessionId = 'first'): TauriMcp.Diagnostics => ({
  sessionId,
  identity: PRODUCT_INFO,
  accepted: 3,
  rejected: 2,
  history: [
    {
      code: 'MCP_BRIDGE_GENERATION_MISMATCH',
      studioGen: 1,
      peerGen: 2,
      count: 2,
      lastAtEpochMs: 1,
    },
  ],
})
afterEach(() => {
  vi.useRealTimers()
  clearLanguagePreview()
})
describe('MCP diagnostics', () => {
  it('polls after completion, discards stale results and stops on unmount', async () => {
    vi.useFakeTimers()
    let resolve!: (value: TauriMcp.Diagnostics) => void
    const read = vi.fn(
      () =>
        new Promise<TauriMcp.Diagnostics>((done) => {
          resolve = done
        }),
    )
    const publish = vi.fn()
    const poller = createDiagnosticsPoller(read, publish)
    poller.start('first')
    const oldResolve = resolve
    await vi.advanceTimersByTimeAsync(5000)
    expect(read).toHaveBeenCalledTimes(1)
    poller.start('second')
    oldResolve(snapshot('first'))
    await Promise.resolve()
    expect(publish).not.toHaveBeenCalledWith({
      snapshot: snapshot('first'),
      failed: false,
    })
    resolve(snapshot('second'))
    await Promise.resolve()
    expect(publish).toHaveBeenLastCalledWith({
      snapshot: snapshot('second'),
      failed: false,
    })
    poller.stop()
    await vi.advanceTimersByTimeAsync(3000)
    expect(read).toHaveBeenCalledTimes(2)
  })
  it('does not publish another session and recovers from failures', async () => {
    vi.useFakeTimers()
    const publish = vi.fn()
    const read = vi
      .fn()
      .mockResolvedValueOnce(snapshot('wrong'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(snapshot())
    const poller = createDiagnosticsPoller(read, publish)
    poller.start('first')
    await Promise.resolve()
    expect(publish).toHaveBeenLastCalledWith({ snapshot: null, failed: true })
    await vi.advanceTimersByTimeAsync(1000)
    expect(publish).toHaveBeenLastCalledWith({ snapshot: null, failed: true })
    await vi.advanceTimersByTimeAsync(1000)
    expect(publish).toHaveBeenLastCalledWith({
      snapshot: snapshot(),
      failed: false,
    })
    poller.stop()
  })
  it.each(['ja', 'en'] as const)(
    'shows both generations, grouped reason and restart guidance in %s',
    (language) => {
      setLanguagePreview(language)
      const { body } = render(McpDiagnosticsView, {
        props: { snapshot: snapshot(), failed: false },
      })
      expect(body).toContain('MCP_BRIDGE_GENERATION_MISMATCH')
      expect(body).toContain('Studio: 1')
      expect(body).toContain('2')
      expect(body).toContain(
        language === 'ja' ? 'MCPプロセスを再起動' : 'MCP process',
      )
      expect(body).toContain(
        language === 'ja' ? '事前確認による拒否' : 'preflight refusals',
      )
    },
  )
})
