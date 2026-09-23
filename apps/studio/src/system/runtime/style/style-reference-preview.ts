import StyleArgumentContract from '@system/model/view/style/style-argument-contract'
import type StyleElement from '@system/model/view/style/style'
import StyleParameterCatalog from '@system/model/view/style/style-parameter-catalog'
import type TagElement from '@system/model/view/tag'
import type TreeNode from '@system/model/tree/tree-node'
import FormulaContext from '../formula/formula-context'
import StyleDeclarationResolver from './style-declaration-resolver'
import StyleMonitor from './style-monitor'

namespace StyleReferencePreview {
  export type Entry = {
    property: string
    value: string
    formula: boolean
  }

  export type Section = {
    state: StyleElement.State | null
    entries: readonly Entry[]
  }

  export type Result = {
    sections: readonly Section[]
    issues: readonly string[]
  }

  export type Resolver = (styleId: string) => Result

  const toEntry = (
    entry: StyleMonitor.Entry,
  ): Entry => ({
    property: entry.property,
    value: entry.unresolved?.source ?? entry.value,
    formula: entry.source.valueType === 'formula',
  })

  export const createResolver = (
    rootNode: TreeNode.Node,
  ): Resolver => {
    const parameters = StyleParameterCatalog.createCatalog(rootNode)
    const declarations = StyleDeclarationResolver.createCatalog(rootNode)
    const cache = new Map<string, Result>()

    return (styleId) => {
      const cached = cache.get(styleId)
      if (cached != null) return cached

      const parameterResolution = parameters.resolve(styleId)
      if (parameterResolution.issues.length > 0) {
        const result = {
          sections: [],
          issues: parameterResolution.issues.map((issue) => issue.message),
        }
        cache.set(styleId, result)
        return result
      }

      const resolution = declarations.resolve([{
        referenceId: `style-reference-preview:${styleId}`,
        styleId,
        arguments: StyleArgumentContract.createArguments(
          parameterResolution.parameters,
          'application',
        ) as TagElement.StyleArgument[],
      }], FormulaContext.createEmpty(), {
        includeUnresolvedDeclarations: true,
        deferFormulaArguments: true,
        deferAllFormulas: true,
        includeAnimations: false,
      })
      const defaultEntries = StyleMonitor.create(resolution, null).entries.map(toEntry)
      const sections: Section[] = [{ state: null, entries: defaultEntries }]
      const states = [...new Set(resolution.declarations.flatMap((declaration) => (
        declaration.state == null ? [] : [declaration.state]
      )))]
      states.forEach((state) => {
        const entries = StyleMonitor.create(resolution, state).entries
          .filter((entry) => entry.state === state)
          .map(toEntry)
        if (entries.length > 0) sections.push({ state, entries })
      })
      const result = {
        sections,
        issues: resolution.errors.map(StyleDeclarationResolver.formatError),
      }
      cache.set(styleId, result)
      return result
    }
  }
}

export default StyleReferencePreview
