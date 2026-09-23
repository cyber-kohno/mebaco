import { describe, expect, it, vi } from 'vitest'
import type TreeNode from '@system/model/tree/tree-node'
import App from '@system/model/app/app'
import AppElementDefinition from '@system/workspace/element-definition/app/app-element-definition'
import ComponentElement from '@system/model/component/component'
import ComponentUseElement from '@system/model/component/component-use'
import ComponentElementDefinition from '@system/workspace/element-definition/component/component-element-definition'
import ComponentUseElementDefinition from '@system/workspace/element-definition/component/component-use-element-definition'
import Launcher from '@system/model/project/launcher'
import LauncherElementDefinition from '@system/workspace/element-definition/project/launcher-element-definition'
import SlotElement from '@system/model/component/slot'
import SlotElementDefinition from '@system/workspace/element-definition/component/slot-element-definition'
import StyleElement from '@system/model/view/style/style'
import StyleParamElement from '@system/model/view/style/style-param'
import StyleParameterCatalog from '@system/model/view/style/style-parameter-catalog'
import StyleElementDefinition from '@system/workspace/element-definition/view/style/style-element-definition'
import StyleParamElementDefinition from '@system/workspace/element-definition/view/style/style-param-element-definition'
import ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'

vi.mock('@system/workspace/tree/state', () => ({
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
  it('creates a stable UUID for each Launcher', () => {
    const first = Launcher.create()
    const second = Launcher.create()

    expect(first.launcherId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(second.launcherId).not.toBe(first.launcherId)
  })

  it('stores Launcher names only when they contain visible text', () => {
    const schema = LauncherElementDefinition.createSchema(node(1, { kind: 'project' }))
    const unnamed = schema.create({
      id: 'preview', name: '   ', appId: '', argumentBindings: '[]',
    })
    const named = schema.update(unnamed, {
      id: 'preview', name: 'Preview', appId: '', argumentBindings: '[]',
    })
    const cleared = schema.update(named, {
      id: 'preview', name: '', appId: '', argumentBindings: '[]',
    })

    expect(unnamed).not.toHaveProperty('name')
    expect(named).toHaveProperty('name', 'Preview')
    expect(cleared).not.toHaveProperty('name')
  })

  it('requires a Launcher App even when no Apps are available', () => {
    const appField = LauncherElementDefinition.createSchema(node(1, { kind: 'project' })).fields
      .find((field) => field.key === 'appId')

    expect(appField).toMatchObject({ type: 'select', required: true, options: [] })
    expect(appField?.type === 'select' && ElementEditSchema.validateSelect(appField, ''))
      .toBe('Required.')
  })

  it('preserves definition UUIDs when editable names change', () => {
    const app = App.create('Before', 'app-uuid')
    const component = ComponentElement.create('Before', 'component-uuid')
    const slot = SlotElement.create('before', 'slot-uuid')
    const style = StyleElement.create('before', [], [], 'style-uuid')
    const parameter = StyleParamElement.create('before', 'string', undefined, 'parameter-uuid')
    const launcher = Launcher.create('launcher-uuid')

    expect(AppElementDefinition.createSchema().update(app, { id: 'After' })).toMatchObject({
      appId: 'app-uuid', id: 'After',
    })
    expect(ComponentElementDefinition.createSchema().update(component, { id: 'After' })).toMatchObject({
      componentId: 'component-uuid', id: 'After',
    })
    expect(SlotElementDefinition.createSchema().update(slot, { id: 'after' })).toMatchObject({
      slotId: 'slot-uuid', id: 'after',
    })
    expect(StyleElementDefinition.createSchema().update(style, {
      id: 'after', rules: '[]', bases: '[]',
    })).toMatchObject({ styleId: 'style-uuid', id: 'after' })
    expect(StyleParamElementDefinition.createSchema().update(parameter, {
      id: 'after', valueType: 'string', hasDefaultValue: 'false', defaultValue: '',
    })).toMatchObject({ parameterId: 'parameter-uuid', id: 'after' })
    expect(LauncherElementDefinition.createSchema(node(1, { kind: 'project' })).update(launcher, {
      id: 'after', name: 'After', appId: '', argumentBindings: '[]',
    })).toMatchObject({ launcherId: 'launcher-uuid', id: 'after' })
  })

  it('uses UUIDs as option values and resolves the current names', () => {
    const component = node(5, ComponentElement.create('RenamedCard', 'component-uuid'))
    const componentUse = node(8, ComponentUseElement.create())
    const app = node(2, App.create('RenamedApp', 'app-uuid'), [
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
    expect(Launcher.getAppOptions(root)).toContainEqual(
      expect.objectContaining({ componentId: 'app-uuid', label: 'RenamedApp' }),
    )
    expect(StyleElementDefinition.getStyleOptions(root)).toContainEqual({
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

  it('stores an optional Component root Partial key', () => {
    const schema = ComponentElementDefinition.createSchema()
    const created = schema.create({
      id: 'Panel',
      partialKey: JSON.stringify({ type: 'formula', source: '$state.panelId' }),
    })

    expect(created).toMatchObject({
      kind: 'component',
      id: 'Panel',
      partialKey: { type: 'formula', source: '$state.panelId' },
    })
    expect(schema.getInitialValues(created).partialKey).toBe(
      JSON.stringify({ type: 'formula', source: '$state.panelId' }),
    )

    expect(schema.update(created, { id: 'Panel', partialKey: '' }))
      .not.toHaveProperty('partialKey')
  })

  it('excludes direct and indirect recursive Component references', () => {
    const useFromA = node(8, ComponentUseElement.create())
    const useFromB = node(12, {
      ...ComponentUseElement.create(), componentId: 'component-a',
    })
    const componentA = node(5, ComponentElement.create('A', 'component-a'), [
      node(7, { kind: 'elements' }, [useFromA]),
    ])
    const componentB = node(9, ComponentElement.create('B', 'component-b'), [
      node(11, { kind: 'elements' }, [useFromB]),
    ])
    const app = node(2, App.create('App', 'app-uuid'), [
      node(3, { kind: 'declares' }, [
        node(4, { kind: 'components' }, [componentA, componentB]),
      ]),
    ])
    const root = node(1, { kind: 'project' }, [node(13, { kind: 'apps' }, [app])])

    expect(ComponentUseElement.getComponents(root, useFromA.id)).toEqual([])
  })

  it('requires a Component reference even when no candidates are available', () => {
    const componentField = ComponentUseElementDefinition.createSchema().fields
      .find((field) => field.key === 'componentId')

    expect(componentField).toMatchObject({ type: 'select', required: true, options: [] })
    expect(componentField?.type === 'select' && ElementEditSchema.validateSelect(componentField, ''))
      .toBe('Required.')
  })
})
