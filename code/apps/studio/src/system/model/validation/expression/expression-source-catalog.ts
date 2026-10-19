import FunctionDefinition from '@system/model/function/function-definition'
import FunctionScope from '@system/model/function/function-scope'
import TypeCatalog from '@system/model/type-system/type-catalog'
import TypeExpression from '@system/model/type-system/type-expression'
import SwitchValueType from '@system/model/directive/switch-value-type'
import type TreeNode from '@system/model/tree/tree-node'
import { ElementExpressionFields } from '@system/model/reference/fields'
import ValueTypeDefinition from '@system/model/type-system/value-type-definition'
import TagEventCatalog from '@system/model/view/tag-event-catalog'

namespace ExpressionSourceCatalog {
  export type Mode = 'expression' | 'action' | 'code'

  export type Source = {
    source: string
    mode: Mode
    label: string
    expectedTypeText?: string
    allowAwait?: boolean
    functionParameters?: readonly { name: string; typeText: string }[]
    eventType?: string
  }

  export type Result = {
    hasExpressionField: boolean
    sources: readonly Source[]
  }

  const jsonFields = ElementExpressionFields.verificationJson
  const expressionFields = ElementExpressionFields.verification

  const isObject = (value: unknown): value is Record<string, unknown> => (
    value != null && typeof value === 'object' && !Array.isArray(value)
  )

  const parseJson = (value: string): unknown => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const getTypeText = (
    rootNode: TreeNode.Node,
    expression: TypeExpression.Expression,
  ): string => TypeExpression.getTypeText(
    expression,
    (typeId) => TypeCatalog.resolveTypeScriptName(rootNode, typeId),
  )

