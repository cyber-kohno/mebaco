export namespace ExpressionVerification {
  export type Status = 'unverified' | 'verified' | 'error'

  export type Result = {
    status: Exclude<Status, 'unverified'>
    messages: readonly string[]
  }
}
