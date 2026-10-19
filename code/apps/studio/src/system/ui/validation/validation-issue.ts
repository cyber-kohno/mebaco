namespace ValidationIssue {
  export type Category = 'required' | 'length' | 'value' | 'consistency'
  export type Severity = 'warning' | 'error'

  export type Issue = {
    category: Category
    severity: Severity
    message: string
  }

  export const fromMessage = (message: string): Issue => {
    if (message === 'Required.' || message.startsWith('Fill all ')) {
      return { category: 'required', severity: 'warning', message }
    }
    if (message.startsWith('Must be ')) {
      return { category: 'length', severity: 'error', message }
    }
    if (
      message.includes('exists')
      || message.includes('duplicated')
      || message.includes('conflict')
    ) {
      return { category: 'consistency', severity: 'error', message }
    }
    return { category: 'value', severity: 'error', message }
  }
}

export default ValidationIssue
