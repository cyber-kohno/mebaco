import { get } from 'svelte/store'
import CommandRegistry from './command-registry'
import CommandRunner from './command-runner'
import { commandSessionStore } from './command-session-store'

namespace CommandController {
  const refreshFocus = (focus: number) => {
    commandSessionStore.update((session) => {
      if (session == null) return session
      const suggestions = CommandRegistry.getSuggestions(CommandRunner.createContext(), session.input)
      return { ...session, focus: Math.max(0, Math.min(focus, Math.max(0, suggestions.length - 1))) }
    })
  }

  export const open = () => {
    commandSessionStore.set({ input: '', focus: 0, outputs: [] })
  }

  export const close = () => commandSessionStore.set(null)

  export const toggle = () => {
    if (get(commandSessionStore) == null) open()
    else close()
  }

  export const setInput = (input: string) => {
    commandSessionStore.update((session) => session == null ? session : ({ ...session, input, focus: 0 }))
  }

  export const moveFocus = (direction: -1 | 1) => {
    const session = get(commandSessionStore)
    if (session == null) return
    refreshFocus(session.focus + direction)
  }

  export const applySuggestion = () => {
    const session = get(commandSessionStore)
    if (session == null) return
    const suggestions = CommandRegistry.getSuggestions(CommandRunner.createContext(), session.input)
    const suggestion = suggestions[session.focus]
    if (suggestion == null) return
    setInput(`${suggestion.definition.id} `)
  }

  export const execute = () => {
    const input = get(commandSessionStore)?.input ?? ''
    void CommandRunner.execute(input)
  }

  export const handleKeydown = (event: KeyboardEvent) => {
    if (get(commandSessionStore) == null) return
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveFocus(1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveFocus(-1)
      return
    }
    if (event.key === 'Tab') {
      event.preventDefault()
      applySuggestion()
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      execute()
    }
  }
}

export default CommandController
