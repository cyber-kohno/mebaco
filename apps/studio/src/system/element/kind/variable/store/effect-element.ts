import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../../store/tree-store'

namespace EffectElement {
  export type Kind = 'effect'
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
    dependencies: Dependency[]
    action: Action
  }

  export const create = (
    comment = '',
    dependencies: Dependency[] = [],
    source = '',
  ): Element => ({
    kind: 'effect',
    comment,
    dependencies,
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

  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
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
        type: 'effectDependencies', tab: 'info', key: 'dependencies',
        label: 'Dependencies', defaultValue: '[]',
      },
      {
        type: 'script', tab: 'action', key: 'action', label: 'Action',
        maxLength: 8000, allowAwait: true, fillAvailable: true,
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({
      comment: element.comment,
      dependencies: JSON.stringify(element.dependencies),
      action: element.action.source,
    }),
    create: (values) => create(
      values.comment,
      parseDependencies(values.dependencies),
      values.action,
    ),
    update: (_element, values) => create(
      values.comment,
      parseDependencies(values.dependencies),
      values.action,
    ),
  })

  export const definition = {
    kind: 'effect',
    treeLabel: {
      type: 'static',
      kindText: 'Effect',
      tone: 'item',
      getValueText: (element: Element) => {
        const behavior = element.dependencies.length === 0
          ? 'mount only'
          : 'mount + dependencies'
        return element.comment.length > 0
          ? `${behavior} /** ${element.comment} */`
          : behavior
      },
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema(),
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
