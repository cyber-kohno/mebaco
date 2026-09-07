import { get } from 'svelte/store'
import CommandRegistry from './command-registry'
import CommandRunner from './command-runner'
import { commandSessionStore } from './command-session-store'
import TreeStore from '../store/tree-store'
import NativeDialogController from '../ui/native-dialog-controller'
import TerminalTextBuffer from './terminal-text-buffer'

namespace CommandController {
  const refreshFocus = (focus: number) => {
    commandSessionStore.update((session) => {
      if (session == null) return session
      const suggestions = CommandRegistry.getSuggestions(CommandRunner.createContext(), session.input)
      return { ...session, focus: Math.max(0, Math.min(focus, Math.max(0, suggestions.length - 1))) }
    })
  }

  export const open = () => {
    commandSessionStore.set({ nodeId: get(TreeStore.selectedNodeId), input: '', inputCaret: 0, completionDismissed: false, focus: 0, outputs: [], prompt: null })
  }

  export const close = () => commandSessionStore.set(null)

  export const toggle = () => {
    if (get(commandSessionStore) == null) open()
    else close()
  }

  export const setInput = (input: string) => {
    commandSessionStore.update((session) => session == null ? session : ({ ...session, input, inputCaret: input.length, completionDismissed: false, focus: 0 }))
  }

  export const setInputCaret = (inputCaret: number) => {
    commandSessionStore.update((session) => session == null ? session : ({
      ...session,
      inputCaret: TerminalTextBuffer.normalize({ value: session.input, caret: inputCaret }).caret,
    }))
  }

  export const dismissSuggestions = () => {
    commandSessionStore.update((session) => session == null ? session : ({ ...session, completionDismissed: true }))
  }

  export const setPromptInput = (inputValue: string) => {
    commandSessionStore.update((session) => session?.prompt?.inputSpec == null
      ? session
      : ({ ...session, prompt: { ...session.prompt, inputValue, inputCaret: inputValue.length } }))
  }

  export const setPromptInputCaret = (inputCaret: number) => {
    commandSessionStore.update((session) => session?.prompt?.inputSpec == null
      ? session
      : ({
          ...session,
          prompt: {
            ...session.prompt,
            inputCaret: TerminalTextBuffer.normalize({
              value: session.prompt.inputValue ?? '',
              caret: inputCaret,
            }).caret,
          },
        }))
  }

  const updateInput = (update: (value: TerminalTextBuffer.Value) => TerminalTextBuffer.Value) => {
    commandSessionStore.update((session) => {
      if (session == null) return session
      const next = update({ value: session.input, caret: session.inputCaret })
      return { ...session, input: next.value, inputCaret: next.caret, completionDismissed: false, focus: 0 }
    })
  }

  const updatePromptInput = (update: (value: TerminalTextBuffer.Value) => TerminalTextBuffer.Value) => {
    commandSessionStore.update((session) => {
      if (session?.prompt?.inputSpec == null) return session
      const next = update({
        value: session.prompt.inputValue ?? '',
        caret: session.prompt.inputCaret ?? 0,
      })
      return {
        ...session,
        prompt: { ...session.prompt, inputValue: next.value, inputCaret: next.caret },
      }
    })
  }

  const handleTextInputKeydown = (event: KeyboardEvent, target: 'command' | 'prompt'): boolean => {
    const update = target === 'command' ? updateInput : updatePromptInput
    let operation: ((value: TerminalTextBuffer.Value) => TerminalTextBuffer.Value) | null = null

    switch (event.key) {
      case 'Backspace': operation = TerminalTextBuffer.backspace; break
      case 'Delete': operation = TerminalTextBuffer.deleteForward; break
      case 'ArrowLeft': operation = (value) => TerminalTextBuffer.move(value, -1); break
      case 'ArrowRight': operation = (value) => TerminalTextBuffer.move(value, 1); break
      case 'Home': operation = TerminalTextBuffer.moveToStart; break
      case 'End': operation = TerminalTextBuffer.moveToEnd; break
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          operation = (value) => TerminalTextBuffer.insert(value, event.key)
        }
    }

    if (operation == null) return false
    event.preventDefault()
    event.stopPropagation()
    update(operation)
    return true
  }

  const hasSuggestions = (): boolean => {
    const session = get(commandSessionStore)
    if (session == null || session.completionDismissed || session.input.trim() === '') return false
    return CommandRegistry.getSuggestions(CommandRunner.createContext(), session.input).length > 0
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
    setInput(suggestion.insertText ?? `${suggestion.definition.id} `)
  }

  const shouldApplySuggestion = (): boolean => {
    const session = get(commandSessionStore)
    if (session == null || session.input.trim() === '') return false
    const suggestions = CommandRegistry.getSuggestions(CommandRunner.createContext(), session.input)
    if (suggestions.length === 0) return false
    if (/\s$/.test(session.input)) return true
    const normalizedInput = session.input.trim().toLowerCase()
    return !suggestions.some((suggestion) => (
      suggestion.insertText?.trim().toLowerCase() === normalizedInput
    ))
  }

  export const movePromptFocus = (direction: -1 | 1) => {
    commandSessionStore.update((session) => {
      if (session?.prompt == null || session.prompt.choices.length === 0) return session
      return {
        ...session,
        prompt: {
          ...session.prompt,
          focus: Math.max(0, Math.min(session.prompt.choices.length - 1, session.prompt.focus + direction)),
        },
      }
    })
  }

  export const applyPrompt = async () => {
    const session = get(commandSessionStore)
    const prompt = session?.prompt
    if (prompt == null) return

    if (prompt.inputSpec != null && prompt.onInputSubmit != null) {
      const value = prompt.inputValue ?? ''
      commandSessionStore.update((current) => current == null ? current : ({ ...current, prompt: null }))
      await prompt.onInputSubmit(value)
      return
    }

    const choice = prompt.choices[prompt.focus]
    if (choice == null) return

    commandSessionStore.update((value) => value == null ? value : ({ ...value, prompt: null }))
    await prompt.onSelect(choice.id)
  }

  export const selectPrompt = async (index: number) => {
    commandSessionStore.update((session) => {
      if (session?.prompt == null) return session
      return {
        ...session,
        prompt: {
          ...session.prompt,
          focus: Math.max(0, Math.min(index, session.prompt.choices.length - 1)),
        },
      }
    })
    await applyPrompt()
  }

  export const cancelPrompt = () => {
    commandSessionStore.update((session) => session == null ? session : ({
      ...session,
      prompt: null,
    }))
  }

  export const execute = () => {
    const input = get(commandSessionStore)?.input ?? ''
    void CommandRunner.execute(input)
  }

  export const handleKeydown = (event: KeyboardEvent) => {
    if (get(commandSessionStore) == null || NativeDialogController.isActive()) return
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
      event.preventDefault()
      event.stopPropagation()
      CommandRunner.clearOutputs()
      return
    }
    if (get(commandSessionStore)?.prompt != null) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        cancelPrompt()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        movePromptFocus(1)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        movePromptFocus(-1)
        return
      }
      if (event.key === 'Enter') {
        event.preventDefault()
        event.stopPropagation()
        void applyPrompt()
        return
      }
      if (get(commandSessionStore)?.prompt?.inputSpec != null) handleTextInputKeydown(event, 'prompt')
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      if (hasSuggestions()) {
        dismissSuggestions()
        return
      }
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
      event.stopPropagation()
      if (shouldApplySuggestion()) applySuggestion()
      else execute()
      return
    }
    handleTextInputKeydown(event, 'command')
  }
}

export default CommandController
