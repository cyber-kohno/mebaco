import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import TypeCatalog from './type-catalog'
import SignatureDefinition from './signature-definition'
import SignatureTypeTreeLabel from './SignatureTypeTreeLabel.svelte'

namespace SignatureTypeElement {
  export type Kind = 'signature-type'

  export type Element = {
    kind: Kind
    typeId: string
    id: string
    async: boolean
    parameters: SignatureDefinition.Parameter[]
    returnType: SignatureDefinition.Definition['returnType']
  }

  const createTypeId = (): string => globalThis.crypto.randomUUID()

  export const create = (
    id: string,
    definition: SignatureDefinition.Definition = SignatureDefinition.create(),
    typeId = createTypeId(),
  ): Element => ({
    kind: 'signature-type',
    typeId,
    id,
    async: definition.async,
    parameters: definition.parameters,
    returnType: definition.returnType,
  })

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    objectOptions?: readonly TypeCatalog.ObjectOption[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Signature Type',
    updateTitle: 'Update Signature Type',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        readOnlyOnUpdate: true,
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
    createPreview: () => create('...', SignatureDefinition.create(), 'preview'),
    getInitialValues: (element) => ({
      id: element.id,
      definition: SignatureDefinition.stringify({
        async: element.async,
        parameters: element.parameters,
        returnType: element.returnType,
      }),
    }),
    create: (values) => create(
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
  } satisfies ElementDefinition.Definition<Element>
}

export default SignatureTypeElement
