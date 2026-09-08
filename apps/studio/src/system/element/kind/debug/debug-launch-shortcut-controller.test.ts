import { beforeEach, describe, expect, it, vi } from 'vitest'
import type TreeNode from '../../../tree/tree-node'
import PreviewController from '../../../runtime/preview/preview-controller'
import ToastController from '../../../feedback/toast/toast-controller'
import DebugLaunchShortcutController from './debug-launch-shortcut-controller'

vi.mock('../../../runtime/preview/preview-controller', () => ({
  default: { openForSelectedNode: vi.fn(() => true) },
}))
vi.mock('../../../feedback/toast/toast-controller', () => ({
  default: { show: vi.fn() },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const createRoot = (withArgument: boolean, configured: boolean): TreeNode.Node => {
  const argument = node(5, {
    kind: 'launch-argument', propId: 'argument-uuid', id: 'name',
    valueType: { type: 'string' }, nullable: false,
  })
  const app = node(2, { kind: 'app', appId: 'app-uuid', id: 'sample' }, [
    node(3, { kind: 'launch-options' }, [
      node(4, { kind: 'launch-arguments' }, withArgument ? [argument] : []),
    ]),
  ])
  const launcher = node(6, {
    kind: 'launcher', launcherId: 'launcher-uuid', id: 'default',
    appId: 'app-uuid', argumentBindings: [],
  })
  const shortcuts = node(7, {
    kind: 'debug-launch-shortcuts',
    bindings: configured ? [{ appId: 'app-uuid', launcherId: 'launcher-uuid' }] : [],
  })
  return node(1, { kind: 'project' }, [app, launcher, shortcuts])
}

describe('DebugLaunchShortcutController', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts an App without arguments directly', () => {
    const root = createRoot(false, false)
    expect(DebugLaunchShortcutController.launch(root, 2)).toBe(true)
    expect(PreviewController.openForSelectedNode).toHaveBeenCalledWith(root, 2, undefined)
  })

  it('starts an App with its explicitly configured Launcher', () => {
    const root = createRoot(true, true)
    expect(DebugLaunchShortcutController.launch(root, 2)).toBe(true)
    expect(PreviewController.openForSelectedNode).toHaveBeenCalledWith(root, 2, 'launcher-uuid')
  })

  it('warns instead of starting when an App with arguments has no shortcut', () => {
    const root = createRoot(true, false)
    expect(DebugLaunchShortcutController.launch(root, 2)).toBe(false)
    expect(PreviewController.openForSelectedNode).not.toHaveBeenCalled()
    expect(ToastController.show).toHaveBeenCalledWith(
      expect.stringContaining('Debug > Launch Shortcuts'),
      { tone: 'warning' },
    )
  })
})
