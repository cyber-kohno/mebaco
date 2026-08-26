import { describe, expect, it, vi } from 'vitest'
import type { CommandContext } from '../command-types'
import createRunCatalog from './run-catalog'

const createContext = (): CommandContext => ({
  rootNode: {
    id: 1,
    element: { kind: 'project' },
    isOpen: true,
    children: [],
  },
  selectedNodeId: 1,
  appendOutput: vi.fn(),
  clearOutputs: vi.fn(),
  close: vi.fn(),
  openPreview: vi.fn(() => true),
  requestChoice: vi.fn(),
  requestInput: vi.fn(),
})

describe('run catalog Launcher identity', () => {
  it('completes the display Id but starts preview with the stable UUID', () => {
    const definition = createRunCatalog({
      hasLaunchArguments: true,
      hasStructuredArguments: false,
      arguments: [],
      launchers: [{
        launcherId: 'production-launcher-uuid',
        id: 'hoge_honban',
        name: 'Production',
      }],
    })
    const context = createContext()

    expect(definition.complete?.(context, [])).toContainEqual({
      label: 'hoge_honban',
      detail: 'Production',
      insertText: 'run hoge_honban',
    })
    definition.execute(context, ['hoge_honban'])

    expect(context.openPreview).toHaveBeenCalledWith('production-launcher-uuid')
    expect(context.close).toHaveBeenCalledOnce()
  })
})
