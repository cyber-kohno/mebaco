namespace FormulaContext {
  export type SystemValue = Record<string, unknown> & {
    getRef: (key: string) => HTMLElement | null
    afterRender: (callback: () => void) => () => void
  }

  export type Value = {
    $args: Record<string, unknown>
    $state: Record<string, unknown>
    $param: Record<string, unknown>
    $props: Record<string, unknown>
    $var: Record<string, unknown>
    $function: Record<string, unknown>
    $system: SystemValue
    $event?: Event
  }

  export type CreateOptions = Partial<Value>

  const emptySystem: SystemValue = {
    getRef: () => null,
    afterRender: () => {
      throw new Error('$system.afterRender() is not available in this runtime context.')
    },
  }

  export const create = (
    options: CreateOptions = {},
  ): Value => ({
    $args: options.$args ?? {},
    $state: options.$state ?? {},
    $param: options.$param ?? {},
    $props: options.$props ?? {},
    $var: options.$var ?? {},
    $function: options.$function ?? {},
    $system: options.$system ?? emptySystem,
    $event: options.$event,
  })

  export const createEmpty = (): Value => create()
}

export default FormulaContext
