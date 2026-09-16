import { beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import type { CommandContext, CommandDefinition } from './command-types'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  getSuggestions: vi.fn(() => []),
  openPreview: vi.fn(() => true),
}))

vi.mock('../store/tree-store', () => {
  const readable = <T>(value: T) => ({
    subscribe: (run: (next: T) => void) => {
      run(value)
      return () => undefined
    },
  })
  return {
    default: {
      rootNode: readable({ id: 1, element: { kind: 'project' }, isOpen: true, children: [] }),
      selectedNodeId: readable(88),
    },
  }
})

vi.mock('../runtime/preview/preview-controller', () => ({
  default: { openForSelectedNode: mocks.openPreview },
}))

vi.mock('../ui/native-dialog-controller', () => ({
  default: { isActive: () => false },
}))

vi.mock('./command-registry', () => ({
  default: {
    find: mocks.find,
    getSuggestions: mocks.getSuggestions,
  },
}))

import CommandController from './command-controller'
import CommandRunner from './command-runner'
import { commandSessionStore } from './command-session-store'

const definition = (
  execute: CommandDefinition['execute'],
): CommandDefinition => ({
  id: 'test',
  label: 'test',
  description: 'Test command.',
  execute,
})

const deferred = () => {
  let resolve: () => void = () => undefined
  const promise = new Promise<void>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

describe('terminal command execution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    commandSessionStore.set(null)
    CommandController.open()
  })

  it('hides command input state and prevents another command until execution finishes', async () => {
    const pending = deferred()
    const execute = vi.fn(() => pending.promise)
    mocks.find.mockReturnValue(definition(execute))
    CommandController.setInput('test')

    const execution = CommandRunner.execute('test')

    expect(get(commandSessionStore)).toMatchObject({ phase: 'running', input: '' })
    CommandController.setInput('ignored')
    await CommandRunner.execute('test')
    expect(get(commandSessionStore)?.input).toBe('')
    expect(execute).toHaveBeenCalledTimes(1)

    pending.resolve()
    await execution
    expect(get(commandSessionStore)?.phase).toBe('idle')
  })

  it('keeps a prompt continuation running until its asynchronous work finishes', async () => {
    const pending = deferred()
    const onSelect = vi.fn(() => pending.promise)
    mocks.find.mockReturnValue(definition((context: CommandContext) => {
      context.requestChoice(
        'Continue?',
        [{ id: 'yes', label: 'Yes' }],
        onSelect,
      )
    }))

    await CommandRunner.execute('test')
    expect(get(commandSessionStore)).toMatchObject({
      phase: 'awaiting-input',
      prompt: { message: 'Continue?' },
    })

    const continuation = CommandController.applyPrompt()
    expect(get(commandSessionStore)).toMatchObject({ phase: 'running', prompt: null })
    CommandController.setInput('ignored')
    expect(get(commandSessionStore)?.input).toBe('')

    pending.resolve()
    await continuation
    expect(onSelect).toHaveBeenCalledWith('yes')
    expect(get(commandSessionStore)?.phase).toBe('idle')
  })

  it('keeps the terminal session open while a command is running', async () => {
    const pending = deferred()
    mocks.find.mockReturnValue(definition(() => pending.promise))

    const execution = CommandRunner.execute('test')
    CommandController.close()
    expect(get(commandSessionStore)?.phase).toBe('running')

    pending.resolve()
    await execution
    CommandController.close()

    expect(get(commandSessionStore)).toBeNull()
  })
})
