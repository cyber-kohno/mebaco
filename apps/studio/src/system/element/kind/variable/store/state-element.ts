import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import StateTreeLabel from './StateTreeLabel.svelte'
import VariableDefinition from '../variable-definition'
import ValueSource from '../../../../ui/input/value-source'
import TypeCatalog from '../../type/type-catalog'
import TypeExpression from '../../type/type-expression'
import ValueTypeDefinition from '../../type/value-type-definition'
import TypeDefaultLabel from '../../type/type-default-label'
import StateScope from './state-scope'
import TreeStore from '../../../../store/tree-store'
import ElementDeletionController from '../../../deletion/element-deletion-controller'

namespace StateElement {
  export type Kind = 'state'

  export type Element = VariableDefinition.Definition & {
    kind: Kind
  }

  export const create = (
    definition: VariableDefinition.Definition,
  ): Element => ({
    kind: 'state',
    ...definition,
  })

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create State',
    updateTitle: 'Update State',
    fields: [
      {
        type: 'text',
        key: 'id',
        label: 'Id',
        width: 'id',
        required: true,
        charset: 'jsIdentifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'valueType',
        key: 'valueType',
        label: 'Value Type',
        required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
        resetWhenChanged: ['initial'],
      },
      {
        type: 'valueSource',
        key: 'initial',
        label: 'Initial',
        defaultValue: ValueSource.stringify({ type: 'default' }),
        maxFormulaLength: 4000,
        valueTypeKey: 'valueType',
        arrayDepthKey: 'valueType',
        valueTypeDefinitionKey: 'valueType',
        getLiteralOptions: (values) => {
          const definition = ValueTypeDefinition.parse(values.valueType)
          const base = definition == null
            ? null
            : TypeExpression.unwrapArray(definition.valueType).base
          if (base?.type !== 'named') return []
          const option = options.namedTypeOptions?.find((candidate) => candidate.value === base.namedTypeId)
          return option?.literalValues?.map((value) => ({
            value: String(value),
            label: String(value),
          })) ?? []
        },
        getExpectedTypeText: (values) => {
          const definition = parseValueType(values)
          return ValueTypeDefinition.getTypeText(
            definition,
            (id) => (
              TypeCatalog.toTypeScriptName(
                options.referenceOptions?.find((option) => option.value === id)?.label
                ?? options.namedTypeOptions?.find((option) => option.value === id)?.name
                ?? options.namedTypeOptions?.find((option) => option.value === id)?.label
                ?? 'MissingType',
              )
            ),
          )
        },
        getTypeDefaultLabel: (values) => {
          const definition = ValueTypeDefinition.parse(values.valueType)
          return definition == null
            ? undefined
            : TypeDefaultLabel.getFromOptions(
                definition,
                options.referenceOptions ?? [],
                options.namedTypeOptions ?? [],
              )
        },
        visibleWhenValid: 'valueType',
      },
    ],
    createPreview: () => create({
      id: '...',
      valueType: TypeExpression.createPrimitive(),
      nullable: false,
      initial: VariableDefinition.createDefaultInitial(),
    }),
    getInitialValues: (element) => {
      const { base, depth } = TypeExpression.unwrapArray(element.valueType)
      return {
        id: element.id,
        valueType: ValueTypeDefinition.stringify(ValueTypeDefinition.create(
          TypeExpression.wrapArray(base, depth),
          element.nullable,
        )),
        initial: ValueSource.stringify(element.initial),
      }
    },
    create: (values) => create({
      id: values.id,
      valueType: parseValueType(values).valueType,
      nullable: parseValueType(values).nullable,
      initial: createInitialValue(values),
    }),
    update: (element, values) => ({
      ...element,
      id: values.id,
      valueType: parseValueType(values).valueType,
      nullable: parseValueType(values).nullable,
      initial: createInitialValue(values),
    }),
  })

  const parseValueType = (
    values: Readonly<Record<string, string>>,
  ): ValueTypeDefinition.Definition => (
    ValueTypeDefinition.parse(values.valueType) ?? ValueTypeDefinition.create()
  )

  const createInitialValue = (
    values: Record<string, string>,
  ): VariableDefinition.InitialValue => {
    return ValueSource.parse(values.initial) ?? VariableDefinition.createDefaultInitial()
  }

  export const definition = {
    kind: 'state',
    treeLabel: {
      type: 'component',
      Component: StateTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = [
        ...(context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Element => element.kind === 'state')
        .map((element) => element.id),
        ...StateScope.getAncestorStateIds(context.rootNode, context.parentNode?.id ?? context.node.id)
          .filter((id) => id !== context.element.id),
      ]
      const referenceOptions = TypeCatalog.getReferenceOptions(
        context.rootNode,
        context.node.id,
      )
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(
        context.rootNode,
        context.node.id,
      )

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
          )
        }),
        action('Delete', () => {
          void ElementDeletionController.requestDelete({
            rootNode: context.rootNode,
            node: context.node,
            policy: {
              label: `State '${context.element.id}'`,
              structuralReferences: 'ignore',
              expressionReferences: 'confirm',
            },
            deleteNode: () => TreeStore.removeNode(context.node.id),
          })
        }, 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default StateElement
