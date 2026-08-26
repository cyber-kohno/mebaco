import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import type TreeNode from '../../../../tree/tree-node'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ComponentReference from '../shared/component-reference'
import ComponentUseTreeLabel from './ComponentUseTreeLabel.svelte'
import ContentHost from '../../../content-host'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../../store/tree-store'
import type ValuePropElement from '../definition/value-prop-element'
import SlotContentElement from './slot/slot-content-element'
import SlotContentsElement from './slot/slot-contents-element'
import type SlotElement from '../definition/slot/slot-element'

namespace ComponentUseElement {
  export type Kind = 'component-use'

  export type Element = {
    kind: Kind
    componentId: string | null
    propBindings: ComponentReference.Binding[]
  }

  export const create = (): Element => ({
    kind: 'component-use',
    componentId: null,
    propBindings: [],
  })

  const syncSlots = (
    node: TreeNode.Node & { element: Element },
    rootNode: TreeNode.Node,
    createNode: (seed: TreeNode.Seed) => TreeNode.Node,
  ) => {
    const componentNode = node.element.componentId == null
      ? null
      : findComponentNode(rootNode, node.id, node.element.componentId)
    const slotsNode = componentNode?.children.find((child) => child.element.kind === 'slots')
    const slotNodes = (slotsNode?.children ?? [])
      .filter((child): child is TreeNode.Node & { element: SlotElement.Element } => child.element.kind === 'slot')
    const slotsFolderIndex = node.children.findIndex((child) => child.element.kind === 'slot-contents')
    if (slotNodes.length === 0) {
      if (slotsFolderIndex >= 0) node.children.splice(slotsFolderIndex, 1)
      return
    }
    const slotsFolder = slotsFolderIndex >= 0
      ? node.children[slotsFolderIndex]
      : createNode({ element: SlotContentsElement.create() })
    if (slotsFolderIndex < 0) node.children.push(slotsFolder)
    const existing = new Map(
      slotsFolder.children
        .filter((child) => child.element.kind === 'slot-content')
        .map((child) => [(child.element as SlotContentElement.Element).slotId, child]),
    )
    slotsFolder.children = slotNodes.map((slotNode) => {
      const contentNode = existing.get(slotNode.element.slotId)
        ?? createNode(SlotContentElement.createSeed(slotNode))
      // Slot props are definition metadata and are injected into the caller's
      // slot scope; they are not editable children of the caller tree.
      contentNode.children = contentNode.children.filter((child) => child.element.kind !== 'props')
      return contentNode
    })
  }

  export type CreateSchemaOptions = {
    components?: readonly ComponentReference.Option[]
  }

  const getProps = (
    componentNode: TreeNode.Node,
  ): ValuePropElement.Element[] => (
    componentNode.children
      .find((child) => child.element.kind === 'props')
      ?.children
      .map((child) => child.element)
      .filter((element): element is ValuePropElement.Element => element.kind === 'value-prop')
    ?? []
  )

  const createOption = (
    componentNode: TreeNode.Node,
    detail?: string,
  ): ComponentReference.Option | null => {
    if (componentNode.element.kind !== 'component') return null
    return {
      componentId: componentNode.element.componentId,
      label: componentNode.element.id,
      detail,
      props: getProps(componentNode),
    }
  }

  const collectComponents = (
    node: TreeNode.Node,
    accept: (node: TreeNode.Node) => boolean,
  ): TreeNode.Node[] => {
    const nodes = accept(node) ? [node] : []
    node.children.forEach((child) => nodes.push(...collectComponents(child, accept)))
    return nodes
  }

  const findPath = (
    node: TreeNode.Node,
    nodeId: number,
    path: TreeNode.Node[] = [],
  ): TreeNode.Node[] | null => {
    const nextPath = [...path, node]
    if (node.id === nodeId) return nextPath

    for (const child of node.children) {
      const found = findPath(child, nodeId, nextPath)
      if (found != null) return found
    }
    return null
  }

  const findOwnerApp = (
    node: TreeNode.Node,
    targetNodeId: number,
    ownerAppNode: TreeNode.Node | null = null,
  ): TreeNode.Node | null => {
    const nextOwnerAppNode = node.element.kind === 'app' ? node : ownerAppNode
    if (node.id === targetNodeId) return nextOwnerAppNode

    for (const child of node.children) {
      const found = findOwnerApp(child, targetNodeId, nextOwnerAppNode)
      if (found != null) return found
    }
    return null
  }

  const findCommon = (
    node: TreeNode.Node,
  ): TreeNode.Node | null => {
    if (node.element.kind === 'common') return node
    for (const child of node.children) {
      const found = findCommon(child)
      if (found != null) return found
    }
    return null
  }

  const addLocalComponentsFromChildren = (
    children: readonly TreeNode.Node[],
    options: ComponentReference.Option[],
  ) => {
    children.forEach((child) => {
      if (child.element.kind !== 'component' || child.element.local !== true) return
      const option = createOption(child, 'Local')
      if (option != null) options.push(option)
    })
  }

