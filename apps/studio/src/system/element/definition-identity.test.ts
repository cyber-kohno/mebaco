import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '../tree/tree-node'
import AppElement from './kind/app/app-element'
import ComponentElement from './kind/component/definition/component-element'
import ComponentUseElement from './kind/component/reference/component-use-element'
import LauncherElement from './kind/project/launcher-element'
import SlotElement from './kind/component/definition/slot/slot-element'
import StyleElement from './kind/view/style-element'
import StyleParamElement from './kind/view/style-param-element'
import StyleParameterCatalog from './kind/view/style-parameter-catalog'

vi.mock('../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
    updateElement: vi.fn(),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('stable definition identities', () => {
  it('preserves definition UUIDs when editable names change', () => {
    const app = AppElement.create('Before', 'app-uuid')
    const component = ComponentElement.create('Before', 'component-uuid')
    const slot = SlotElement.create('before', 'slot-uuid')
    const style = StyleElement.create('before', [], [], 'style-uuid')
    const parameter = StyleParamElement.create('before', 'string', undefined, 'parameter-uuid')

    expect(AppElement.createSchema().update(app, { id: 'After' })).toMatchObject({
      appId: 'app-uuid', id: 'After',
    })
    expect(ComponentElement.createSchema().update(component, { id: 'After' })).toMatchObject({
      componentId: 'component-uuid', id: 'After',
    })
    expect(SlotElement.createSchema().update(slot, { id: 'after' })).toMatchObject({
      slotId: 'slot-uuid', id: 'after',
    })
    expect(StyleElement.createSchema().update(style, {
      id: 'after', rules: '[]', bases: '[]',
    })).toMatchObject({ styleId: 'style-uuid', id: 'after' })
    expect(StyleParamElement.createSchema().update(parameter, {
      id: 'after', valueType: 'string', hasDefaultValue: 'false', defaultValue: '',
    })).toMatchObject({ parameterId: 'parameter-uuid', id: 'after' })
  })

  it('uses UUIDs as option values and resolves the current names', () => {
    const component = node(5, ComponentElement.create('RenamedCard', 'component-uuid'))
    const componentUse = node(8, ComponentUseElement.create())
    const app = node(2, AppElement.create('RenamedApp', 'app-uuid'), [
      node(3, { kind: 'declares' }, [
        node(4, { kind: 'components' }, [component]),
      ]),
      node(6, ComponentElement.create('Host', 'host-uuid'), [
        node(7, { kind: 'elements' }, [componentUse]),
      ]),
    ])
    const style = node(10, StyleElement.create('renamedStyle', [], [], 'style-uuid'), [
      node(11, { kind: 'style-params' }, [
        node(12, StyleParamElement.create('renamedParam', 'number', 1, 'parameter-uuid')),
      ]),
    ])
    const root = node(1, { kind: 'project' }, [node(9, { kind: 'apps' }, [app]), style])

    expect(ComponentUseElement.getComponents(root, componentUse.id)).toContainEqual(
      expect.objectContaining({ componentId: 'component-uuid', label: 'RenamedCard' }),
    )
    expect(ComponentUseElement.findComponentNode(root, componentUse.id, 'component-uuid'))
      .toBe(component)
    expect(LauncherElement.getAppOptions(root)).toContainEqual(
      expect.objectContaining({ componentId: 'app-uuid', label: 'RenamedApp' }),
    )
    expect(StyleElement.getStyleOptions(root)).toContainEqual({
      value: 'style-uuid', label: 'renamedStyle',
    })
    expect(StyleParameterCatalog.createCatalog(root).resolve('style-uuid').parameters)
      .toContainEqual(expect.objectContaining({
        parameterId: 'parameter-uuid',
        id: 'renamedParam',
        sourceStyleId: 'style-uuid',
        sourceStyleName: 'renamedStyle',
      }))
  })
})
