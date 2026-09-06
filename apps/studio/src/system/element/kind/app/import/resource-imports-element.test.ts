import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../../element'
import type TreeNode from '../../../../tree/tree-node'
import ImportsElement from './imports-element'
import ResourceImportCatalog from './resource-import-catalog'
import ResourceImportsElement from './resource-imports-element'
import TransitionsElement from './transitions-element'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('Resource Imports', () => {
  it('creates editable manager children for Transitions and Resources', () => {
    expect(ImportsElement.definition.createInitialChildren?.())
      .toEqual([
        { element: TransitionsElement.create() },
        { element: ResourceImportsElement.create() },
      ])
    expect(TransitionsElement.definition.treeLabel).toMatchObject({ tone: 'manager' })
    expect(ResourceImportsElement.definition.treeLabel).toMatchObject({ tone: 'manager' })
  })

  it('resolves selected stable Resource ids for an App', () => {
    const selected = node(4, {
      kind: 'text-resource', resourceId: 'selected-id', id: 'selected', access: 'read',
    })
    const hidden = node(5, {
      kind: 'text-resource', resourceId: 'hidden-id', id: 'hidden', access: 'read',
    })
    const app = node(7, { kind: 'app', appId: 'app-id', id: 'app' }, [
      node(8, { kind: 'imports' }, [
        node(9, { kind: 'resource-imports', resourceIds: ['selected-id'] }),
      ]),
    ])
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'common' }, [node(3, { kind: 'resources' }, [selected, hidden])]),
      node(6, { kind: 'apps' }, [app]),
    ])

    expect(ResourceImportCatalog.getImportedResources(root, app).map((entry) => entry.element.id))
      .toEqual(['selected'])
  })
})
