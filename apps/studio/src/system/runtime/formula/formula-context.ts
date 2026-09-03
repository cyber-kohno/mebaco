import type ScriptError from '../script/script-error'
import RuntimeLog from '../log/runtime-log'

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

  export type Value = {
    $args: Record<string, unknown>
    $launch: Record<string, unknown>
    $state: Record<string, unknown>
    $param: Record<string, unknown>
    $local: Record<string, unknown>
    $props: Record<string, unknown>
    $var: Record<string, unknown>
    $fn: Record<string, unknown>
    $log: RuntimeLog.Value
    $resource: Readonly<Record<string, unknown>>
    $system: SystemValue
    $transition: TransitionValue
    $event?: Event
    requestTransition: TransitionRequest
    reportError?: ErrorReporter
    requestRender?: () => void
    logSession: RuntimeLog.Session
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

  export const create = (
    options: CreateOptions = {},
  ): Value => {
    const logSession = options.logSession ?? RuntimeLog.noOutputSession
    return {
      $args: options.$args ?? {},
      $launch: options.$launch ?? {},
      $state: options.$state ?? {},
      $param: options.$param ?? {},
      $local: options.$local ?? {},
      $props: options.$props ?? {},
      $var: options.$var ?? {},
      $fn: options.$fn ?? {},
      $log: options.$log ?? logSession.forNode(0),
      $resource: options.$resource ?? Object.freeze(Object.create(null)) as Readonly<Record<string, unknown>>,
      $system: options.$system ?? emptySystem,
      $transition: options.$transition ?? emptyTransition,
      $event: options.$event,
      requestTransition: options.requestTransition ?? unavailableTransition,
      reportError: options.reportError,
      requestRender: options.requestRender,
      logSession,
    }
  }

  export const forNode = (
    context: Value,
    nodeId: number,
  ): Value => create({
    ...context,
    $log: context.logSession.forNode(nodeId),
  })

  export const createEmpty = (): Value => create()
}

export default FormulaContext
