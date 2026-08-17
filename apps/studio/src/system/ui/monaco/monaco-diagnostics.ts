import type * as Monaco from 'monaco-editor'
import type MonacoInjection from './monaco-injection'

namespace MonacoDiagnostics {
  type Diagnostic = {
    start?: number
    length?: number
    messageText: string | { messageText: string }
    category: number
    reportsUnnecessary?: boolean
  }

  const toMarkerSeverity = (
    monaco: typeof Monaco,
    diagnostic: Diagnostic,
  ): Monaco.MarkerSeverity => {
    if (diagnostic.reportsUnnecessary === true) {
      return monaco.MarkerSeverity.Hint
    }

    switch (diagnostic.category) {
      case 0:
        return monaco.MarkerSeverity.Warning
      case 2:
        return monaco.MarkerSeverity.Hint
      case 3:
        return monaco.MarkerSeverity.Info
      case 1:
      default:
        return monaco.MarkerSeverity.Error
    }
  }

  const getMessage = (
    diagnostic: Diagnostic,
  ): string => (
    typeof diagnostic.messageText === 'string'
      ? diagnostic.messageText
      : diagnostic.messageText.messageText
  )

  export const createMarkers = (
    monaco: typeof Monaco,
    diagnostics: Diagnostic[],
    analysisModel: Monaco.editor.ITextModel,
    _mode: MonacoInjection.Mode,
    offsetLine: number,
    userLineCount: number,
  ): Monaco.editor.IMarkerData[] => {
    return diagnostics
      .filter((diagnostic) => typeof diagnostic.start === 'number')
      .filter((diagnostic) => {
        const position = analysisModel.getPositionAt(diagnostic.start ?? 0)
        return position.lineNumber > offsetLine
          && position.lineNumber <= offsetLine + userLineCount
      })
      .map((diagnostic) => {
        const start = diagnostic.start ?? 0
        const end = start + (diagnostic.length ?? 0)
        const startPos = analysisModel.getPositionAt(start)
        const endPos = analysisModel.getPositionAt(end)

        return {
          severity: toMarkerSeverity(monaco, diagnostic),
          message: getMessage(diagnostic),
          startLineNumber: Math.max(1, startPos.lineNumber - offsetLine),
          startColumn: startPos.column,
          endLineNumber: Math.max(1, endPos.lineNumber - offsetLine),
          endColumn: endPos.column,
          tags: diagnostic.reportsUnnecessary === true
            ? [monaco.MarkerTag.Unnecessary]
            : [],
        }
      })
  }

  export const createWholeModelErrorMarker = (
    monaco: typeof Monaco,
    model: Monaco.editor.ITextModel,
    message: string,
  ): Monaco.editor.IMarkerData => {
    const lineCount = model.getLineCount()
    return {
      severity: monaco.MarkerSeverity.Error,
      message,
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: lineCount,
      endColumn: model.getLineMaxColumn(lineCount),
    }
  }
}

export default MonacoDiagnostics
