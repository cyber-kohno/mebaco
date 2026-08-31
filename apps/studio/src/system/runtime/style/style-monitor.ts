import type StyleElement from '../../element/kind/view/style/style-element'
import StylePropertyName from '../../element/kind/view/style/style-property-name'
import type StyleDeclarationResolver from './style-declaration-resolver'

namespace StyleMonitor {
  export type Entry = StyleDeclarationResolver.Declaration & {
    overridden: StyleDeclarationResolver.Declaration[]
  }

  export type Result = {
    entries: Entry[]
    errors: StyleDeclarationResolver.Error[]
  }

  const applyDeclarations = (
    entries: Map<string, Entry>,
    declarations: readonly StyleDeclarationResolver.Declaration[],
  ) => {
    declarations.forEach((declaration) => {
      const key = StylePropertyName.normalize(declaration.property)
      const existing = entries.get(key)
      entries.set(key, {
        ...declaration,
        overridden: existing == null
          ? []
          : [...existing.overridden, existing],
      })
    })
  }

  export const create = (
    resolution: StyleDeclarationResolver.Result,
    state: StyleElement.State | null,
  ): Result => {
    const entries = new Map<string, Entry>()

    applyDeclarations(
      entries,
      resolution.declarations.filter((declaration) => declaration.state == null),
    )
    if (state != null) {
      applyDeclarations(
        entries,
        resolution.declarations.filter((declaration) => declaration.state === state),
      )
    }

    return {
      entries: [...entries.values()],
      errors: [...resolution.errors],
    }
  }
}

export default StyleMonitor
