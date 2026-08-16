namespace FormulaContext {
  export type Value = {
    $args: Record<string, unknown>
    $state: Record<string, unknown>
    $param: Record<string, unknown>
    $props: Record<string, unknown>
    $var: Record<string, unknown>
    $function: Record<string, unknown>
    $system: Record<string, unknown>
    $event?: Event
  }

  export type CreateOptions = Partial<Value>

  export const create = (
    options: CreateOptions = {},
  ): Value => ({
    $args: options.$args ?? {},
    $state: options.$state ?? {},
    $param: options.$param ?? {},
    $props: options.$props ?? {},
    $var: options.$var ?? {},
    $function: options.$function ?? {},
    $system: options.$system ?? {},
    $event: options.$event,
  })

  export const createEmpty = (): Value => create()
}

export default FormulaContext
