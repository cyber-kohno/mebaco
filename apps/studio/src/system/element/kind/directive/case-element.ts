import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import SwitchValueType from './switch-value-type'
import TypeCatalog from '../type/type-catalog'
import type UnionDefinition from '../type/union-definition'
import TypeLiteralLabel from '../type/type-literal-label'
import FunctionActions from '../../function-actions'
import type SwitchElement from './switch-element'

namespace CaseElement {
  export type Kind = 'case'
  export type Value =
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }

  export type Element = {
    kind: Kind
    value: Value
  }

  export const create = (value: Value): Element => ({
    kind: 'case',
    value,
  })

  export type CreateSchemaOptions = {
    valueType: SwitchValueType.PrimitiveName
    allowedValues?: readonly Value[]
    reservedValues?: readonly Value[]
  }

  export const createSchema = (
    options: CreateSchemaOptions,
  ): ElementEditSchema.Schema<Element> => {
    const serializeValue = (value: Value): string => (
      value.type === 'number' ? String(value.value) : value.value
    )
    const field: ElementEditSchema.Field = options.allowedValues != null
      ? {
          type: 'select',
          key: 'value',
          label: 'Value',
          required: true,
          options: options.allowedValues.map((value) => ({
            value: serializeValue(value),
            label: String(value.value),
          })),
          reservedValues: options.reservedValues?.map(serializeValue),
          width: 'literalUnion',
        }
      : options.valueType === 'number'
      ? {
          type: 'number',
          key: 'value',
          label: 'Value',
          required: true,
          reservedValues: options.reservedValues
            ?.filter((value): value is Extract<Value, { type: 'number' }> => (
              value.type === 'number'
            ))
            .map((value) => value.value),
        }
      : {
          type: 'text',
          key: 'value',
          label: 'Value',
          charset: 'any',
          maxLength: 200,
          reservedNames: options.reservedValues
            ?.filter((value): value is Extract<Value, { type: 'string' }> => (
              value.type === 'string'
            ))
            .map((value) => value.value),
        }

    return {
      createTitle: 'Create Case',
      updateTitle: 'Update Case',
      fields: [field],
      createPreview: () => create(
        options.valueType === 'number'
          ? { type: 'number', value: 0 }
          : { type: 'string', value: '' },
      ),
      getInitialValues: (element) => ({
        value: String(element.value.value),
      }),
      create: (values) => create(
        options.valueType === 'number'
          ? { type: 'number', value: Number(values.value) }
          : { type: 'string', value: values.value },
      ),
      update: (element, values) => ({
        ...element,
        value: options.valueType === 'number'
          ? { type: 'number', value: Number(values.value) }
          : { type: 'string', value: values.value },
      }),
    }
  }

  const getValueText = (element: Element): string => (
    TypeLiteralLabel.format(element.value.value)
  )

  export const definition = {
    kind: 'case',
    treeLabel: {
      type: 'static',
      kindText: 'Case',
      tone: 'condition',
      getValueText,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const switchElement = context.parentNode != null
        && (context.parentNode.element.kind === 'switch'
          || context.parentNode.element.kind === 'control-switch')
        ? context.parentNode.element as SwitchElement.Element
        : null
      const findLiteralUnion = (
        unionTypeId: string,
      ): UnionDefinition.Literal | undefined => {
        const definition = TypeCatalog.findUnion(
          context.rootNode,
          unionTypeId,
        )?.element.definition
        return definition?.type === 'literal' ? definition : undefined
      }
      const switchValueType = switchElement == null
        ? null
        : SwitchValueType.parse(JSON.stringify(switchElement.valueType))
          ?? SwitchValueType.createFromLegacy(switchElement.valueType)
      const primitive = switchValueType == null
        ? null
        : SwitchValueType.getPrimitiveName(switchValueType, findLiteralUnion)
      const allowedValues = switchValueType == null || primitive == null
        ? null
        : SwitchValueType.getAllowedLiterals(
            switchValueType,
            findLiteralUnion,
          )?.map((value) => (
            primitive === 'number'
              ? { type: 'number' as const, value: Number(value) }
              : { type: 'string' as const, value: String(value) }
          )) ?? null
      const reservedValues = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id && node.element.kind === 'case')
        .map((node) => node.element.kind === 'case' ? node.element.value : null)
        .filter((value): value is Value => value != null)

      const items: ActionMenuState.Item[] = []
      const isControlBranch = context.parentNode?.element.kind === 'control-switch'
      if (primitive != null) {
        items.push(action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({
              valueType: primitive,
              allowedValues: allowedValues ?? undefined,
              reservedValues,
            }),
          )
        }))
      }
      items.push(
        ...(isControlBranch
          ? [
              FunctionActions.createAddDeclareMenu(context.node.id, context.rootNode),
              FunctionActions.createAddStatementMenu(context.node.id, context.rootNode),
              FunctionActions.createAddControlMenu(context.node.id, context.rootNode),
              FunctionActions.createAddBlockItem(context.node.id),
            ]
          : ContentActions.createOptionalRetentionItems(context.node, context.rootNode)),
        action('Remove', () => {
          TreeStore.removeNode(context.node.id)
        }, 'danger'),
      )
      return items
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'switch-case',
  } satisfies ElementDefinition.Definition<Element>
}

export default CaseElement

