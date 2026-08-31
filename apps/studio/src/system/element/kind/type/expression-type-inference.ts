import TypeScript from 'typescript'

namespace ExpressionTypeInference {
  export type TypeInferred = {
    ok: true
    typeText: string
  }

  export type Inferred = {
    ok: true
    itemTypeText: string
  }

  export type Failed = {
    ok: false
    error: string
  }

  export type Result = Inferred | Failed
  export type TypeResult = TypeInferred | Failed

  const fileName = 'mebaco-expression-inference.ts'
  const resultName = '__mebacoInferredExpression'
  const cache = new Map<string, Result>()
  const typeCache = new Map<string, TypeResult>()

  const collectionLibrary = [
    'interface PromiseLike<T> {',
    '  then<TResult1 = T, TResult2 = never>(',
    '    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,',
    '    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,',
    '  ): PromiseLike<TResult1 | TResult2>;',
    '}',
    'interface Promise<T> extends PromiseLike<T> {}',
    'interface Array<T> {',
    '  readonly length: number;',
    '  [index: number]: T;',
    '  concat(...items: (T | readonly T[])[]): T[];',
    '  filter(predicate: (value: T, index: number, array: T[]) => unknown): T[];',
    '  flatMap<U>(callback: (value: T, index: number, array: T[]) => U | readonly U[]): U[];',
    '  map<U>(callback: (value: T, index: number, array: T[]) => U): U[];',
    '  slice(start?: number, end?: number): T[];',
    '}',
    'interface ReadonlyArray<T> {',
    '  readonly length: number;',
    '  readonly [index: number]: T;',
    '  filter(predicate: (value: T, index: number, array: readonly T[]) => unknown): T[];',
    '  map<U>(callback: (value: T, index: number, array: readonly T[]) => U): U[];',
    '  slice(start?: number, end?: number): T[];',
    '}',
    'interface ArrayConstructor {',
    '  isArray(value: unknown): value is unknown[];',
    '  from<T>(value: ArrayLike<T>): T[];',
    '}',
    'interface ArrayLike<T> { readonly length: number; readonly [index: number]: T; }',
    'declare var Array: ArrayConstructor;',
  ].join('\n')

  const createProgram = (
    source: string,
  ): TypeScript.Program => {
    const options: TypeScript.CompilerOptions = {
      noLib: true,
      strict: true,
      strictNullChecks: true,
      target: TypeScript.ScriptTarget.ES2020,
    }
    const host: TypeScript.CompilerHost = {
      fileExists: (candidate) => candidate === fileName,
      getCanonicalFileName: (candidate) => candidate,
      getCurrentDirectory: () => '',
      getDefaultLibFileName: () => '',
      getDirectories: () => [],
      getNewLine: () => '\n',
      getSourceFile: (candidate, languageVersion) => candidate === fileName
        ? TypeScript.createSourceFile(candidate, source, languageVersion, true)
        : undefined,
      readFile: (candidate) => candidate === fileName ? source : undefined,
      useCaseSensitiveFileNames: () => true,
      writeFile: () => undefined,
    }
    return TypeScript.createProgram([fileName], options, host)
  }

  const findResult = (
    sourceFile: TypeScript.SourceFile,
  ): TypeScript.VariableDeclaration | null => {
    let result: TypeScript.VariableDeclaration | null = null
    const visit = (node: TypeScript.Node) => {
      if (
        TypeScript.isVariableDeclaration(node)
        && TypeScript.isIdentifier(node.name)
        && node.name.text === resultName
      ) result = node
      TypeScript.forEachChild(node, visit)
    }
    visit(sourceFile)
    return result
  }

  const isUnusableType = (
    type: TypeScript.Type,
  ): boolean => (
    (type.flags & (
      TypeScript.TypeFlags.Any
      | TypeScript.TypeFlags.Unknown
      | TypeScript.TypeFlags.Never
    )) !== 0
  )

  const getArrayItemTypes = (
    checker: TypeScript.TypeChecker,
    type: TypeScript.Type,
  ): TypeScript.Type[] | null => {
    if (type.isUnion()) {
      const members = type.types.map((member) => getArrayItemTypes(checker, member))
      return members.some((member) => member == null)
        ? null
        : members.flatMap((member) => member ?? [])
    }

    if (!checker.isArrayType(type) && !checker.isTupleType(type)) return null
    const itemType = checker.getIndexTypeOfType(type, TypeScript.IndexKind.Number)
    return itemType == null ? null : [itemType]
  }

