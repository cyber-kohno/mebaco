import TypeScript from 'typescript'
import libDecorators from 'typescript/lib/lib.decorators.d.ts?raw'
import libDecoratorsLegacy from 'typescript/lib/lib.decorators.legacy.d.ts?raw'
import libEs5 from 'typescript/lib/lib.es5.d.ts?raw'
import libEs2015 from 'typescript/lib/lib.es2015.d.ts?raw'
import libEs2015Collection from 'typescript/lib/lib.es2015.collection.d.ts?raw'
import libEs2015Core from 'typescript/lib/lib.es2015.core.d.ts?raw'
import libEs2015Generator from 'typescript/lib/lib.es2015.generator.d.ts?raw'
import libEs2015Iterable from 'typescript/lib/lib.es2015.iterable.d.ts?raw'
import libEs2015Promise from 'typescript/lib/lib.es2015.promise.d.ts?raw'
import libEs2015Proxy from 'typescript/lib/lib.es2015.proxy.d.ts?raw'
import libEs2015Reflect from 'typescript/lib/lib.es2015.reflect.d.ts?raw'
import libEs2015Symbol from 'typescript/lib/lib.es2015.symbol.d.ts?raw'
import libEs2015SymbolWellknown from 'typescript/lib/lib.es2015.symbol.wellknown.d.ts?raw'
import libEs2016 from 'typescript/lib/lib.es2016.d.ts?raw'
import libEs2016ArrayInclude from 'typescript/lib/lib.es2016.array.include.d.ts?raw'
import libEs2016Intl from 'typescript/lib/lib.es2016.intl.d.ts?raw'
import libEs2017 from 'typescript/lib/lib.es2017.d.ts?raw'
import libEs2017Arraybuffer from 'typescript/lib/lib.es2017.arraybuffer.d.ts?raw'
import libEs2017Date from 'typescript/lib/lib.es2017.date.d.ts?raw'
import libEs2017Intl from 'typescript/lib/lib.es2017.intl.d.ts?raw'
import libEs2017Object from 'typescript/lib/lib.es2017.object.d.ts?raw'
import libEs2017Sharedmemory from 'typescript/lib/lib.es2017.sharedmemory.d.ts?raw'
import libEs2017String from 'typescript/lib/lib.es2017.string.d.ts?raw'
import libEs2017Typedarrays from 'typescript/lib/lib.es2017.typedarrays.d.ts?raw'
import libEs2018 from 'typescript/lib/lib.es2018.d.ts?raw'
import libEs2018Asyncgenerator from 'typescript/lib/lib.es2018.asyncgenerator.d.ts?raw'
import libEs2018Asynciterable from 'typescript/lib/lib.es2018.asynciterable.d.ts?raw'
import libEs2018Intl from 'typescript/lib/lib.es2018.intl.d.ts?raw'
import libEs2018Promise from 'typescript/lib/lib.es2018.promise.d.ts?raw'
import libEs2018Regexp from 'typescript/lib/lib.es2018.regexp.d.ts?raw'
import libEs2019 from 'typescript/lib/lib.es2019.d.ts?raw'
import libEs2019Array from 'typescript/lib/lib.es2019.array.d.ts?raw'
import libEs2019Intl from 'typescript/lib/lib.es2019.intl.d.ts?raw'
import libEs2019Object from 'typescript/lib/lib.es2019.object.d.ts?raw'
import libEs2019String from 'typescript/lib/lib.es2019.string.d.ts?raw'
import libEs2019Symbol from 'typescript/lib/lib.es2019.symbol.d.ts?raw'
import libEs2020 from 'typescript/lib/lib.es2020.d.ts?raw'
import libEs2020Bigint from 'typescript/lib/lib.es2020.bigint.d.ts?raw'
import libEs2020Date from 'typescript/lib/lib.es2020.date.d.ts?raw'
import libEs2020Intl from 'typescript/lib/lib.es2020.intl.d.ts?raw'
import libEs2020Number from 'typescript/lib/lib.es2020.number.d.ts?raw'
import libEs2020Promise from 'typescript/lib/lib.es2020.promise.d.ts?raw'
import libEs2020Sharedmemory from 'typescript/lib/lib.es2020.sharedmemory.d.ts?raw'
import libEs2020String from 'typescript/lib/lib.es2020.string.d.ts?raw'
import libEs2020SymbolWellknown from 'typescript/lib/lib.es2020.symbol.wellknown.d.ts?raw'

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
  const standardLibrarySources = {
    'lib.es5.d.ts': libEs5,
    'lib.es2015.d.ts': libEs2015,
    'lib.es2016.d.ts': libEs2016,
    'lib.es2017.d.ts': libEs2017,
    'lib.es2018.d.ts': libEs2018,
    'lib.es2019.d.ts': libEs2019,
    'lib.es2020.d.ts': libEs2020,
    'lib.es2015.core.d.ts': libEs2015Core,
    'lib.es2015.collection.d.ts': libEs2015Collection,
    'lib.es2015.generator.d.ts': libEs2015Generator,
    'lib.es2015.iterable.d.ts': libEs2015Iterable,
    'lib.es2015.promise.d.ts': libEs2015Promise,
    'lib.es2015.proxy.d.ts': libEs2015Proxy,
    'lib.es2015.reflect.d.ts': libEs2015Reflect,
    'lib.es2015.symbol.d.ts': libEs2015Symbol,
    'lib.es2015.symbol.wellknown.d.ts': libEs2015SymbolWellknown,
    'lib.es2016.array.include.d.ts': libEs2016ArrayInclude,
    'lib.es2016.intl.d.ts': libEs2016Intl,
    'lib.es2017.arraybuffer.d.ts': libEs2017Arraybuffer,
    'lib.es2017.date.d.ts': libEs2017Date,
    'lib.es2017.object.d.ts': libEs2017Object,
    'lib.es2017.sharedmemory.d.ts': libEs2017Sharedmemory,
    'lib.es2017.string.d.ts': libEs2017String,
    'lib.es2017.intl.d.ts': libEs2017Intl,
    'lib.es2017.typedarrays.d.ts': libEs2017Typedarrays,
    'lib.es2018.asyncgenerator.d.ts': libEs2018Asyncgenerator,
    'lib.es2018.asynciterable.d.ts': libEs2018Asynciterable,
    'lib.es2018.intl.d.ts': libEs2018Intl,
    'lib.es2018.promise.d.ts': libEs2018Promise,
    'lib.es2018.regexp.d.ts': libEs2018Regexp,
    'lib.es2019.array.d.ts': libEs2019Array,
    'lib.es2019.object.d.ts': libEs2019Object,
    'lib.es2019.string.d.ts': libEs2019String,
    'lib.es2019.symbol.d.ts': libEs2019Symbol,
    'lib.es2019.intl.d.ts': libEs2019Intl,
    'lib.es2020.bigint.d.ts': libEs2020Bigint,
    'lib.es2020.date.d.ts': libEs2020Date,
    'lib.es2020.promise.d.ts': libEs2020Promise,
    'lib.es2020.sharedmemory.d.ts': libEs2020Sharedmemory,
    'lib.es2020.string.d.ts': libEs2020String,
    'lib.es2020.symbol.wellknown.d.ts': libEs2020SymbolWellknown,
    'lib.es2020.intl.d.ts': libEs2020Intl,
    'lib.es2020.number.d.ts': libEs2020Number,
    'lib.decorators.d.ts': libDecorators,
    'lib.decorators.legacy.d.ts': libDecoratorsLegacy,
  }
  const standardLibraryFileNames = Object.keys(standardLibrarySources)

  const getBaseName = (candidate: string): string => (
    candidate.split(/[\\/]/).pop() ?? candidate
  )

  const createProgram = (
    source: string,
  ): TypeScript.Program => {
    const options: TypeScript.CompilerOptions = {
      noLib: true,
      strict: true,
      strictNullChecks: true,
      target: TypeScript.ScriptTarget.ES2020,
    }
    const readSource = (candidate: string): string | undefined => (
      candidate === fileName
        ? source
        : standardLibrarySources[getBaseName(candidate) as keyof typeof standardLibrarySources]
    )
    const host: TypeScript.CompilerHost = {
      fileExists: (candidate) => readSource(candidate) != null,
      getCanonicalFileName: (candidate) => candidate,
      getCurrentDirectory: () => '',
      getDefaultLibFileName: () => 'lib.es2020.d.ts',
      getDirectories: () => [],
      getNewLine: () => '\n',
      getSourceFile: (candidate, languageVersion) => {
        const candidateSource = readSource(candidate)
        return candidateSource == null
          ? undefined
          : TypeScript.createSourceFile(candidate, candidateSource, languageVersion, true)
      },
      readFile: readSource,
      useCaseSensitiveFileNames: () => true,
      writeFile: () => undefined,
    }
    return TypeScript.createProgram([...standardLibraryFileNames, fileName], options, host)
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
