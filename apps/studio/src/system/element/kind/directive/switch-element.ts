import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import CaseElement from './case-element'
import DefaultElement from './default-element'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import SwitchValueType from './switch-value-type'
import TypeCatalog from '../type/type-catalog'
import UnionDefinition from '../type/union-definition'
import type TreeNode from '../../../tree/tree-node'

namespace SwitchElement {
  export type Kind = 'switch'
  export type ValueType = SwitchValueType.Definition

  export type Element = {
    kind: Kind
    valueType: ValueType
    source: string
  }

  export const create = (
    valueType: ValueType,
    source: string,
  ): Element => ({
    kind: 'switch',
    valueType,
    source,
  })

  export type CreateSchemaOptions = {
    caseValueType?: SwitchValueType.PrimitiveName
    literalUnionOptions?: readonly SwitchValueType.LiteralUnionOption[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Switch',
    updateTitle: 'Update Switch',
    fields: [
      {
        type: 'switchValueType',
        key: 'valueType',
        label: 'Value Type',
        readOnlyOnUpdate: true,
        defaultValue: SwitchValueType.stringify(SwitchValueType.createPrimitive()),
        literalUnionOptions: options.literalUnionOptions ?? [],
        caseValueType: options.caseValueType,
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
    createPreview: () => create(SwitchValueType.createPrimitive(), '...'),
    getInitialValues: (element) => ({
      valueType: SwitchValueType.stringify(normalizeValueType(element.valueType)),
      source: element.source,
    }),
    create: (values) => create(
      SwitchValueType.parse(values.valueType) ?? SwitchValueType.createPrimitive(),
      values.source,
    ),
    update: (element, values) => ({
      ...element,
      valueType: SwitchValueType.parse(values.valueType) ?? SwitchValueType.createPrimitive(),
      source: values.source,
    }),
  })

  export const normalizeValueType = (
    valueType: unknown,
  ): ValueType => (
    SwitchValueType.parse(typeof valueType === 'string' ? valueType : JSON.stringify(valueType)) 
    ?? SwitchValueType.createFromLegacy(valueType)
  )

  export const getLiteralUnionOptions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): SwitchValueType.LiteralUnionOption[] => (
    TypeCatalog.collectVisibleUnions(rootNode, targetNodeId)
      .filter((entry) => entry.element.definition.type === 'literal')
      .map((entry) => {
        const definition = entry.element.definition as UnionDefinition.Literal
        return {
          value: entry.element.typeId,
          label: entry.element.id,
          valueType: definition.valueType,
          values: definition.values,
          title: UnionDefinition.getTypeScriptType(definition, () => undefined).replaceAll('"', "'"),
        }
      })
  )

  export const findLiteralUnion = (
    rootNode: TreeNode.Node,
    unionTypeId: string,
  ): UnionDefinition.Literal | undefined => {
    const union = TypeCatalog.findUnion(rootNode, unionTypeId)?.element.definition
    return union?.type === 'literal' ? union : undefined
  }

  const getPreview = (element: Element): string => {
    const source = element.source.replace(/\s*\r?\n\s*/g, ' ')
    const preview = source.length > 28 ? `${source.slice(0, 28)}...` : source
    return `${SwitchValueType.getLabel(normalizeValueType(element.valueType))}: ${preview}`
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
      const valueType = normalizeValueType(context.element.valueType)
      const insertIndex = defaultNode == null
        ? context.node.children.length
        : context.node.children.indexOf(defaultNode)
      const primitive = SwitchValueType.getPrimitiveName(
        valueType,
        (unionTypeId) => findLiteralUnion(context.rootNode, unionTypeId),
      ) ?? 'string'
      const allowedValues = SwitchValueType.getAllowedLiterals(
        valueType,
        (unionTypeId) => findLiteralUnion(context.rootNode, unionTypeId),
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
              literalUnionOptions: getLiteralUnionOptions(context.rootNode, context.node.id),
            }),
          )
        }),
        action('Add Case', () => {
          ElementDialog.openCreate(
            context.node.id,
            CaseElement.createSchema({
              valueType: primitive,
              allowedValues: allowedValues ?? undefined,
              reservedValues: caseNodes.map((node) => (
                node.element.kind === 'case' ? node.element.value : null
              )).filter((value): value is CaseElement.Value => value != null),
            }),
            insertIndex,
          )
        }),
      ]

      if (defaultNode == null) {
        items.push(action('Use Default', () => {
          TreeStore.addChild(context.node.id, DefaultElement.create())
        }))
      }

      items.push(action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'))
      return items
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default SwitchElement

