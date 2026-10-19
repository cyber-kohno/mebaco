import type ScriptError from '../script/script-error'
import RuntimeLog from '../log/runtime-log'
import ExecutionPolicy from '../execution-policy'
import StateView from '../state/state-view'
import VariableFrame from '../variable/variable-frame'

namespace FormulaContext {
  export type ErrorReporter = (
    nodeId: number,
    error: ScriptError.Value,
  ) => void

  export type TransitionValue = Readonly<Record<
    string,
    (launchValues?: Readonly<Record<string, unknown>>) => void
  >>

  export type TransitionRequest = (
    appDefinitionId: string,
    launchValues: Readonly<Record<string, unknown>>,
  ) => void

  export type SystemValue = Record<string, unknown> & {
    getRef: (key: string) => HTMLElement | null
    afterRender: (callback: () => void) => () => void
  }

  export type Invalidate = (partialKey: string) => void

  export type EffectValue = Readonly<{
    signal: AbortSignal
  }>

  export type Value = {
    $args: Record<string, unknown>
    $launch: Record<string, unknown>
    $state: Record<string, unknown>
    $const: Readonly<Record<string, unknown>>
    $param: Record<string, unknown>
    $local: Record<string, unknown>
    $props: Record<string, unknown>
    $var: Record<string, unknown>
    $fn: Record<string, unknown>
    $log: RuntimeLog.Value
    $resource: Readonly<Record<string, unknown>>
    $storage: Readonly<Record<string, unknown>>
    $system: SystemValue
    $invalidate: Invalidate
    $transition: TransitionValue
    $event?: Event
    $effect: EffectValue
    requestTransition: TransitionRequest
    reportError?: ErrorReporter
    requestRender?: () => void
    logSession: RuntimeLog.Session
    executionPolicy: ExecutionPolicy.Value
  }

  export type CreateOptions = Partial<Value>

  const emptySystem: SystemValue = {
    getRef: () => null,
    afterRender: () => {
      throw new Error('$system.afterRender() is not available in this runtime context.')
    },
  }

  const emptyTransition = Object.freeze(Object.create(null)) as TransitionValue
  const unavailableTransition: TransitionRequest = () => {
    throw new Error('App transition is not available in this runtime context.')
  }
  const unavailableInvalidate: Invalidate = () => {
    throw new Error('$invalidate() is not available in this runtime context.')
  }
  const defaultEffect = Object.freeze({
    signal: new AbortController().signal,
  })

  export const create = (
    options: CreateOptions = {},
  ): Value => {
    const logSession = options.logSession ?? RuntimeLog.noOutputSession
    const executionPolicy = options.executionPolicy ?? ExecutionPolicy.mutable
    return {
      $args: options.$args ?? {},
      $launch: options.$launch ?? {},
      $state: StateView.create(options.$state ?? {}, executionPolicy),
      $const: options.$const ?? Object.freeze(Object.create(null)) as Readonly<Record<string, unknown>>,
      $param: options.$param ?? {},
      $local: options.$local ?? {},
      $props: options.$props ?? {},
      $var: options.$var ?? {},
      $fn: options.$fn ?? {},
      $log: options.$log ?? logSession.forNode(0),
      $resource: options.$resource ?? Object.freeze(Object.create(null)) as Readonly<Record<string, unknown>>,
      $storage: options.$storage ?? Object.freeze(Object.create(null)) as Readonly<Record<string, unknown>>,
      $system: options.$system ?? emptySystem,
      $invalidate: options.$invalidate ?? unavailableInvalidate,
      $transition: options.$transition ?? emptyTransition,
      $event: options.$event,
      $effect: options.$effect ?? defaultEffect,
      requestTransition: options.requestTransition ?? unavailableTransition,
      reportError: options.reportError,
      requestRender: options.requestRender,
      logSession,
      executionPolicy,
    }
  }

  export const forNode = (
    context: Value,
    nodeId: number,
  ): Value => ({
    ...context,
    $log: context.logSession.forNode(nodeId),
    executionPolicy: ExecutionPolicy.forNode(context.executionPolicy, nodeId),
  })

  export const withExecutionPolicy = (
    context: Value,
    executionPolicy: ExecutionPolicy.Value,
  ): Value => create({
    ...context,
    $args: StateView.rebindNamespace(context.$args, executionPolicy),
    $props: StateView.rebindNamespace(context.$props, executionPolicy),
    $var: VariableFrame.rebindStateViews(context.$var, executionPolicy),
    $local: StateView.rebindNamespace(context.$local, executionPolicy),
    executionPolicy,
  })

  export const createEmpty = (): Value => create()
}

export default FormulaContext
