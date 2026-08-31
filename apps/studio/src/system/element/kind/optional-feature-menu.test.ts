import { beforeEach, describe, expect, it, vi } from 'vitest'
import type ActionMenuState from '../../action-menu/action-menu-state'
import TreeStore from '../../store/tree-store'
import type TreeNode from '../../tree/tree-node'
import ComponentElement from './component/definition/component-element'
import SlotElement from './component/definition/slot/slot-element'
import SlotsElement from './component/definition/slot/slots-element'
import StyleElement from './view/style/style-element'
import StyleParamElement from './view/style/style-param-element'
import StyleParamsElement from './view/style/style-params-element'

vi.mock('../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
  },
}))

const createNode = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const getAction = (
  items: readonly ActionMenuState.Item[],
  label: string,
): ActionMenuState.ActionItem => {
  const item = items.find((candidate) => candidate.label === label)
  expect(item).toMatchObject({ type: 'action', label })
  if (item?.type !== 'action') throw new Error(`Action '${label}' was not found.`)
  return item
}

describe('Optional feature menus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('removes a non-empty Slots container from either the Component or container menu', () => {
    const slots = createNode(3, SlotsElement.create(), [
      createNode(4, SlotElement.create('content')),
    ])
    const component = createNode(2, ComponentElement.create('Card'), [slots])
    const root = createNode(1, { kind: 'project' }, [component])

    const componentItems = ComponentElement.definition.getContextMenu({
      element: component.element as ComponentElement.Element,
      node: component,
      parentNode: root,
      rootNode: root,
    })
    expect(componentItems.map((item) => item.label)).toEqual([
      'Modify',
      'Remove slots',
      'Delete',
    ])
    getAction(componentItems, 'Remove slots').callback()
    expect(TreeStore.removeNode).toHaveBeenCalledWith(slots.id)

    vi.mocked(TreeStore.removeNode).mockClear()
    const slotsItems = SlotsElement.definition.getContextMenu({
      element: slots.element as SlotsElement.Element,
      node: slots,
      parentNode: component,
      rootNode: root,
    })
    expect(slotsItems.map((item) => item.label)).toEqual(['Add Slot', 'Delete'])
    getAction(slotsItems, 'Delete').callback()
    expect(TreeStore.removeNode).toHaveBeenCalledWith(slots.id)
  })

  it('removes a non-empty Parameters container from either the Style or container menu', () => {
    const parameters = createNode(3, StyleParamsElement.create(), [
      createNode(4, StyleParamElement.create('color', 'color')),
    ])
    const style = createNode(2, StyleElement.create('card'), [parameters])
    const root = createNode(1, { kind: 'project' }, [style])

    const styleItems = StyleElement.definition.getContextMenu({
      element: style.element as StyleElement.Element,
      node: style,
      parentNode: root,
      rootNode: root,
    })
    expect(styleItems.map((item) => item.label)).toEqual([
      'Modify',
      'Remove parameters',
      'Use locals',
      'Delete',
    ])
    getAction(styleItems, 'Remove parameters').callback()
    expect(TreeStore.removeNode).toHaveBeenCalledWith(parameters.id)

    vi.mocked(TreeStore.removeNode).mockClear()
    const parameterItems = StyleParamsElement.definition.getContextMenu({
      element: parameters.element as StyleParamsElement.Element,
      node: parameters,
      parentNode: style,
      rootNode: root,
    })
    expect(parameterItems.map((item) => item.label)).toEqual(['Add parameter', 'Delete'])
    getAction(parameterItems, 'Delete').callback()
    expect(TreeStore.removeNode).toHaveBeenCalledWith(parameters.id)
  })

  it('uses a stable Parameters then Locals order regardless of creation order', () => {
    const parameters = createNode(3, StyleParamsElement.create())
    const locals = createNode(4, { kind: 'style-locals' })
    const styleWithLocals = createNode(2, StyleElement.create('card'), [locals])
    const styleWithParameters = createNode(5, StyleElement.create('panel'), [parameters])

    expect(StyleElement.getContainerInsertIndex(styleWithLocals, 'style-params')).toBe(0)
    expect(StyleElement.getContainerInsertIndex(styleWithParameters, 'style-locals')).toBe(1)
  })
})