  const collectVisibleLocalOptions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ComponentReference.Option[] => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const options: ComponentReference.Option[] = []

    path.forEach((node, index) => {
      const nextNode = path[index + 1]
      const retentionNode = ContentHost.getRetentionNode(node)
      const elementsNode = ContentHost.getElementsNode(node)
      if (retentionNode != null && nextNode === elementsNode) {
        addLocalComponentsFromChildren(retentionNode.children, options)
      }
      if (node.element.kind === 'retention' && nextNode != null) {
        const childIndex = node.children.indexOf(nextNode)
        addLocalComponentsFromChildren(node.children.slice(0, childIndex), options)
      }
    })

    return options.reverse()
  }

  const collectGlobalOptions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ComponentReference.Option[] => {
    const roots = [
      findCommon(rootNode),
      findOwnerApp(rootNode, targetNodeId),
    ].filter((node): node is TreeNode.Node => node != null)

    return roots.flatMap((root) => (
      collectComponents(root, (node) => (
        node.element.kind === 'component' && node.element.local !== true
      ))
        .map((node) => createOption(node))
        .filter((option): option is ComponentReference.Option => option != null)
    ))
  }

  const dedupeOptions = (
    options: readonly ComponentReference.Option[],
  ): ComponentReference.Option[] => {
    const seen = new Set<string>()
    return options.filter((option) => {
      if (seen.has(option.componentId)) return false
      seen.add(option.componentId)
      return true
    })
  }

  export const getComponents = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ComponentReference.Option[] => (
    dedupeOptions([
      ...collectVisibleLocalOptions(rootNode, targetNodeId),
      ...collectGlobalOptions(rootNode, targetNodeId),
    ])
  )

  export const findComponentNode = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    componentId: string,
  ): TreeNode.Node | null => {
    const visibleIds = new Set(getComponents(rootNode, targetNodeId)
      .map((option) => option.componentId))
    if (!visibleIds.has(componentId)) return null

    const path = findPath(rootNode, targetNodeId) ?? []
    const localNodes: TreeNode.Node[] = []
    path.forEach((node, index) => {
      const nextNode = path[index + 1]
      const retentionNode = ContentHost.getRetentionNode(node)
      const elementsNode = ContentHost.getElementsNode(node)
      if (retentionNode != null && nextNode === elementsNode) {
        localNodes.push(...retentionNode.children)
      }
      if (node.element.kind === 'retention' && nextNode != null) {
        const childIndex = node.children.indexOf(nextNode)
        localNodes.push(...node.children.slice(0, childIndex))
      }
    })

    const local = localNodes.reverse().find((node) => (
      node.element.kind === 'component'
      && node.element.local === true
      && node.element.componentId === componentId
    ))
    if (local != null) return local

    const roots = [
      findCommon(rootNode),
      findOwnerApp(rootNode, targetNodeId),
    ].filter((node): node is TreeNode.Node => node != null)

    return roots
      .flatMap((root) => collectComponents(root, (node) => (
        node.element.kind === 'component'
        && node.element.local !== true
        && node.element.componentId === componentId
      )))
      [0] ?? null
  }

  const parseBindings = (
    values: Readonly<Record<string, string>>,
    components: readonly ComponentReference.Option[] = [],
  ): ComponentReference.Binding[] => {
    const component = components.find(
      (candidate) => candidate.componentId === values.componentId,
    )
    return ComponentReference.normalizeBindings(
      ComponentReference.parseBindings(values.propBindings) ?? [],
      component,
    )
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Component View',
    updateTitle: 'Update Component View',
    fields: [
      {
        type: 'select',
        key: 'componentId',
        label: 'Component',
        width: 'id',
        defaultValue: '',
        clearWhenChanged: ['propBindings'],
        options: (options.components ?? []).map((component) => ({
          value: component.componentId,
          label: component.label,
          detail: component.detail,
        })),
      },
      {
        type: 'componentBindings',
        key: 'propBindings',
        label: 'Props',
        defaultValue: '[]',
        required: true,
        componentIdKey: 'componentId',
        components: options.components ?? [],
      },
    ],
    createPreview: create,
    getInitialValues: (element) => ({
      componentId: element.componentId ?? '',
      propBindings: ComponentReference.stringifyBindings(element.propBindings ?? []),
    }),
    create: (values) => ({
      kind: 'component-use',
      componentId: values.componentId.length === 0 ? null : values.componentId,
      propBindings: parseBindings(values, options.components),
    }),
    update: (element, values) => ({
      ...element,
      componentId: values.componentId.length === 0 ? null : values.componentId,
      propBindings: parseBindings(values, options.components),
    }),
  })

  export const definition = {
    kind: 'component-use',
    treeLabel: {
      type: 'component',
      Component: ComponentUseTreeLabel,
    },
    syncChildren: syncSlots,
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        action('Refresh slots', () => TreeStore.updateElement(context.node.id, context.element)),
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({
              components: getComponents(context.rootNode, context.node.id),
            }),
          )
        }),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default ComponentUseElement
