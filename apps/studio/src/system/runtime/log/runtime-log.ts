import type TreeNode from '../../tree/tree-node'
import type DebugLogElement from '../../element/kind/debug/debug-log-element'

namespace RuntimeLog {
  export type MessageLevel = Exclude<DebugLogElement.Level, 'off'>

  export type Settings = Readonly<{
    level: DebugLogElement.Level
    showLevel: boolean
    showDate: boolean
    showTime: boolean
    showNodeId: boolean
  }>

  export type Value = Readonly<Record<MessageLevel, (...values: unknown[]) => void>>

  export type Sink = Readonly<Record<
    MessageLevel,
    (values: readonly unknown[]) => void
  >>

  export type Session = {
    readonly settings: Settings
    forNode: (nodeId: number) => Value
  }

  export type CreateOptions = {
    sink?: Sink
    now?: () => Date
  }

  const defaultSettings: Settings = Object.freeze({
    level: 'info',
    showLevel: true,
    showDate: true,
    showTime: true,
    showNodeId: true,
  })

  const noop = () => undefined
  const noopValue: Value = Object.freeze({
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
  })

  const consoleSink: Sink = Object.freeze({
    debug: (values) => console.debug(...values),
    info: (values) => console.info(...values),
    warn: (values) => console.warn(...values),
    error: (values) => console.error(...values),
  })

  const levelRanks: Readonly<Record<DebugLogElement.Level, number>> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    off: 4,
  }

  const pad = (value: number, length = 2): string => String(value).padStart(length, '0')

  const formatDate = (value: Date): string => [
    value.getFullYear(),
    pad(value.getMonth() + 1),
    pad(value.getDate()),
  ].join('-')

  const formatTime = (value: Date): string => [
    pad(value.getHours()),
    pad(value.getMinutes()),
    pad(value.getSeconds()),
  ].join(':') + `.${pad(value.getMilliseconds(), 3)}`

  const findSettings = (
    rootNode: TreeNode.Node,
  ): Settings => {
    const find = (node: TreeNode.Node): DebugLogElement.Element | null => {
      if (node.element.kind === 'debug-log') return node.element
      for (const child of node.children) {
        const found = find(child)
        if (found != null) return found
      }
      return null
    }
    const result = find(rootNode)
    if (result == null) return defaultSettings
    return Object.freeze({
      level: result.level,
      showLevel: result.showLevel,
      showDate: result.showDate,
      showTime: result.showTime,
      showNodeId: result.showNodeId,
    })
  }

  const createValue = (
    nodeId: number,
    settings: Settings,
    sink: Sink,
    now: () => Date,
  ): Value => {
    const write = (level: MessageLevel, values: readonly unknown[]) => {
      if (levelRanks[level] < levelRanks[settings.level]) return
      const date = settings.showDate || settings.showTime ? now() : null
      const parts = [
        ...(settings.showDate && date != null ? [`[${formatDate(date)}]`] : []),
        ...(settings.showTime && date != null ? [`[${formatTime(date)}]`] : []),
        ...(settings.showLevel ? [`[${level.toUpperCase()}]`] : []),
        ...(settings.showNodeId ? [`[node-${nodeId}]`] : []),
      ]
      sink[level](parts.length === 0
        ? values
        : [parts.join(' '), ...values])
    }

    return Object.freeze({
      debug: (...values: unknown[]) => write('debug', values),
      info: (...values: unknown[]) => write('info', values),
      warn: (...values: unknown[]) => write('warn', values),
      error: (...values: unknown[]) => write('error', values),
    })
  }

  export const create = (
    rootNode: TreeNode.Node,
    options: CreateOptions = {},
  ): Session => {
    const settings = findSettings(rootNode)
    const sink = options.sink ?? consoleSink
    const now = options.now ?? (() => new Date())
    const values = new Map<number, Value>()
    return {
      settings,
      forNode: (nodeId) => {
        let value = values.get(nodeId)
        if (value == null) {
          value = createValue(nodeId, settings, sink, now)
          values.set(nodeId, value)
        }
        return value
      },
    }
  }

  export const noOutputSession: Session = Object.freeze({
    settings: defaultSettings,
    forNode: () => noopValue,
  })
}

export default RuntimeLog
