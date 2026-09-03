import { describe, expect, it, vi } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import DebugLogElement from '../../element/kind/debug/debug-log-element'
import RuntimeLog from './runtime-log'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const createSink = () => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
})

describe('RuntimeLog', () => {
  it('uses the configured threshold and formats enabled metadata', () => {
    const sink = createSink()
    const root = node(1, { kind: 'project' }, [
      node(2, DebugLogElement.create()),
    ])
    const session = RuntimeLog.create(root, {
      sink,
      now: () => new Date(2026, 8, 4, 7, 8, 9, 12),
    })
    const log = session.forNode(42)
    const detail = { value: 3 }

    log.debug('hidden')
    log.info('loaded', detail)
    log.warn('careful')

    expect(sink.debug).not.toHaveBeenCalled()
    expect(sink.info).toHaveBeenCalledWith([
      '[2026-09-04] [07:08:09.012] [INFO] [node-42]',
      'loaded',
      detail,
    ])
    expect(sink.warn).toHaveBeenCalledWith([
      '[2026-09-04] [07:08:09.012] [WARN] [node-42]',
      'careful',
    ])
  })

  it('preserves the preview-start snapshot and omits disabled metadata', () => {
    const sink = createSink()
    const settings = DebugLogElement.create()
    settings.showLevel = false
    settings.showDate = false
    settings.showTime = false
    settings.showNodeId = false
    const root = node(1, { kind: 'project' }, [node(2, settings)])
    const session = RuntimeLog.create(root, { sink })

    settings.level = 'off'
    session.forNode(8).info('still visible')

    expect(session.settings.level).toBe('info')
    expect(sink.info).toHaveBeenCalledWith(['still visible'])
  })

  it('provides a no-output session for non-preview runtimes', () => {
    expect(() => {
      RuntimeLog.noOutputSession.forNode(5).error('not emitted')
    }).not.toThrow()
  })
})