  const getExpectedTypeText = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    path: readonly string[],
  ): string | undefined => {
    const key = path[0]
    const element = node.element as unknown as Record<string, unknown>
    const constantTypeSetting = element.typeSetting as Record<string, unknown> | undefined

    if (
      (element.kind === 'if' || element.kind === 'else-if' || element.kind === 'control-conditional')
      && key === 'condition'
    ) return 'boolean'

    if (element.kind === 'loop') {
      if (key === 'countSource') return 'number'
      if (key === 'collectionSource') return 'unknown[]'
    }

    if (element.kind === 'text' && key === 'source') return 'string'
    if (
      (element.kind === 'tag' || element.kind === 'component')
      && (key === 'refKey' || key === 'partialKey')
    ) return 'string'

    if (element.kind === 'promise' && key === 'source') {
      const resultType = element.resultType
      if (resultType == null) return 'Promise<void>'
      if (typeof resultType === 'object') {
        return `Promise<${ValueTypeDefinition.getTypeText(
          resultType as ValueTypeDefinition.Definition,
          (typeId) => TypeCatalog.resolveTypeScriptName(rootNode, typeId),
        )}>`
      }
    }

    if (
      (element.kind === 'state' || element.kind === 'variable' || element.kind === 'constant')
      && (key === 'initial' || ((element.kind === 'variable' || element.kind === 'constant') && key === 'source'))
      && (
        element.kind === 'constant'
          ? constantTypeSetting?.type === 'explicit'
          : element.valueType != null && typeof element.valueType === 'object'
      )
    ) {
      const valueType = element.kind === 'constant'
        ? (element.typeSetting as { valueType: TypeExpression.Expression }).valueType
        : element.valueType as TypeExpression.Expression
      const nullable = element.kind === 'constant'
        ? (element.typeSetting as { nullable: boolean }).nullable
        : element.nullable === true
      return `${getTypeText(rootNode, valueType)}${nullable ? ' | null' : ''}`
    }

    if (
      (element.kind === 'switch' || element.kind === 'control-switch')
      && key === 'source'
    ) {
      const valueType = SwitchValueType.parse(
        typeof element.valueType === 'string'
          ? element.valueType
          : JSON.stringify(element.valueType),
      ) ?? SwitchValueType.createFromLegacy(element.valueType)
      if (valueType.type === 'primitive') {
        return SwitchValueType.getTypeText(valueType)
      }

      const union = TypeCatalog.findUnion(
        rootNode,
        valueType.unionTypeId,
      )?.element.definition
      if (union?.type === 'literal') {
        return SwitchValueType.getTypeText(valueType, [{
          value: valueType.unionTypeId,
          label: '',
          valueType: union.valueType,
          values: union.values,
          title: '',
        }])
      }
    }

    if (element.kind === 'function-return' && key === 'source') {
      const owner = FunctionScope.findOwnerFunction(rootNode, node.id)
      if (owner != null) {
        const returnType = FunctionDefinition.getReturnType(rootNode, owner.element)
        return returnType == null
          ? undefined
          : `${getTypeText(rootNode, returnType.valueType)}${returnType.nullable ? ' | null' : ''}`
      }
    }

    if (
      node.element.kind === 'function'
      && node.element.implementation.mode === 'code'
      && path.at(-1) === 'source'
    ) {
      const returnType = FunctionDefinition.getReturnType(rootNode, node.element)
      return returnType == null
        ? 'void'
        : `${getTypeText(rootNode, returnType.valueType)}${returnType.nullable ? ' | null' : ''}`
    }

    return undefined
  }

  const getMode = (
    node: TreeNode.Node,
    value: Record<string, unknown>,
  ): Mode => (
    node.element.kind === 'function' && node.element.implementation.mode === 'code'
      ? 'code'
      : value.type === 'script' || node.element.kind === 'action'
      ? 'action'
      : 'expression'
  )

  const getAllowAwait = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    mode: Mode,
  ): boolean => {
    if (node.element.kind === 'effect' && mode === 'action') return true
    if (node.element.kind === 'tag' && mode === 'action') return true
    if (
      node.element.kind === 'function'
      && node.element.implementation.mode === 'code'
    ) return FunctionDefinition.getAsync(rootNode, node.element)
    if (
      mode !== 'action'
      && node.element.kind !== 'variable'
      && node.element.kind !== 'function-return'
    ) return false
    const owner = FunctionScope.findOwnerFunction(rootNode, node.id)
    return owner != null && FunctionDefinition.getAsync(rootNode, owner.element)
  }

  const getFunctionParameters = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    mode: Mode,
  ): readonly { name: string; typeText: string }[] | undefined => {
    if (mode !== 'code' || node.element.kind !== 'function') return undefined
    return FunctionDefinition.getParameters(rootNode, node.element).map((parameter) => ({
      name: parameter.id,
      typeText: getTypeText(rootNode, parameter.valueType)
        + (parameter.nullable ? ' | null' : ''),
    }))
  }

  export const collect = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): Result => {
    const sources: Source[] = []
    let hasExpressionField = false
    const visited = new Set<unknown>()

    const addSource = (
      source: string,
      path: readonly string[],
      mode: Mode,
      value: Record<string, unknown>,
      eventType?: string,
    ) => {
      sources.push({
        source,
        mode,
        label: path.join('.'),
        expectedTypeText: getExpectedTypeText(rootNode, node, path),
        allowAwait: getAllowAwait(rootNode, node, mode),
        functionParameters: getFunctionParameters(rootNode, node, mode),
        eventType,
      })
      if (value.type === 'formula' || value.type === 'script') {
        hasExpressionField = true
      }
    }

    const visit = (
      value: unknown,
      path: readonly string[],
      eventType?: string,
    ) => {
      const fieldKey = path[path.length - 1]
      if (fieldKey != null && expressionFields.has(fieldKey)) {
        hasExpressionField = true
      }
      if (value == null || typeof value === 'boolean' || typeof value === 'number') return

      if (typeof value === 'string') {
        const key = path[path.length - 1] ?? ''
        if (expressionFields.has(key)) hasExpressionField = true
        const parsed = jsonFields.has(key) ? parseJson(value) : null
        if (parsed != null) {
          visit(parsed, path, eventType)
        } else if (expressionFields.has(key)) {
          const mode = getMode(node, { type: node.element.kind === 'action' ? 'script' : 'formula' })
          addSource(
            value,
            path,
            mode,
            { type: mode === 'action' ? 'script' : 'formula' },
            eventType,
          )
        }
        return
      }

      if (visited.has(value)) return
      visited.add(value)

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, path, eventType))
        return
      }
      if (!isObject(value)) return

      if (value.type === 'formula' || value.type === 'script') {
        hasExpressionField = true
        const source = typeof value.source === 'string'
          ? value.source
          : typeof value.value === 'string'
            ? value.value
            : null
        if (source != null) addSource(source, path, getMode(node, value), value, eventType)
      }

      const childEventType = node.element.kind === 'tag'
        && value.type === 'event'
        && typeof value.name === 'string'
        ? TagEventCatalog.getEventType(value.name, node.element.tagName)
        : eventType

      Object.entries(value).forEach(([key, child]) => {
        if (key === 'id' || key === 'typeId' || key === 'referenceId') return
        if (
          (value.type === 'formula' || value.type === 'script')
          && (key === 'source' || key === 'value')
        ) return
        visit(child, [...path, key], childEventType)
      })
    }

    visit(node.element, [])
    return { hasExpressionField, sources }
  }

  export const isVerificationCandidate = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): boolean => (
    node.element.kind === 'function-procedure'
    || collect(rootNode, node).hasExpressionField
  )
}

export default ExpressionSourceCatalog
