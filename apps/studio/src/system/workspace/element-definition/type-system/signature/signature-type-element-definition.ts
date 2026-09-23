import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import TypeCatalog from '@system/model/type-system/type-catalog'
import SignatureDefinition from '@system/model/type-system/signature/signature-definition'
import SignatureTypeTreeLabel from '@system/workspace/tree/label/type-system/signature/SignatureTypeTreeLabel.svelte'
import SignatureType from '@system/model/type-system/signature/signature-type'

namespace SignatureTypeElementDefinition {
  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    objectOptions?: readonly TypeCatalog.ObjectOption[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<SignatureType.Element> => ({
    createTitle: 'Create Signature Type',
    updateTitle: 'Update Signature Type',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'pascalIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'signatureDefinition',
        key: 'definition',
        label: 'Definition',
        defaultValue: SignatureDefinition.stringify(SignatureDefinition.create()),
        idKey: 'id',
        objectOptions: options.objectOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
      },
    ],
    createPreview: () => SignatureType.create('...', SignatureDefinition.create(), 'preview'),
    getInitialValues: (element) => ({
      id: element.id,
      definition: SignatureDefinition.stringify({
        async: element.async,
        parameters: element.parameters,
        returnType: element.returnType,
      }),
    }),
    create: (values) => SignatureType.create(
      values.id,
      SignatureDefinition.parse(values.definition) ?? SignatureDefinition.create(),
    ),
    update: (element, values) => {
      const definition = SignatureDefinition.parse(values.definition) ?? SignatureDefinition.create()
      return {
        ...element,
        id: values.id,
        async: definition.async,
        parameters: definition.parameters,
        returnType: definition.returnType,
      }
    },
  })

  export const definition = {
    kind: 'signature-type',
    treeLabel: {
      type: 'component',
      Component: SignatureTypeTreeLabel,
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
      const objectOptions = TypeCatalog.getObjectOptions(context.rootNode, context.node.id)
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(context.rootNode, context.node.id)
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema({ reservedNames, objectOptions, namedTypeOptions }),
        )),
        ...(
          TypeCatalog.isSignatureReferenced(context.rootNode, context.element.typeId)
            ? []
            : [action('Delete', () => TreeStore.removeNode(context.node.id), 'danger')]
        ),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<SignatureType.Element>
}

export default SignatureTypeElementDefinition
