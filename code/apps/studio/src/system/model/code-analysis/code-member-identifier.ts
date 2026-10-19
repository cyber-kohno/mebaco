namespace CodeMemberIdentifier {
  const pattern = /^[a-z][A-Za-z0-9]*$/

  const reservedNames = new Set([
    'arguments',
    'await',
    'break',
    'case',
    'catch',
    'class',
    'const',
    'continue',
    'debugger',
    'default',
    'delete',
    'do',
    'else',
    'enum',
    'eval',
    'export',
    'extends',
    'false',
    'finally',
    'for',
    'function',
    'if',
    'implements',
    'import',
    'in',
    'instanceof',
    'interface',
    'let',
    'new',
    'null',
    'package',
    'private',
    'protected',
    'public',
    'return',
    'static',
    'super',
    'switch',
    'this',
    'throw',
    'true',
    'try',
    'typeof',
    'var',
    'void',
    'while',
    'with',
    'yield',
  ])

  export const isValid = (value: string): boolean => (
    pattern.test(value) && !reservedNames.has(value)
  )

  export const validate = (value: string): string | null => {
    if (!pattern.test(value)) {
      return 'Use letters and numbers. Start with a lowercase letter.'
    }
    if (reservedNames.has(value)) {
      return `'${value}' is reserved by TypeScript.`
    }
    return null
  }
}

export default CodeMemberIdentifier
