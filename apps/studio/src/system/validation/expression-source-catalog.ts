import FunctionDefinition from '../element/kind/function/function-definition'
import FunctionScope from '../element/kind/function/function-scope'
import TypeCatalog from '../element/kind/type/type-catalog'
import TypeExpression from '../element/kind/type/type-expression'
import SwitchValueType from '../element/kind/directive/switch-value-type'
import type TreeNode from '../tree/tree-node'

namespace ExpressionSourceCatalog {
  export type Mode = 'expression' | 'action'

  export type Source = {
    source: string
    mode: Mode
    label: string
    expectedTypeText?: string
    allowAwait?: boolean
  }

  export type Result = {
    hasExpressionField: boolean
    sources: readonly Source[]
  }

  const jsonFields = new Set([
    'argumentBindings',
    'attributes',
    'condition',
    'definition',
    'initial',
    'propBindings',
    'properties',
    'refKey',
    'rules',
    'source',
    'styles',
  ])

  const expressionFields = new Set([
    'collectionSource',
    'condition',
    'countSource',
    'initial',
    'propBindings',
    'refKey',
    'rules',
    'source',
    'styles',
    'attributes',
    'argumentBindings',
  ])

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
    (typeId) => TypeCatalog.resolveTypeName(rootNode, typeId),
  )

  const getExpectedTypeText = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    path: readonly string[],
  ): string | undefined => {
    const key = path[0]
    const element = node.element as unknown as Record<string, unknown>

    if (
      (element.kind === 'if' || element.kind === 'else-if' || element.kind === 'control-conditional')
      && key === 'condition'
    ) return 'boolean'

    if (element.kind === 'loop') {
      if (key === 'countSource') return 'number'
      if (key === 'collectionSource') return 'unknown[]'
    }

    if (element.kind === 'text' && key === 'source') return 'string'
    if (element.kind === 'tag' && key === 'refKey') return 'string'

    if (
      (element.kind === 'state' || element.kind === 'variable')
      && key === 'initial'
      && element.valueType != null
      && typeof element.valueType === 'object'
    ) {
      return `${getTypeText(rootNode, element.valueType as TypeExpression.Expression)}${element.nullable === true ? ' | null' : ''}`
    }

    if (
      (element.kind === 'switch' || element.kind === 'control-switch')
      && key === 'source'
      && typeof element.valueType === 'string'
    ) {
      const valueType = SwitchValueType.parse(element.valueType as string)
      if (valueType?.type === 'primitive') return valueType.primitive
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

    return undefined
  }

  const getMode = (
    node: TreeNode.Node,
    value: Record<string, unknown>,
  ): Mode => (
    value.type === 'script' || node.element.kind === 'action'
      ? 'action'
      : 'expression'
  )

  const getAllowAwait = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    mode: Mode,
  ): boolean => {
    if (mode !== 'action') return false
    const owner = FunctionScope.findOwnerFunction(rootNode, node.id)
    return owner != null && FunctionDefinition.getAsync(rootNode, owner.element)
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
    ) => {
      sources.push({
        source,
        mode,
        label: path.join('.'),
        expectedTypeText: getExpectedTypeText(rootNode, node, path),
        allowAwait: getAllowAwait(rootNode, node, mode),
      })
      if (value.type === 'formula' || value.type === 'script') {
        hasExpressionField = true
      }
    }

    const visit = (value: unknown, path: readonly string[]) => {
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
          visit(parsed, path)
        } else if (expressionFields.has(key)) {
          const mode: Mode = node.element.kind === 'action' ? 'action' : 'expression'
          addSource(value, path, mode, { type: mode === 'action' ? 'script' : 'formula' })
        }
        return
      }

      if (visited.has(value)) return
      visited.add(value)

      if (Array.isArray(value)) {
        value.forEach((item) => visit(item, path))
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
        if (source != null) addSource(source, path, getMode(node, value), value)
      }

      Object.entries(value).forEach(([key, child]) => {
        if (key === 'id' || key === 'typeId' || key === 'referenceId') return
        if (
          (value.type === 'formula' || value.type === 'script')
          && (key === 'source' || key === 'value')
        ) return
        visit(child, [...path, key])
      })
    }

    visit(node.element, [])
    return { hasExpressionField, sources }
  }
}

export default ExpressionSourceCatalog
