import { describe, expect, it, vi } from 'vitest'
import type * as Monaco from 'monaco-editor'

vi.mock('monaco-editor', () => ({}))
vi.mock('@monaco-editor/loader', () => ({
  default: { config: vi.fn(), init: vi.fn() },
}))

import MonacoFactory from './monaco-factory'

describe('MonacoFactory', () => {
  it('configures unreachable TypeScript code as an error', () => {
    const setCompilerOptions = vi.fn()
    const setDiagnosticsOptions = vi.fn()
    const setEagerModelSync = vi.fn()
    const monaco = {
      typescript: {
        ScriptTarget: { ES2020: 7 },
        ModuleKind: { ESNext: 99 },
        typescriptDefaults: {
          getCompilerOptions: () => ({ sourceMap: true }),
          setCompilerOptions,
          setDiagnosticsOptions,
          setEagerModelSync,
        },
      },
    } as unknown as typeof Monaco

    MonacoFactory.configureTypeScriptDefaults(monaco)

    expect(setCompilerOptions).toHaveBeenCalledWith(expect.objectContaining({
      sourceMap: true,
      allowUnreachableCode: false,
    }))
  })
})
