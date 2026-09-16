import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../../store/tree-store'

namespace EffectElement {
  export type Kind = 'effect'
  export type Trigger = 'mount' | 'dependencies'
  export type Dependency = {
    dependencyId: string
    type: 'formula'
    source: string
  }
  export type Action = {
    type: 'script'
    source: string
  }
  export type Element = {
    kind: Kind
    comment: string
    trigger: Trigger
    dependencies: Dependency[]
    action: Action
  }

  export const create = (
    comment = '',
    trigger: Trigger = 'mount',
    dependencies: Dependency[] = [],
    source = '',
  ): Element => ({
    kind: 'effect',
    comment,
    trigger,
    dependencies: trigger === 'dependencies' ? dependencies : [],
    action: { type: 'script', source },
  })

  const parseDependencies = (value: string): Dependency[] => {
    try {
      const parsed: unknown = JSON.parse(value)
      if (!Array.isArray(parsed)) return []
      return parsed.flatMap((item) => {
        if (item == null || typeof item !== 'object') return []
        const dependency = item as Partial<Dependency>
        if (
          typeof dependency.dependencyId !== 'string'
          || dependency.type !== 'formula'
          || typeof dependency.source !== 'string'
        ) return []
        return [{
          dependencyId: dependency.dependencyId,
          type: 'formula' as const,
          source: dependency.source,
        }]
      })
    } catch {
      return []
    }
  }

  export type SchemaOptions = {
    allowMount?: boolean
  }

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => {
    const allowMount = options.allowMount !== false
    const triggerOptions = [
      ...(allowMount ? [{ value: 'mount', label: 'Mount' }] : []),
      { value: 'dependencies', label: 'Dependencies' },
    ]
    return {
      createTitle: 'Create Effect',
      updateTitle: 'Update Effect',
      tabs: [
        { id: 'info', label: 'Info' },
        { id: 'action', label: 'Action' },
      ],
      fields: [
        {
          type: 'text', tab: 'info', key: 'comment', label: 'Comment',
          charset: 'any', maxLength: 64,
        },
        {
          type: 'select', tab: 'info', key: 'trigger', label: 'Trigger',
          width: 'mode', required: true,
          defaultValue: allowMount ? 'mount' : 'dependencies',
          options: triggerOptions,
          clearWhenChanged: ['dependencies'],
        },
        {
          type: 'effectDependencies', tab: 'info', key: 'dependencies',
          label: 'Dependencies', defaultValue: '[]',
          visibleWhen: { key: 'trigger', value: 'dependencies' },
        },
        {
          type: 'script', tab: 'action', key: 'action', label: 'Action',
          required: true, maxLength: 8000, allowAwait: true,
        },
      ],
      createPreview: () => create('...', allowMount ? 'mount' : 'dependencies'),
      getInitialValues: (element) => ({
        comment: element.comment,
        trigger: element.trigger,
        dependencies: JSON.stringify(element.dependencies),
        action: element.action.source,
      }),
      create: (values) => create(
        values.comment,
        values.trigger === 'dependencies' ? 'dependencies' : 'mount',
        parseDependencies(values.dependencies),
        values.action,
      ),
      update: (_element, values) => create(
        values.comment,
        values.trigger === 'dependencies' ? 'dependencies' : 'mount',
        parseDependencies(values.dependencies),
        values.action,
      ),
    }
  }

  export const definition = {
    kind: 'effect',
    treeLabel: {
      type: 'static',
      kindText: 'Effect',
      tone: 'item',
      getValueText: (element: Element) => (
        element.comment.length > 0
          ? `${element.trigger} /** ${element.comment} */`
          : element.trigger
      ),
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const siblingMount = context.parentNode?.children.some((child) => (
        child.id !== context.node.id
        && child.element.kind === 'effect'
        && child.element.trigger === 'mount'
      )) === true
      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ allowMount: !siblingMount }),
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

export default EffectElement
