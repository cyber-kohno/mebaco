import loader from '@monaco-editor/loader'
import * as Monaco from 'monaco-editor'

namespace MonacoFactory {
  let monaco: typeof Monaco | null = null
  let initialization: Promise<typeof Monaco> | null = null
  let worker: Promise<unknown> | null = null

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
    worker ??= typescript.getTypeScriptWorker()
    const getService = await worker as (uri: string) => Promise<unknown>
    return getService(uri.toString())
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
