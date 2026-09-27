export type McpSessionStatus =
  | 'stopped'
  | 'starting'
  | 'available'
  | 'connected'
  | 'stopping'
  | 'error'

export type McpSessionActionResult = {
  outcome: 'changed' | 'unchanged' | 'rejected'
  status: McpSessionStatus
  message: string
}
