import type StyleElement from '../../element/kind/view/style-element'
import StylePropertyName from '../../element/kind/view/style-property-name'
import type StyleResolver from './style-resolver'

namespace StyleMonitor {
  export type Entry = StyleResolver.Declaration & {
    overridden: StyleResolver.Declaration[]
  }

  export type Result = {
    entries: Entry[]
    errors: StyleResolver.Error[]
  }

  const applyDeclarations = (
    entries: Map<string, Entry>,
    declarations: readonly StyleResolver.Declaration[],
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
    resolution: StyleResolver.Result,
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
