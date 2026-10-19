import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import SwitchValueType from '@system/model/directive/switch-value-type'
import TypeCatalog from '@system/model/type-system/type-catalog'
import type UnionDefinition from '@system/model/type-system/union/union-definition'
import TypeLiteralLabel from '@system/model/type-system/type-literal-label'
import FunctionActions from '@system/workspace/tree/context-menu/function-actions'
import Case from '@system/model/directive/case'
import type Switch from '@system/model/directive/switch'

namespace CaseElementDefinition {
  export type CreateSchemaOptions = {
    valueType: SwitchValueType.PrimitiveName
    allowedValues?: readonly Case.Value[]
    reservedValues?: readonly Case.Value[]
  }

  export const createSchema = (
    options: CreateSchemaOptions,
  ): ElementEditSchema.Schema<Case.Element> => {
    const serializeValue = (value: Case.Value): string => (
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
            ?.filter((value): value is Extract<Case.Value, { type: 'number' }> => (
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
            ?.filter((value): value is Extract<Case.Value, { type: 'string' }> => (
              value.type === 'string'
            ))
            .map((value) => value.value),
        }

    return {
      createTitle: 'Create Case',
      updateTitle: 'Update Case',
      fields: [field],
      createPreview: () => Case.create(
        options.valueType === 'number'
          ? { type: 'number', value: 0 }
          : { type: 'string', value: '' },
      ),
      getInitialValues: (element) => ({
        value: String(element.value.value),
      }),
      create: (values) => Case.create(
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

  const getValueText = (element: Case.Element): string => (
    TypeLiteralLabel.format(element.value.value)
  )

  export const definition = {
    kind: 'case',
    treeLabel: {
      type: 'static',
      kindText: 'Case',
      tone: 'directive',
      getValueText,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const switchElement = context.parentNode != null
        && (context.parentNode.element.kind === 'switch'
          || context.parentNode.element.kind === 'control-switch')
        ? context.parentNode.element as Switch.Element
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
        .filter((value): value is Case.Value => value != null)

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
  } satisfies ElementDefinition.Definition<Case.Element>
}

export default CaseElementDefinition

