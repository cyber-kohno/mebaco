import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import TransitionNamespace from './transition-namespace'

const node = (
  id: number,
  element: unknown,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children,
})

describe('TransitionNamespace', () => {
  it('creates camelCase accessors for peer Apps and requests by UUID', () => {
    const request = vi.fn()
    const project = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'main-uuid', id: 'main-app' }),
      node(3, { kind: 'app', appId: 'target-uuid', id: 'user-settings' }),
    ])

    const namespace = TransitionNamespace.create(project, request)
    namespace.userSettings?.({ tab: 'profile' })

    expect(Object.keys(namespace)).toEqual(['mainApp', 'userSettings'])
    expect(request).toHaveBeenCalledWith('target-uuid', { tab: 'profile' })
  })

  it('uses an empty launch value object when the argument is omitted', () => {
    const request = vi.fn()
    const project = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'main-uuid', id: 'main' }),
      node(3, { kind: 'app', appId: 'target-uuid', id: 'target' }),
    ])

    TransitionNamespace.create(project, request).target?.()

    expect(request).toHaveBeenCalledWith('target-uuid', {})
  })
})
