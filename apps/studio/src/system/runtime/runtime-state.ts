import type StateElement from '../element/kind/variable/store/state-element'
import TypeCatalog from '../element/kind/type/type-catalog'
import TypeExpression from '../element/kind/type/type-expression'
import FormulaContext from './formula/formula-context'
import FormulaEvaluator from './formula/formula-evaluator'
import type RuntimeTree from './runtime-tree'

namespace RuntimeState {
  const getDefaultScalarValue = (
    state: StateElement.Element,
    projectNode: RuntimeTree.AppRuntime['projectNode'],
  ): unknown => {
    const base = TypeExpression.unwrapArray(state.valueType).base
    switch (base.type) {
      case 'string':
        return base.literals?.[0] ?? ''
      case 'number':
        return base.literals?.[0] ?? 0
      case 'boolean':
        return false
      case 'object':
        return {}
      case 'reference':
        return TypeCatalog.createDefaultObject(projectNode, base.objectTypeIds[0] ?? '')
      case 'named':
        return TypeCatalog.createDefaultNamedType(projectNode, base.namedTypeId)
    }
  }

  const getDefaultValue = (
    state: StateElement.Element,
    projectNode: RuntimeTree.AppRuntime['projectNode'],
  ): unknown => (
    state.nullable
      ? null
      : TypeExpression.unwrapArray(state.valueType).depth > 0
      ? []
      : getDefaultScalarValue(state, projectNode)
  )

  const coerceLiteralValue = (
    state: StateElement.Element,
    value: string,
    projectNode: RuntimeTree.AppRuntime['projectNode'],
  ): unknown => {
    const { base, depth } = TypeExpression.unwrapArray(state.valueType)
    if (depth > 0 || base.type === 'reference' || base.type === 'object' || base.type === 'named') {
      if (value.length === 0) return getDefaultValue(state, projectNode)
      try {
        return JSON.parse(value)
      } catch {
        return getDefaultValue(state, projectNode)
      }
    }

    switch (base.type) {
      case 'string':
        return value
      case 'number':
        return Number(value)
      case 'boolean':
        return value === 'true'
    }
  }

  const evaluateInitialValue = (
    state: StateElement.Element,
    $state: Record<string, unknown>,
    projectNode: RuntimeTree.AppRuntime['projectNode'],
  ): unknown => {
    switch (state.initial.type) {
      case 'literal':
        return coerceLiteralValue(state, state.initial.value, projectNode)
      case 'formula': {
        const result = FormulaEvaluator.evaluateExpression(
          state.initial.source,
          FormulaContext.create({ $state }),
        )

        if (result.ok) return result.value

        if (import.meta.env.DEV) {
          console.warn(
            `[Mebaco runtime] Failed to initialize state "${state.id}".`,
            result.message,
          )
        }
        return getDefaultValue(state, projectNode)
      }
      case 'default':
        return getDefaultValue(state, projectNode)
    }
  }

  export const createState = (
    runtime: RuntimeTree.AppRuntime,
  ): Record<string, unknown> => {
    const $state: Record<string, unknown> = {}

    runtime.stateNodes.forEach((node) => {
      if (node.element.kind !== 'state') return
      $state[node.element.id] = getDefaultValue(node.element, runtime.projectNode)
    })

    runtime.stateNodes.forEach((node) => {
      if (node.element.kind !== 'state') return
      $state[node.element.id] = evaluateInitialValue(
        node.element,
        $state,
        runtime.projectNode,
      )
    })

    if (import.meta.env.DEV) {
      console.debug('[Mebaco runtime] $state', { ...$state })
    }

    return $state
  }
}

export default RuntimeState
