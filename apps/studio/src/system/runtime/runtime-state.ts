import type StateElement from '../element/kind/variable/store/state-element'
import TypeCatalog from '../element/kind/type/type-catalog'
import TypeExpression from '../element/kind/type/type-expression'
import FormulaContext from './formula/formula-context'
import FormulaEvaluator from './formula/formula-evaluator'
import RuntimeStateDependency from './runtime-state-dependency'
import type RuntimeTree from './runtime-tree'
import type TreeNode from '../tree/tree-node'

namespace RuntimeState {
  export type WriteHandler = (
    dependencies: readonly RuntimeStateDependency.Dependency[],
  ) => void

  export type Options = {
    onWrite?: WriteHandler
  }

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
    if (depth > 0 || base.type === 'reference' || base.type === 'object') {
      if (value.length === 0) return getDefaultValue(state, projectNode)
      try {
        return JSON.parse(value)
      } catch {
        return getDefaultValue(state, projectNode)
      }
    }

    if (base.type === 'named') {
      const union = TypeCatalog.findUnion(projectNode, base.namedTypeId)
      if (union?.element.definition.type !== 'literal' || value.length === 0) {
        return getDefaultValue(state, projectNode)
      }
      return union.element.definition.valueType === 'number'
        ? Number(value)
        : value
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
    $launch: Record<string, unknown>,
    $const: Readonly<Record<string, unknown>>,
  ): unknown => {
    switch (state.initial.type) {
      case 'literal':
        return coerceLiteralValue(state, state.initial.value, projectNode)
      case 'formula': {
        const result = FormulaEvaluator.evaluateExpression(
          state.initial.source,
          FormulaContext.create({ $state, $launch, $const }),
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

  export const createPersistentInitialValue = (
    item: StateElement.Element,
    projectNode: RuntimeTree.AppRuntime['projectNode'],
  ): unknown => item.initial.type === 'literal'
    ? coerceLiteralValue(item, item.initial.value, projectNode)
    : getDefaultValue(item, projectNode)

  const notifyWrite = (
    sourceId: string,
    property: PropertyKey,
    options: Options,
  ) => {
    const dependency = RuntimeStateDependency.createDependency(sourceId, property)
    const allDependency = RuntimeStateDependency.createDependency(sourceId, '*')
    const dependencies = [dependency, allDependency]
      .filter((item): item is RuntimeStateDependency.Dependency => item != null)
    if (dependencies.length > 0) options.onWrite?.(dependencies)
  }

  const createRootState = (
    localState: Record<string, unknown>,
    options: Options,
  ): Record<string, unknown> => {
    const sourceId = RuntimeStateDependency.createSourceId()
    return new Proxy(localState, {
      get: (target, property, receiver) => {
        RuntimeStateDependency.trackRead(sourceId, property)
        return Reflect.get(target, property, receiver)
      },
      set: (target, property, value, receiver) => {
        const previous = Reflect.get(target, property, receiver)
        const changed = !Object.is(previous, value)
        const ok = Reflect.set(target, property, value, receiver)
        if (ok && changed) notifyWrite(sourceId, property, options)
        return ok
      },
      has: (target, property) => {
        RuntimeStateDependency.trackRead(sourceId, property)
        return Reflect.has(target, property)
      },
      ownKeys: (target) => {
        RuntimeStateDependency.trackRead(sourceId, '*')
        return Reflect.ownKeys(target)
      },
      deleteProperty: (target, property) => {
        const existed = Reflect.has(target, property)
        const ok = Reflect.deleteProperty(target, property)
        if (ok && existed) notifyWrite(sourceId, property, options)
        return ok
      },
    })
  }

  const createLayeredState = (
    parentState: Record<string, unknown>,
    localState: Record<string, unknown>,
    options: Options,
  ): Record<string, unknown> => {
    const sourceId = RuntimeStateDependency.createSourceId()
    return new Proxy(localState, {
    get: (target, property, receiver) => {
      if (Reflect.has(target, property)) {
        RuntimeStateDependency.trackRead(sourceId, property)
        return Reflect.get(target, property, receiver)
      }
      return Reflect.get(parentState, property)
    },
    set: (target, property, value, receiver) => {
      if (Reflect.has(target, property) || !Reflect.has(parentState, property)) {
        const previous = Reflect.get(target, property, receiver)
        const changed = !Object.is(previous, value)
        const ok = Reflect.set(target, property, value, receiver)
        if (ok && changed) notifyWrite(sourceId, property, options)
        return ok
      }
      return Reflect.set(parentState, property, value)
    },
    has: (target, property) => {
      if (Reflect.has(target, property)) {
        RuntimeStateDependency.trackRead(sourceId, property)
        return true
      }
      return Reflect.has(parentState, property)
    },
    ownKeys: (target) => {
      RuntimeStateDependency.trackRead(sourceId, '*')
      return [...new Set([
        ...Reflect.ownKeys(parentState),
        ...Reflect.ownKeys(target),
      ])]
    },
    getOwnPropertyDescriptor: (target, property) => (
      Reflect.getOwnPropertyDescriptor(target, property)
      ?? Reflect.getOwnPropertyDescriptor(parentState, property)
    ),
    deleteProperty: (target, property) => {
      if (!Reflect.has(target, property)) return true
      const ok = Reflect.deleteProperty(target, property)
      if (ok) notifyWrite(sourceId, property, options)
      return ok
    },
  })
  }

  export const createComponentState = (
    projectNode: RuntimeTree.AppRuntime['projectNode'],
    parentState: Record<string, unknown>,
    stateNodes: readonly TreeNode.Node[],
    launchValues: Record<string, unknown> = {},
    $const: Readonly<Record<string, unknown>> = {},
    options: Options = {},
  ): Record<string, unknown> => {
    const localState: Record<string, unknown> = {}
    const state = createLayeredState(parentState, localState, options)

    stateNodes.forEach((node) => {
      if (node.element.kind !== 'state') return
      localState[node.element.id] = getDefaultValue(node.element, projectNode)
    })

    stateNodes.forEach((node) => {
      if (node.element.kind !== 'state') return
      localState[node.element.id] = evaluateInitialValue(
        node.element,
        state,
        projectNode,
        launchValues,
        $const,
      )
    })

    return state
  }

  export const createState = (
    runtime: RuntimeTree.AppRuntime,
    launchValues: Record<string, unknown> = {},
    $const: Readonly<Record<string, unknown>> = {},
    options: Options = {},
  ): Record<string, unknown> => {
    const stateValues: Record<string, unknown> = {}
    const $state = createRootState(stateValues, options)

    runtime.stateNodes.forEach((node) => {
      if (node.element.kind !== 'state') return
      stateValues[node.element.id] = getDefaultValue(node.element, runtime.projectNode)
    })

    runtime.stateNodes.forEach((node) => {
      if (node.element.kind !== 'state') return
      stateValues[node.element.id] = evaluateInitialValue(
        node.element,
        $state,
        runtime.projectNode,
        launchValues,
        $const,
      )
    })

    if (import.meta.env.DEV) {
      console.debug('[Mebaco runtime] $state', { ...$state })
    }

    return $state
  }
}

export default RuntimeState
