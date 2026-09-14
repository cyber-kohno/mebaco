namespace FormulaLabelState {
  export type Status = 'checking' | 'verified' | 'error'

  export type Value = {
    status: Status
    displayText: string
    placeholder: boolean
    message?: string
  }

  export const resolve = (
    source: string,
    validationMessage: string | undefined,
    diagnosticMessages: readonly string[] | null,
  ): Value => {
    if (source.trim().length === 0) {
      return {
        status: 'error',
        displayText: 'No formula entered',
        placeholder: true,
        message: validationMessage ?? 'No formula entered.',
      }
    }
    if (validationMessage != null) {
      return {
        status: 'error',
        displayText: source,
        placeholder: false,
        message: validationMessage,
      }
    }
    if (diagnosticMessages == null) {
      return {
        status: 'checking',
        displayText: source,
        placeholder: false,
      }
    }
    if (diagnosticMessages.length > 0) {
      return {
        status: 'error',
        displayText: source,
        placeholder: false,
        message: diagnosticMessages[0],
      }
    }
    return {
      status: 'verified',
      displayText: source,
      placeholder: false,
    }
  }
}

export default FormulaLabelState
