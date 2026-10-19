namespace DebugLog {
  export type Kind = 'debug-log'
  export type Level = 'debug' | 'info' | 'warn' | 'error' | 'off'

  export type Element = {
    kind: Kind
    level: Level
    showLevel: boolean
    showDate: boolean
    showTime: boolean
    showNodeId: boolean
  }

  export const create = (): Element => ({
    kind: 'debug-log',
    level: 'info',
    showLevel: true,
    showDate: true,
    showTime: true,
    showNodeId: true,
  })
}

export default DebugLog
