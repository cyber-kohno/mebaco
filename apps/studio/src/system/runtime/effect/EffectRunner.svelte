<script lang="ts">
  import { onMount, tick } from 'svelte'
  import type EffectElement from '../../element/kind/variable/store/effect-element'
  import type FormulaContext from '../formula/formula-context'
  import FormulaContextValue from '../formula/formula-context'
  import FormulaEvaluator from '../formula/formula-evaluator'
  import ActionEvaluator from '../action/action-evaluator'
  import ScriptError from '../script/script-error'
  import type ScriptErrorValue from '../script/script-error'
  import type TreeNode from '../../tree/tree-node'
  import type RuntimeStateDependency from '../runtime-state-dependency'
  import type EffectRuntimeGuard from './effect-runtime-guard'

  type Props = {
    node: TreeNode.Node & { element: EffectElement.Element }
    formulaContext: FormulaContext.Value
    renderRevision: number
    trackStateDependencies: RuntimeStateDependency.Tracker
    setActionError: (nodeId: number, error: ScriptErrorValue.Value | null) => void
    guard: EffectRuntimeGuard.Guard
  }

  let {
    node,
    formulaContext,
    renderRevision,
    trackStateDependencies,
    setActionError,
    guard,
  }: Props = $props()

  let mounted = $state(false)
  let destroyed = false
  let mountRequested = false
  let scheduled = false
  let running = false
  let pending = false
  let blocked = false
  let generation = 0
  let controller: AbortController | null = null
  let lastValues: readonly unknown[] | null = null

  const dependencyResult = $derived.by(() => {
    renderRevision
    if (node.element.trigger !== 'dependencies') {
      return { ok: true as const, values: [] as unknown[] }
    }
    return trackStateDependencies(() => {
      const values: unknown[] = []
      for (const dependency of node.element.dependencies) {
        const result = FormulaEvaluator.evaluateExpression(
          dependency.source,
          FormulaContextValue.forNode(formulaContext, node.id),
        )
        if (!result.ok) return { ok: false as const, error: result.error }
        values.push(result.value)
      }
      return { ok: true as const, values }
    })
  })

  const equalValues = (
    left: readonly unknown[],
    right: readonly unknown[],
  ): boolean => left.length === right.length
    && left.every((value, index) => Object.is(value, right[index]))

  const guardedState = (
    state: Record<string, unknown>,
    signal: AbortSignal,
  ): Record<string, unknown> => new Proxy(state, {
    get: (target, property, receiver) => Reflect.get(target, property, receiver),
    set: (target, property, value, receiver) => (
      signal.aborted || Reflect.set(target, property, value, receiver)
    ),
    deleteProperty: (target, property) => (
      signal.aborted || Reflect.deleteProperty(target, property)
    ),
  })

  const execute = async () => {
    if (destroyed || blocked || running) return
    const guardError = guard.allow(node.id)
    if (guardError != null) {
      blocked = true
      setActionError(node.id, ScriptError.create('runtime', guardError))
      return
    }

    running = true
    pending = false
    const runGeneration = ++generation
    controller = new AbortController()
    const signal = controller.signal
    const context = FormulaContextValue.forNode(FormulaContextValue.create({
      ...formulaContext,
      $state: guardedState(formulaContext.$state, signal),
      $effect: { signal },
    }), node.id)
    const result = await ActionEvaluator.executeScriptAsync(
      node.element.action.source,
      context,
    )
    const stale = destroyed || signal.aborted || runGeneration !== generation

    running = false
    controller = null
    if (!stale) {
      setActionError(node.id, result.ok ? null : result.error)
      if (result.ok) context.requestRender?.()
    }
    if (pending && !destroyed && !blocked) requestRun()
  }

  const requestRun = () => {
    if (destroyed || blocked) return
    if (running) {
      pending = true
      generation += 1
      controller?.abort()
      return
    }
    if (scheduled) return
    scheduled = true
    queueMicrotask(async () => {
      await tick()
      scheduled = false
      if (!destroyed) void execute()
    })
  }

  $effect(() => {
    if (!mounted || blocked) return
    if (node.element.trigger === 'mount') {
      if (!mountRequested) {
        mountRequested = true
        requestRun()
      }
      return
    }

    const result = dependencyResult
    if (!result.ok) {
      setActionError(node.id, result.error)
      return
    }
    setActionError(node.id, null)
    if (lastValues == null || !equalValues(lastValues, result.values)) {
      lastValues = [...result.values]
      requestRun()
    }
  })

  onMount(() => {
    void tick().then(() => {
      if (!destroyed) mounted = true
    })
    return () => {
      destroyed = true
      generation += 1
      controller?.abort()
      setActionError(node.id, null)
    }
  })
</script>
