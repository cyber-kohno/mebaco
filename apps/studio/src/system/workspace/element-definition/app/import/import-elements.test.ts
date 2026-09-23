import { describe, expect, it } from 'vitest'
import type MebacoElement from '@system/model/element/element'
import type TreeNode from '@system/model/tree/tree-node'
import Imports from '@system/model/app/import/imports'
import ResourceImports from '@system/model/app/import/resource-imports'
import StorageImports from '@system/model/app/import/storage-imports'
import Transitions from '@system/model/app/import/transitions'
import ResourceImportCatalog from '@system/model/app/import/resource-import-catalog'
import ImportsElementDefinition from './imports-element-definition'
import ResourceImportsElementDefinition from './resource-imports-element-definition'
import TransitionsElementDefinition from './transitions-element-definition'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('Resource Imports', () => {
  it('creates editable manager children for Transitions, Resources, and Storage', () => {
    expect(ImportsElementDefinition.definition.createInitialChildren?.())
      .toEqual([
        { element: Transitions.create() },
        { element: ResourceImports.create() },
        { element: StorageImports.create() },
      ])
    expect(TransitionsElementDefinition.definition.treeLabel.type).toBe('component')
    expect(ResourceImportsElementDefinition.definition.treeLabel.type).toBe('component')
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
