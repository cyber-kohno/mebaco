import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import TypeCatalog from '../type/type-catalog'
import ValueTypeDefinition from '../type/value-type-definition'
import FunctionArgumentsElement from './function-arguments-element'
import FunctionProcedureElement from './function-procedure-element'
import FunctionScope from './function-scope'
import FunctionTreeLabel from './FunctionTreeLabel.svelte'

namespace FunctionElement {
  export type Kind = 'function'

  export type Element = {
    kind: Kind
    id: string
    async: boolean
    returnType: ValueTypeDefinition.Definition | null
  }

  export const create = (
    id: string,
    async = false,
    returnType: ValueTypeDefinition.Definition | null = null,
  ): Element => ({
    kind: 'function',
    id,
    async,
    returnType,
  })

  export type SchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  const parseReturnType = (
    values: Readonly<Record<string, string>>,
  ): ValueTypeDefinition.Definition | null => (
    values.voidReturn === 'true'
      ? null
      : ValueTypeDefinition.parse(values.returnType) ?? ValueTypeDefinition.create()
  )

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Function',
    updateTitle: 'Update Function',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'jsIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'checkbox', key: 'async', label: 'Async', defaultValue: 'false',
      },
      {
        type: 'heading', key: 'returnTypeHeading', label: 'Return Type',
      },
      {
        type: 'checkbox', key: 'voidReturn', label: 'Void',
        defaultValue: 'true',
      },
      {
        type: 'valueType', key: 'returnType', label: 'Return Type', required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
        visibleWhen: { key: 'voidReturn', value: 'false' },
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({
      id: element.id,
      async: String(element.async),
      voidReturn: String(element.returnType == null),
      returnType: ValueTypeDefinition.stringify(
        element.returnType ?? ValueTypeDefinition.create(),
      ),
    }),
    create: (values) => create(
      values.id,
      values.async === 'true',
      parseReturnType(values),
    ),
    update: (_element, values) => create(
      values.id,
      values.async === 'true',
      parseReturnType(values),
    ),
  })

  export const definition = {
    kind: 'function',
    treeLabel: {
      type: 'component',
      Component: FunctionTreeLabel,
    },
    createInitialChildren: () => [
      { element: FunctionArgumentsElement.create() },
      { element: FunctionProcedureElement.create() },
    ],
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const frameNode = FunctionScope.findFrameNode(context.rootNode, context.node.id)
      const reservedNames = frameNode == null
        ? []
        : FunctionScope.collectFrameFunctions(frameNode)
            .filter((entry) => entry.node.id !== context.node.id)
            .map((entry) => entry.element.id)
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema({
            reservedNames,
            referenceOptions: TypeCatalog.getReferenceOptions(
              context.rootNode,
              context.node.id,
            ),
            namedTypeOptions: TypeCatalog.getNamedTypeOptions(
              context.rootNode,
              context.node.id,
            ),
          }),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default FunctionElement
