import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import ObjectTypeTreeLabel from '@system/workspace/tree/label/type-system/object/ObjectTypeTreeLabel.svelte'
import TypeCatalog from '@system/model/type-system/type-catalog'
import ObjectShape from '@system/model/type-system/object/object-shape'
import ObjectType from '@system/model/type-system/object/object-type'

namespace ObjectTypeElementDefinition {
  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    objectOptions?: readonly TypeCatalog.ObjectOption[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<ObjectType.Element> => ({
    createTitle: 'Create Object Type',
    updateTitle: 'Update Object Type',
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
        type: 'objectShape',
        key: 'properties',
        label: 'Properties',
        defaultValue: JSON.stringify(ObjectShape.create()),
        idKey: 'id',
        objectOptions: options.objectOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
      },
    ],
    createPreview: () => ObjectType.create('...', 'preview'),
    getInitialValues: (element) => ({
      id: element.id,
      properties: JSON.stringify(ObjectShape.create(element.properties, element.baseObjectIds)),
    }),
    create: (values) => {
      const shape = ObjectShape.parse(values.properties) ?? ObjectShape.create()
      return ObjectType.create(values.id, undefined, shape.properties, shape.baseObjectIds)
    },
    update: (element, values) => {
      const shape = ObjectShape.parse(values.properties) ?? ObjectShape.create()
      return {
        ...element,
        id: values.id,
        baseObjectIds: shape.baseObjectIds,
        properties: shape.properties,
      }
    },
  })

  export const definition = {
    kind: 'object-type',
    treeLabel: {
      type: 'component',
      Component: ObjectTypeTreeLabel,
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
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(
        context.rootNode,
        context.node.id,
      )

      const items: ActionMenuState.Item[] = [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames, objectOptions, namedTypeOptions }),
          )
        }),
      ]

      if (!TypeCatalog.isObjectReferenced(context.rootNode, context.element.typeId)) {
        items.push(action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'))
      }
      return items
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<ObjectType.Element>
}

export default ObjectTypeElementDefinition
