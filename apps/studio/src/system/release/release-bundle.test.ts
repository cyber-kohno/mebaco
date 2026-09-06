import { describe, expect, it } from 'vitest'
import type TreeNode from '../tree/tree-node'
import ReleaseBundle from './release-bundle'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const appNode = (
  nodeId: number,
  id: string,
  appId: string,
  componentId: string,
  transitionIds: string[],
  resourceIds: string[],
): TreeNode.Node => node(nodeId, { kind: 'app', id, appId }, [
  node(nodeId + 1, { kind: 'entry', componentId, propBindings: [] }),
  node(nodeId + 2, { kind: 'imports' }, [
    node(nodeId + 3, { kind: 'transitions', appIds: transitionIds }),
    node(nodeId + 4, { kind: 'resource-imports', resourceIds }),
  ]),
  node(nodeId + 5, { kind: 'declares' }, [
    node(nodeId + 6, { kind: 'components' }, [
      node(nodeId + 7, { kind: 'component', id: `${id}Main`, componentId }),
    ]),
  ]),
])

describe('Release Bundle dependency analysis', () => {
  it('collects transitive Apps and their imported Resources', () => {
    const launcher: TreeNode.Node['element'] = {
      kind: 'launcher', launcherId: 'launcher-uuid', argumentBindings: [],
      id: 'production',
      appId: 'app-a',
    }
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'launchers' }, [node(3, launcher)]),
      node(10, { kind: 'apps' }, [
        appNode(20, 'app-a', 'app-a', 'component-a', ['app-b'], ['resource-a']),
        appNode(40, 'app-b', 'app-b', 'component-b', [], ['resource-b']),
      ]),
      node(60, { kind: 'common' }, [
        node(61, { kind: 'resources' }, [
          node(62, { kind: 'text-resource', id: 'input', resourceId: 'resource-a', access: 'read' }),
          node(63, { kind: 'sqlite-resource', id: 'database', resourceId: 'resource-b', access: 'read', create: false }),
        ]),
      ]),
    ])

    const result = ReleaseBundle.analyze(root, ['launcher-uuid'])

    expect(result.errors).toEqual([])
    expect(result.launchers.map((item) => item.element.id)).toEqual(['production'])
    expect(result.apps.map((item) => item.element.id)).toEqual(['app-a', 'app-b'])
    expect(result.resources.map((item) => item.element.id)).toEqual(['input', 'database'])
  })

  it('reports empty Bundles and broken references', () => {
    const empty = ReleaseBundle.analyze(node(1, { kind: 'project' }), [])
    expect(empty.errors).toEqual(['Bundle must contain at least one Launcher.'])

    const broken = ReleaseBundle.analyze(node(1, { kind: 'project' }), ['missing'])
    expect(broken.errors).toContain('Bundle references a missing Launcher (missing).')
  })

  it('rejects runtime-only Component failures before release', () => {
    const app = appNode(20, 'app-a', 'app-a', 'component-a', [], [])
    const component = app.children[2].children[0].children[0]
    component.children.push(node(30, { kind: 'elements' }, [
      node(31, { kind: 'component-use', componentId: 'component-a', propBindings: [] }),
    ]))
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'launchers' }, [node(3, {
        kind: 'launcher', launcherId: 'launcher-uuid', id: 'production',
        appId: 'app-a', argumentBindings: [],
      })]),
      node(10, { kind: 'apps' }, [app]),
    ])

    expect(ReleaseBundle.analyze(root, ['launcher-uuid']).errors)
      .toContain('Component cycle: app-aMain -> app-aMain.')
  })
})
