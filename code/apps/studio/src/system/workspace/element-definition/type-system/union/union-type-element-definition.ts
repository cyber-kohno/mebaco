import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import UnionTypeTreeLabel from '@system/workspace/tree/label/type-system/union/UnionTypeTreeLabel.svelte'
import TypeCatalog from '@system/model/type-system/type-catalog'
import UnionDefinition from '@system/model/type-system/union/union-definition'
import UnionType from '@system/model/type-system/union/union-type'

namespace UnionTypeElementDefinition {
  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    objectOptions?: readonly TypeCatalog.ObjectOption[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<UnionType.Element> => ({
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
      },
      {
        type: 'unionDefinition',
        key: 'definition',
        label: 'Definition',
        defaultValue: UnionDefinition.stringify(UnionDefinition.create()),
        objectOptions: options.objectOptions ?? [],
      },
    ],
    createPreview: () => UnionType.create('...', UnionDefinition.create(), 'preview'),
    getInitialValues: (element) => ({
      id: element.id,
      definition: UnionDefinition.stringify(element.definition),
    }),
    create: (values) => UnionType.create(
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
    search: { getIdText: (element) => element.id },
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
  } satisfies ElementDefinition.Definition<UnionType.Element>
}

export default UnionTypeElementDefinition
