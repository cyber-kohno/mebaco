import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import UnionTypeTreeLabel from './UnionTypeTreeLabel.svelte'
import TypeCatalog from './type-catalog'
import UnionDefinition from './union-definition'

namespace UnionTypeElement {
  export type Kind = 'union-type'

  export type Element = {
    kind: Kind
    typeId: string
    id: string
    definition: UnionDefinition.Definition
  }

  const createTypeId = (): string => globalThis.crypto.randomUUID()

  export const create = (
    id: string,
    definition: UnionDefinition.Definition = UnionDefinition.create(),
    typeId = createTypeId(),
  ): Element => ({
    kind: 'union-type',
    typeId,
    id,
    definition,
  })

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    objectOptions?: readonly TypeCatalog.ObjectOption[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Union Type',
    updateTitle: 'Update Union Type',
    fields: [
      {
        type: 'text',
        key: 'id',
        label: 'Id',
        width: 'id',
        required: true,
        charset: 'pascalIdentifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
        readOnlyOnUpdate: true,
      },
      {
        type: 'unionDefinition',
        key: 'definition',
        label: 'Definition',
        defaultValue: UnionDefinition.stringify(UnionDefinition.create()),
        objectOptions: options.objectOptions ?? [],
      },
    ],
    createPreview: () => create('...', UnionDefinition.create(), 'preview'),
    getInitialValues: (element) => ({
      id: element.id,
      definition: UnionDefinition.stringify(element.definition),
    }),
    create: (values) => create(
      values.id,
      UnionDefinition.parse(values.definition) ?? UnionDefinition.create(),
    ),
    update: (element, values) => ({
      ...element,
      id: values.id,
      definition: UnionDefinition.parse(values.definition) ?? UnionDefinition.create(),
    }),
  })

  export const definition = {
    kind: 'union-type',
    treeLabel: {
      type: 'component',
      Component: UnionTypeTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = TypeCatalog.collectVisibleNamedTypes(
        context.rootNode,
        context.node.id,
      )
        .filter((entry) => entry.node.id !== context.node.id)
        .map((entry) => entry.element.id)
      const objectOptions = TypeCatalog.getObjectOptions(
        context.rootNode,
        context.node.id,
      )

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames, objectOptions }),
          )
        }),
        ...(
          TypeCatalog.isUnionReferenced(context.rootNode, context.element.typeId)
            ? []
            : [action('Delete', () => TreeStore.removeNode(context.node.id), 'danger')]
        ),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default UnionTypeElement