  export const inferArrayItem = (
    injectionSource: string,
    expressionSource: string,
  ): Result => {
    const cacheKey = `${injectionSource}\u0000${expressionSource}`
    const cached = cache.get(cacheKey)
    if (cached != null) return cached

    const source = [
      collectionLibrary,
      injectionSource,
      `const ${resultName} = (`,
      expressionSource.length === 0 ? 'undefined' : expressionSource,
      ');',
    ].join('\n')
    const program = createProgram(source)
    const sourceFile = program.getSourceFile(fileName)
    const declaration = sourceFile == null ? null : findResult(sourceFile)
    if (sourceFile == null || declaration?.initializer == null) {
      const failed: Failed = { ok: false, error: 'Enter a valid TypeScript expression.' }
      cache.set(cacheKey, failed)
      return failed
    }

    if (program.getSyntacticDiagnostics(sourceFile).length > 0) {
      const failed: Failed = { ok: false, error: 'Enter a valid TypeScript expression.' }
      cache.set(cacheKey, failed)
      return failed
    }

    const checker = program.getTypeChecker()
    const resultType = checker.getTypeAtLocation(declaration.initializer)
    const itemTypes = getArrayItemTypes(checker, resultType)
    if (itemTypes == null) {
      const failed: Failed = { ok: false, error: 'Collection must return an array.' }
      cache.set(cacheKey, failed)
      return failed
    }
    if (itemTypes.length === 0 || itemTypes.some(isUnusableType)) {
      const failed: Failed = {
        ok: false,
        error: 'Collection item type could not be inferred.',
      }
      cache.set(cacheKey, failed)
      return failed
    }

    const itemTypeTexts = itemTypes
      .map((itemType) => checker.typeToString(
        itemType,
        declaration,
        TypeScript.TypeFormatFlags.NoTruncation,
      ))
      .filter((typeText, index, values) => values.indexOf(typeText) === index)
    const inferred: Inferred = {
      ok: true,
      itemTypeText: itemTypeTexts.join(' | '),
    }
    cache.set(cacheKey, inferred)
    return inferred
  }

  export const inferType = (
    injectionSource: string,
    expressionSource: string,
    widenLiterals = false,
    allowAwait = false,
  ): TypeResult => {
    const cacheKey = `${widenLiterals}\u0000${allowAwait}\u0000${injectionSource}\u0000${expressionSource}`
    const cached = typeCache.get(cacheKey)
    if (cached != null) return cached

    const expressionLines = [
      `const ${resultName} = (`,
      expressionSource.length === 0 ? 'undefined' : expressionSource,
      ');',
    ]
    const source = [
      collectionLibrary,
      injectionSource,
      ...(allowAwait
        ? ['async function __mebacoInferAsync() {', ...expressionLines, '}']
        : expressionLines),
    ].join('\n')
    const program = createProgram(source)
    const sourceFile = program.getSourceFile(fileName)
    const declaration = sourceFile == null ? null : findResult(sourceFile)
    if (
      sourceFile == null
      || declaration?.initializer == null
      || program.getSyntacticDiagnostics(sourceFile).length > 0
    ) {
      const failed: Failed = { ok: false, error: 'Enter a valid TypeScript expression.' }
      typeCache.set(cacheKey, failed)
      return failed
    }

    const checker = program.getTypeChecker()
    const inferredType = checker.getTypeAtLocation(declaration.initializer)
    const type = widenLiterals
      ? checker.getWidenedType(checker.getBaseTypeOfLiteralType(inferredType))
      : inferredType
    if (isUnusableType(type)) {
      const failed: Failed = { ok: false, error: 'Expression type could not be inferred.' }
      typeCache.set(cacheKey, failed)
      return failed
    }
    const inferred: TypeInferred = {
      ok: true,
      typeText: checker.typeToString(
        type,
        declaration,
        TypeScript.TypeFormatFlags.NoTruncation,
      ),
    }
    typeCache.set(cacheKey, inferred)
    return inferred
  }

  export const validateExpectedType = (
    injectionSource: string,
    expressionSource: string,
    expectedTypeText: string,
    allowAwait = false,
  ): string | null => {
    const expressionLines = [
      `const __mebacoExpected: ${expectedTypeText} = (`,
      expressionSource.length === 0 ? 'undefined' : expressionSource,
      ');',
    ]
    const source = [
      collectionLibrary,
      injectionSource,
      ...(allowAwait
        ? ['async function __mebacoValidateAsync() {', ...expressionLines, '}']
        : expressionLines),
    ].join('\n')
    const program = createProgram(source)
    const sourceFile = program.getSourceFile(fileName)
    if (sourceFile == null) return 'Enter a valid TypeScript expression.'
    const expressionMarker = `const __mebacoExpected: ${expectedTypeText} = (`
    const expressionStart = source.indexOf(expressionMarker)
    const diagnostics = program.getSemanticDiagnostics(sourceFile)
      .filter((diagnostic) => (diagnostic.start ?? 0) >= expressionStart)
    return diagnostics.length === 0
      ? null
      : `Expression must return ${expectedTypeText}.`
  }
}

export default ExpressionTypeInference
