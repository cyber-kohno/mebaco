import loader from '@monaco-editor/loader'
import * as Monaco from 'monaco-editor'

namespace MonacoFactory {
  let monaco: typeof Monaco | null = null
  let initialization: Promise<typeof Monaco> | null = null
  let worker: Promise<unknown> | null = null

  const wait = (milliseconds: number): Promise<void> => new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

  export const createMonaco = async (): Promise<typeof Monaco> => {
    if (monaco != null) return monaco

    if (initialization == null) {
      loader.config({ monaco: Monaco })
      initialization = (loader.init() as Promise<typeof Monaco>)
        .then((nextMonaco) => {
          monaco = nextMonaco
          configureTypeScriptDefaults(nextMonaco)
          return nextMonaco
        })
        .catch((error: unknown) => {
          initialization = null
          throw error
        })
    }

    return initialization
  }

  export const configureTypeScriptDefaults = (
    targetMonaco: typeof Monaco,
  ) => {
    const typescript = targetMonaco.typescript
    const defaults = typescript.typescriptDefaults
    defaults.setCompilerOptions({
      ...defaults.getCompilerOptions(),
      target: typescript.ScriptTarget.ES2020,
      module: typescript.ModuleKind.ESNext,
      lib: ['es2020', 'dom'],
      strict: true,
      noImplicitAny: false,
      strictNullChecks: true,
      noUnusedLocals: false,
      noUnusedParameters: false,
      allowNonTsExtensions: true,
    })
    defaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
      noSuggestionDiagnostics: true,
    })
    defaults.setEagerModelSync(true)
  }

  export const getTypeScriptService = async (
    targetMonaco: typeof Monaco,
    uri: Monaco.Uri,
  ) => {
    const typescript = targetMonaco.typescript
    let getWorker: ((uri: string) => Promise<unknown>) | null = null
    let lastError: unknown

    // The TypeScript language contribution is registered asynchronously when
    // the first TypeScript model is created. Verification can run before an
    // editor is opened, so wait for that registration instead of caching the
    // initial rejected worker promise forever.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        worker ??= typescript.getTypeScriptWorker()
        getWorker = await worker as (uri: string) => Promise<unknown>
        break
      } catch (error) {
        worker = null
        lastError = error
        if (String(error) !== 'TypeScript not registered!') throw error
        await wait(25)
      }
    }

    if (getWorker == null) throw lastError ?? new Error('TypeScript worker is unavailable.')
    return getWorker(uri.toString())
  }

  export const createModel = (
    targetMonaco: typeof Monaco,
    value: string,
    uri: Monaco.Uri,
  ): Monaco.editor.ITextModel => (
    targetMonaco.editor.getModel(uri)
    ?? targetMonaco.editor.createModel(value, 'typescript', uri)
  )
}

export default MonacoFactory
