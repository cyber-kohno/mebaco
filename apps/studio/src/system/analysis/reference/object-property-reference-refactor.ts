import TypeScript from 'typescript'
import type MebacoElement from '../../element/element'
import type ObjectDefinitionUpdatePolicy from '../../element/kind/type/object/object-definition-update-policy'
import ObjectPropertyTypeScriptMarker from '../../element/kind/type/object/object-property-typescript-marker'
import type TreeNode from '../../tree/tree-node'
import MebacoInjectionSource from '../../ui/monaco/mebaco-injection-source'
import MonacoInjection from '../../ui/monaco/monaco-injection'
import ElementExpressionFields from './element-expression-fields'

namespace ObjectPropertyReferenceRefactor {
  export type Result = {
    rootNode: TreeNode.Node
    changedNodeIds: readonly number[]
    updatedOccurrenceCount: number
  }

  type Rename = {
    propertyId: string
    previousName: string
    currentName: string
  }

  type Replacement = {
    start: number
    end: number
    text: string
  }

  const fileName = 'mebaco-object-property-refactoring.ts'
  const expressionFields = ElementExpressionFields.direct
  const jsonFields = ElementExpressionFields.referenceJson
  const startMarker = '/*__mebaco_refactor_source_start__*/'
  const endMarker = '/*__mebaco_refactor_source_end__*/'
  const minimalLibrary = [
    'interface Array<T> { readonly length: number; readonly [index: number]: T; }',
    'interface ReadonlyArray<T> { readonly length: number; readonly [index: number]: T; }',
  ].join('\n')

  const cloneNode = (node: TreeNode.Node): TreeNode.Node => ({
    ...node,
    children: node.children.map(cloneNode),
  })

  const isObject = (value: unknown): value is Record<string, unknown> => (
    value != null && typeof value === 'object' && !Array.isArray(value)
  )

  const getLeafName = (path: string | undefined): string | null => {
    if (path == null) return null
    return path.split('.').at(-1) ?? null
  }

  const collectRenames = (
    analysis: ObjectDefinitionUpdatePolicy.Analysis,
  ): ReadonlyMap<string, Rename> => new Map(
    analysis.renamed.flatMap((change): Array<[string, Rename]> => {
      const previousName = getLeafName(change.previousPath)
      const currentName = getLeafName(change.currentPath)
      return previousName == null || currentName == null || previousName === currentName
        ? []
        : [[change.propertyId, {
            propertyId: change.propertyId,
            previousName,
            currentName,
          }]]
    }),
  )

