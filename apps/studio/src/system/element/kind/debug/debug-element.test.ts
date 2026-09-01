import { describe, expect, it, vi } from 'vitest'
import type TreeNodeType from '../../../tree/tree-node'
import TreeNode from '../../../tree/tree-node'
import DebugConfigurationElement from './debug-configuration-element'
import DebugConfigurationsElement from './debug-configurations-element'
import DebugResourceBindingsElement from './debug-resource-bindings-element'
import ElementMutationCoordinator from '../../mutation/element-mutation-coordinator'
import DirectoryResourceElement from '../resource/directory-resource-element'
import TextResourceElement from '../resource/text-resource-element'

vi.mock('../../../store/tree-store', () => ({
  default: {
    removeNode: vi.fn(),
  },
}))

describe('Debug element structure', () => {
  it('creates the fixed Debug hierarchy with one immutable Default', () => {
    const root = TreeNode.createRootNode()
    const debug = root.children.find((node) => node.element.kind === 'debug')
    const configurations = debug?.children[0]
    const defaultConfiguration = configurations?.children[0]
    const resourceBindings = defaultConfiguration?.children[0]

    expect(configurations?.element).toEqual({ kind: 'debug-configurations' })
    expect(defaultConfiguration?.element).toMatchObject({
      kind: 'debug-configuration',
      role: 'default',
    })
    expect(defaultConfiguration?.element).not.toHaveProperty('name')
    expect(resourceBindings?.element).toEqual({
      kind: 'debug-resource-bindings',
      bindings: [],
    })
  })

  it('keeps name exclusively on Custom configurations', () => {
    const defaultConfiguration = DebugConfigurationElement.createDefault('default-id')
    const customConfiguration = DebugConfigurationElement.createCustom('Local', 'local-id')

    expect(defaultConfiguration).toEqual({
      kind: 'debug-configuration',
      configurationId: 'default-id',
      role: 'default',
    })
    expect(customConfiguration).toEqual({
      kind: 'debug-configuration',
      configurationId: 'local-id',
      role: 'custom',
      name: 'Local',
    })
  })

  it('offers creation on Configurations but protects Default from editing and deletion', () => {
    const defaultNode: TreeNodeType.Node & {
      element: DebugConfigurationElement.DefaultElement
    } = {
      id: 3,
      element: DebugConfigurationElement.createDefault('default-id'),
      isOpen: true,
      children: [],
    }
    const customNode: TreeNodeType.Node & {
      element: DebugConfigurationElement.CustomElement
    } = {
      id: 4,
      element: DebugConfigurationElement.createCustom('Local', 'local-id'),
      isOpen: true,
      children: [],
    }
    const configurationsNode: TreeNodeType.Node & {
      element: DebugConfigurationsElement.Element
    } = {
      id: 2,
      element: DebugConfigurationsElement.create(),
      isOpen: true,
      children: [defaultNode, customNode],
    }
    const root: TreeNodeType.Node = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [configurationsNode],
    }

    expect(DebugConfigurationsElement.definition.getContextMenu({
      element: configurationsNode.element,
      node: configurationsNode,
      parentNode: root,
      rootNode: root,
    }).map((item) => item.label)).toEqual(['Add configuration'])
    expect(DebugConfigurationElement.definition.getContextMenu({
      element: defaultNode.element,
      node: defaultNode,
      parentNode: configurationsNode,
      rootNode: root,
    })).toEqual([])
    expect(DebugConfigurationElement.definition.getContextMenu({
      element: customNode.element,
      node: customNode,
      parentNode: configurationsNode,
      rootNode: root,
    }).map((item) => item.label)).toEqual(['Modify', 'Delete'])
    expect(DebugConfigurationElement.definition.reorderGroup).toBe('siblings')
  })

  it('adds Resource bindings to every newly created Configuration', () => {
    expect(DebugConfigurationElement.definition.createInitialChildren?.()).toEqual([
      {
        element: {
          kind: 'debug-resource-bindings',
          bindings: [],
        },
      },
    ])
  })

  it('adds an empty Binding to every Configuration when a Resource is added', () => {
    const existing = TextResourceElement.create('settings', 'settings-id')
    const added = DirectoryResourceElement.create('workspace', 'workspace-id')
    const firstBindings = {
      id: 6,
      element: DebugResourceBindingsElement.create([
        { resourceId: existing.resourceId, path: 'C:\\settings.json' },
      ]),
      isOpen: true,
      children: [],
    } satisfies TreeNodeType.Node
    const secondBindings = {
      id: 9,
      element: DebugResourceBindingsElement.create(),
      isOpen: true,
      children: [],
    } satisfies TreeNodeType.Node
    const addedNode = {
      id: 4,
      element: added,
      isOpen: true,
      children: [],
    } satisfies TreeNodeType.Node
    const root = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [
        {
          id: 2,
          element: { kind: 'resources' },
          isOpen: true,
          children: [
            { id: 3, element: existing, isOpen: true, children: [] },
            addedNode,
          ],
        },
        {
          id: 5,
          element: { kind: 'debug-configurations' },
          isOpen: true,
          children: [
            { id: 7, element: DebugConfigurationElement.createDefault(), isOpen: true, children: [firstBindings] },
            { id: 8, element: DebugConfigurationElement.createCustom('Local'), isOpen: true, children: [secondBindings] },
          ],
        },
      ],
    } satisfies TreeNodeType.Node

    ElementMutationCoordinator.afterAdd(root, addedNode)

    expect(firstBindings.element.bindings).toEqual([
      { resourceId: 'settings-id', path: 'C:\\settings.json' },
      { resourceId: 'workspace-id', path: '' },
    ])
    expect(secondBindings.element.bindings).toEqual([
      { resourceId: 'settings-id', path: '' },
      { resourceId: 'workspace-id', path: '' },
    ])
  })

  it('removes Bindings automatically when a Resource is deleted', () => {
    const resource = DirectoryResourceElement.create('workspace', 'workspace-id')
    const resourceNode = {
      id: 3,
      element: resource,
      isOpen: true,
      children: [],
    } satisfies TreeNodeType.Node
    const bindingsNode = {
      id: 5,
      element: DebugResourceBindingsElement.create([
        { resourceId: resource.resourceId, path: 'C:\\workspace' },
      ]),
      isOpen: true,
      children: [],
    } satisfies TreeNodeType.Node
    const root = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [
        { id: 2, element: { kind: 'resources' }, isOpen: true, children: [resourceNode] },
        { id: 4, element: { kind: 'debug-configurations' }, isOpen: true, children: [bindingsNode] },
      ],
    } satisfies TreeNodeType.Node

    ElementMutationCoordinator.beforeRemove(root, resourceNode)

    expect(bindingsNode.element.bindings).toEqual([])
  })

  it('normalizes editable paths by stable Resource id and definition order', () => {
    const resources: DebugResourceBindingsElement.Resource[] = [
      { resourceId: 'workspace-id', id: 'workspace', resourceKind: 'directory-resource' },
      { resourceId: 'settings-id', id: 'settings', resourceKind: 'text-resource' },
    ]
    const element = DebugResourceBindingsElement.create([
      { resourceId: 'settings-id', path: 'C:\\settings.json' },
      { resourceId: 'removed-id', path: 'C:\\removed.txt' },
    ])
    const schema = DebugResourceBindingsElement.createSchema(resources)

    expect(JSON.parse(schema.getInitialValues(element).bindings)).toEqual([
      { resourceId: 'workspace-id', path: '' },
      { resourceId: 'settings-id', path: 'C:\\settings.json' },
    ])
    expect(schema.update(element, {
      bindings: JSON.stringify([
        { resourceId: 'workspace-id', path: 'C:\\workspace' },
        { resourceId: 'settings-id', path: '' },
      ]),
    }).bindings).toEqual([
      { resourceId: 'workspace-id', path: 'C:\\workspace' },
      { resourceId: 'settings-id', path: '' },
    ])
  })
})
