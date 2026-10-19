import ComponentReference from '@system/model/component/component-reference'
import type Slot from '@system/model/component/slot'
import SlotContent from '@system/model/component/slot-content'
import SlotContents from '@system/model/component/slot-contents'
import type ValueProp from '@system/model/component/value-prop'
import ContentHost from '@system/model/element/content-host'
import type TreeNode from '@system/model/tree/tree-node'

namespace ComponentUse {
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

  export const syncSlots = (
    node: TreeNode.Node & { element: Element },
    rootNode: TreeNode.Node,
    createNode: (seed: TreeNode.Seed) => TreeNode.Node,
  ) => {
    const componentNode = node.element.componentId == null
      ? null
      : findComponentNode(rootNode, node.id, node.element.componentId)
    const slotsNode = componentNode?.children.find(
      (child) => child.element.kind === 'slots',
    )
    const slotNodes = (slotsNode?.children ?? [])
      .filter((child): child is TreeNode.Node & { element: Slot.Element } => (
        child.element.kind === 'slot'
      ))
    const slotsFolderIndex = node.children.findIndex(
      (child) => child.element.kind === 'slot-contents',
    )
    if (slotNodes.length === 0) {
      if (slotsFolderIndex >= 0) node.children.splice(slotsFolderIndex, 1)
      return
    }
    const slotsFolder = slotsFolderIndex >= 0
      ? node.children[slotsFolderIndex]
      : createNode({ element: SlotContents.create() })
    if (slotsFolderIndex < 0) node.children.push(slotsFolder)
    const existing = new Map(
      slotsFolder.children
        .filter((child) => child.element.kind === 'slot-content')
        .map((child) => [(child.element as SlotContent.Element).slotId, child]),
    )
    slotsFolder.children = slotNodes.map((slotNode) => {
      const contentNode = existing.get(slotNode.element.slotId)
        ?? createNode(SlotContent.createSeed(slotNode))
      contentNode.children = contentNode.children.filter(
        (child) => child.element.kind !== 'props',
      )
      return contentNode
    })
  }

  const getProps = (
    componentNode: TreeNode.Node,
  ): ValueProp.Element[] => (
    componentNode.children
      .find((child) => child.element.kind === 'props')
      ?.children
      .map((child) => child.element)
      .filter((element): element is ValueProp.Element => element.kind === 'value-prop')
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

  const getVisibleComponents = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ComponentReference.Option[] => (
    dedupeOptions([
      ...collectVisibleLocalOptions(rootNode, targetNodeId),
      ...collectGlobalOptions(rootNode, targetNodeId),
    ])
  )

  const findOwnerComponent = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): TreeNode.Node | null => (
    (findPath(rootNode, targetNodeId) ?? [])
      .findLast((node) => node.element.kind === 'component') ?? null
  )

  const collectOwnedComponentUses = (
    componentNode: TreeNode.Node,
  ): (TreeNode.Node & { element: Element })[] => {
    const uses: (TreeNode.Node & { element: Element })[] = []
    const visit = (node: TreeNode.Node) => {
      node.children.forEach((child) => {
        if (child.element.kind === 'component') return
        if (child.element.kind === 'component-use') {
          uses.push(child as TreeNode.Node & { element: Element })
        }
        visit(child)
      })
    }
    visit(componentNode)
    return uses
  }

  const findVisibleComponentNode = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    componentId: string,
  ): TreeNode.Node | null => {
    const visibleIds = new Set(
      getVisibleComponents(rootNode, targetNodeId)
        .map((option) => option.componentId),
    )
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
      )))[0] ?? null
  }

  const wouldCreateCycle = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    ownerNode: TreeNode.Node,
    candidateId: string,
  ): boolean => {
    const candidateNode = findVisibleComponentNode(rootNode, targetNodeId, candidateId)
    if (candidateNode == null) return false

    const reachesOwner = (
      componentNode: TreeNode.Node,
      visited: Set<number>,
    ): boolean => {
      if (componentNode.id === ownerNode.id) return true
      if (visited.has(componentNode.id)) return false
      visited.add(componentNode.id)
      return collectOwnedComponentUses(componentNode).some((useNode) => {
        if (useNode.element.componentId == null) return false
        const referencedNode = findVisibleComponentNode(
          rootNode,
          useNode.id,
          useNode.element.componentId,
        )
        return referencedNode != null && reachesOwner(referencedNode, visited)
      })
    }

    return reachesOwner(candidateNode, new Set())
  }

  export const getComponents = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ComponentReference.Option[] => {
    const ownerNode = findOwnerComponent(rootNode, targetNodeId)
    const visible = getVisibleComponents(rootNode, targetNodeId)
    if (ownerNode == null) return visible
    return visible.filter((option) => !wouldCreateCycle(
      rootNode,
      targetNodeId,
      ownerNode,
      option.componentId,
    ))
  }

  export const findComponentNode = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    componentId: string,
  ): TreeNode.Node | null => findVisibleComponentNode(
    rootNode,
    targetNodeId,
    componentId,
  )
}

export default ComponentUse
