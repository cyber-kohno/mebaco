import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import CaseElementDefinition from './case-element-definition'
import Case from '@system/model/directive/case'
import DefaultDirective from '@system/model/directive/default'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import Switch from '@system/model/directive/switch'
import SwitchValueType from '@system/model/directive/switch-value-type'

namespace SwitchElementDefinition {
  export type CreateSchemaOptions = {
    caseValueType?: SwitchValueType.PrimitiveName
    caseValues?: readonly SwitchValueType.Literal[]
    literalUnionOptions?: readonly SwitchValueType.LiteralUnionOption[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Switch.Element> => ({
    createTitle: 'Create Switch',
    updateTitle: 'Update Switch',
    fields: [
      {
        type: 'switchValueType',
        key: 'valueType',
        label: 'Value Type',
        defaultValue: SwitchValueType.stringify(SwitchValueType.createPrimitive()),
        literalUnionOptions: options.literalUnionOptions ?? [],
        caseValueType: options.caseValueType,
        caseValues: options.caseValues,
      },
      {
        type: 'formula',
        key: 'source',
        label: 'Expression',
        required: true,
        maxLength: 4000,
        getExpectedTypeText: (values) => SwitchValueType.getTypeText(
          SwitchValueType.parse(values.valueType) ?? SwitchValueType.createPrimitive(),
          options.literalUnionOptions ?? [],
        ),
      },
    ],
    createPreview: () => Switch.create(SwitchValueType.createPrimitive(), '...'),
    getInitialValues: (element) => ({
      valueType: SwitchValueType.stringify(Switch.normalizeValueType(element.valueType)),
      source: element.source,
    }),
    create: (values) => Switch.create(
      SwitchValueType.parse(values.valueType) ?? SwitchValueType.createPrimitive(),
      values.source,
    ),
    update: (element, values) => ({
      ...element,
      valueType: SwitchValueType.parse(values.valueType) ?? SwitchValueType.createPrimitive(),
      source: values.source,
    }),
  })

  const getPreview = (element: Switch.Element): string => {
    const source = element.source.replace(/\s*\r?\n\s*/g, ' ')
    const preview = source.length > 28 ? `${source.slice(0, 28)}...` : source
    return `${SwitchValueType.getLabel(Switch.normalizeValueType(element.valueType))}: ${preview}`
  }

  export const definition = {
    kind: 'switch',
    treeLabel: {
      type: 'static',
      kindText: 'Switch',
      tone: 'block',
      getValueText: getPreview,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const caseNodes = context.node.children.filter((node) => (
        node.element.kind === 'case'
      ))
      const defaultNode = context.node.children.find((node) => (
        node.element.kind === 'default'
      ))
      const valueType = Switch.normalizeValueType(context.element.valueType)
      const insertIndex = defaultNode == null
        ? context.node.children.length
        : context.node.children.indexOf(defaultNode)
      const primitive = SwitchValueType.getPrimitiveName(
        valueType,
        (unionTypeId) => Switch.findLiteralUnion(context.rootNode, unionTypeId),
      ) ?? 'string'
      const allowedValues = SwitchValueType.getAllowedLiterals(
        valueType,
        (unionTypeId) => Switch.findLiteralUnion(context.rootNode, unionTypeId),
      )?.map((value) => (
        primitive === 'number'
          ? { type: 'number' as const, value: Number(value) }
          : { type: 'string' as const, value: String(value) }
      )) ?? null

      const items: ActionMenuState.Item[] = [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({
              caseValueType: caseNodes.length > 0
                ? primitive
                : undefined,
              caseValues: caseNodes.map((node) => (
                node.element.kind === 'case' ? node.element.value.value : null
              )).filter((value): value is SwitchValueType.Literal => value != null),
              literalUnionOptions: Switch.getLiteralUnionOptions(context.rootNode, context.node.id),
            }),
          )
        }),
        action('Add case', () => {
          ElementDialog.openCreate(
            context.node.id,
            CaseElementDefinition.createSchema({
              valueType: primitive,
              allowedValues: allowedValues ?? undefined,
              reservedValues: caseNodes.map((node) => (
                node.element.kind === 'case' ? node.element.value : null
              )).filter((value): value is Case.Value => value != null),
            }),
            insertIndex,
          )
        }),
      ]

      if (defaultNode == null) {
        items.push(action('Use default', () => {
          TreeStore.addChild(context.node.id, DefaultDirective.create())
        }))
      }

      items.push(action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'))
      return items
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Switch.Element>
}

export default SwitchElementDefinition