  const createProgram = (source: string): TypeScript.Program => {
    const options: TypeScript.CompilerOptions = {
      noLib: true,
      strict: true,
      strictNullChecks: true,
      target: TypeScript.ScriptTarget.ES2022,
      module: TypeScript.ModuleKind.ESNext,
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

  const collectMarkedPropertyIds = (
    checker: TypeScript.TypeChecker,
    receiverType: TypeScript.Type,
    propertyName: string,
    sourceFile: TypeScript.SourceFile,
  ): ReadonlySet<string> => {
    const type = checker.getNonNullableType(receiverType)
    if ((type.flags & (
      TypeScript.TypeFlags.Any
      | TypeScript.TypeFlags.Unknown
      | TypeScript.TypeFlags.Never
    )) !== 0) return new Set()

    const symbol = checker.getPropertyOfType(type, propertyName)
    if (symbol == null) return new Set()

    const ids = new Set<string>()
    const addDeclarations = (propertySymbol: TypeScript.Symbol | undefined) => {
      propertySymbol?.getDeclarations()?.forEach((declaration) => {
        const id = ObjectPropertyTypeScriptMarker.read(declaration, sourceFile)
        if (id != null) ids.add(id)
      })
    }
    addDeclarations(symbol)

    if (ids.size === 0 && (type.isUnion() || type.isIntersection())) {
      type.types.forEach((member) => {
        addDeclarations(checker.getPropertyOfType(
          checker.getNonNullableType(member),
          propertyName,
        ))
      })
    }
    return ids
  }

  const createReplacement = (
    node: TypeScript.Node,
    sourceFile: TypeScript.SourceFile,
    checker: TypeScript.TypeChecker,
    sourceStart: number,
    sourceEnd: number,
    renames: ReadonlyMap<string, Rename>,
  ): Replacement | null => {
    let receiver: TypeScript.Expression
    let propertyName: string
    let nameNode: TypeScript.Node
    let quote: '' | "'" | '"'

    if (TypeScript.isPropertyAccessExpression(node)) {
      receiver = node.expression
      propertyName = node.name.text
      nameNode = node.name
      quote = ''
    } else if (
      TypeScript.isElementAccessExpression(node)
      && node.argumentExpression != null
      && TypeScript.isStringLiteral(node.argumentExpression)
    ) {
      receiver = node.expression
      propertyName = node.argumentExpression.text
      nameNode = node.argumentExpression
      quote = node.argumentExpression.getText(sourceFile).startsWith("'") ? "'" : '"'
    } else {
      return null
    }

    const start = nameNode.getStart(sourceFile)
    const end = nameNode.end
    if (start < sourceStart || end > sourceEnd) return null

    const propertyIds = collectMarkedPropertyIds(
      checker,
      checker.getTypeAtLocation(receiver),
      propertyName,
      sourceFile,
    )
    if (propertyIds.size !== 1) return null
    const propertyId = [...propertyIds][0]
    const rename = renames.get(propertyId)
    if (rename == null || rename.previousName !== propertyName) return null

    return {
      start: start - sourceStart,
      end: end - sourceStart,
      text: quote.length === 0
        ? rename.currentName
        : `${quote}${rename.currentName}${quote}`,
    }
  }

  const rewriteExpression = (
    source: string,
    mode: MonacoInjection.Mode,
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    renames: ReadonlyMap<string, Rename>,
  ): { source: string; count: number } => {
    if (
      source.trim().length === 0
      || ![...renames.values()].some((rename) => source.includes(rename.previousName))
    ) return { source, count: 0 }

    const injectionSource = MebacoInjectionSource.createForNodeWithOptions(
      rootNode,
      sourceNode.id,
      mode,
      { includeObjectPropertyIdentityMarkers: true },
    )
    const markedSource = `${startMarker}\n${source}\n${endMarker}`
    const analysisSource = [
      minimalLibrary,
      MonacoInjection.wrapForAnalysis(markedSource, mode, {
        injectionSource,
        scopeId: `object_property_refactor_${sourceNode.id}`,
        allowAwait: mode === 'action',
      }),
    ].join('\n')
    const sourceStart = analysisSource.indexOf(startMarker) + startMarker.length + 1
    const sourceEnd = analysisSource.indexOf(`\n${endMarker}`, sourceStart)
    if (sourceStart <= startMarker.length || sourceEnd < sourceStart) {
      return { source, count: 0 }
    }

    const program = createProgram(analysisSource)
    const sourceFile = program.getSourceFile(fileName)
    if (sourceFile == null || program.getSyntacticDiagnostics(sourceFile).length > 0) {
      return { source, count: 0 }
    }

    const checker = program.getTypeChecker()
    const replacements: Replacement[] = []
    const visit = (node: TypeScript.Node) => {
      const replacement = createReplacement(
        node,
        sourceFile,
        checker,
        sourceStart,
        sourceEnd,
        renames,
      )
      if (replacement != null) replacements.push(replacement)
      TypeScript.forEachChild(node, visit)
    }
    visit(sourceFile)

    let nextSource = source
    replacements
      .sort((left, right) => right.start - left.start)
      .forEach((replacement) => {
        nextSource = `${nextSource.slice(0, replacement.start)}${replacement.text}${nextSource.slice(replacement.end)}`
      })
    return { source: nextSource, count: replacements.length }
  }

  const getMode = (
    sourceNode: TreeNode.Node,
    container: Record<string, unknown> | null,
  ): MonacoInjection.Mode => (
    sourceNode.element.kind === 'action' || container?.type === 'script'
      ? 'action'
      : 'expression'
  )

  const rewriteValue = (
    value: unknown,
    key: string,
    container: Record<string, unknown> | null,
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    renames: ReadonlyMap<string, Rename>,
  ): { value: unknown; count: number } => {
    if (typeof value === 'string') {
      if (jsonFields.has(key)) {
        try {
          const parsed = JSON.parse(value)
          if (Array.isArray(parsed) || isObject(parsed)) {
            const rewritten = rewriteValue(
              parsed,
              key,
              null,
              rootNode,
              sourceNode,
              renames,
            )
            return rewritten.count > 0
              ? { value: JSON.stringify(rewritten.value), count: rewritten.count }
              : { value, count: 0 }
          }
        } catch {
          // Plain expressions are intentionally handled below.
        }
      }
      if (!expressionFields.has(key)) return { value, count: 0 }
      const rewritten = rewriteExpression(
        value,
        getMode(sourceNode, container),
        rootNode,
        sourceNode,
        renames,
      )
      return { value: rewritten.source, count: rewritten.count }
    }

    if (Array.isArray(value)) {
      let count = 0
      const result = value.map((item) => {
        const rewritten = rewriteValue(item, key, container, rootNode, sourceNode, renames)
        count += rewritten.count
        return rewritten.value
      })
      return { value: count > 0 ? result : value, count }
    }
    if (!isObject(value)) return { value, count: 0 }

    let count = 0
    const result: Record<string, unknown> = { ...value }
    Object.entries(value).forEach(([childKey, child]) => {
      const rewritten = rewriteValue(
        child,
        childKey,
        value,
        rootNode,
        sourceNode,
        renames,
      )
      if (rewritten.count > 0) result[childKey] = rewritten.value
      count += rewritten.count
    })
    return { value: count > 0 ? result : value, count }
  }

  export const apply = (
    rootNode: TreeNode.Node,
    analysis: ObjectDefinitionUpdatePolicy.Analysis,
  ): Result => {
    const renames = collectRenames(analysis)
    if (renames.size === 0) {
      return { rootNode, changedNodeIds: [], updatedOccurrenceCount: 0 }
    }

    const nextRoot = cloneNode(rootNode)
    const changedNodeIds: number[] = []
    let updatedOccurrenceCount = 0

    const visit = (previousNode: TreeNode.Node, currentNode: TreeNode.Node) => {
      const rewritten = rewriteValue(
        previousNode.element,
        '',
        null,
        rootNode,
        previousNode,
        renames,
      )
      if (rewritten.count > 0) {
        currentNode.element = rewritten.value as MebacoElement.Element
        changedNodeIds.push(previousNode.id)
        updatedOccurrenceCount += rewritten.count
      }
      previousNode.children.forEach((child, index) => {
        visit(child, currentNode.children[index])
      })
    }
    visit(rootNode, nextRoot)

    return { rootNode: nextRoot, changedNodeIds, updatedOccurrenceCount }
  }
}

export default ObjectPropertyReferenceRefactor
