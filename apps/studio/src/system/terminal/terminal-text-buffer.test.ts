import { describe, expect, it } from 'vitest'
import TerminalTextBuffer from './terminal-text-buffer'

describe('TerminalTextBuffer', () => {
  it('inserts text at the caret', () => {
    expect(TerminalTextBuffer.insert({ value: 'save --as', caret: 4 }, ' project'))
      .toEqual({ value: 'save project --as', caret: 12 })
  })

  it('deletes on either side of the caret', () => {
    expect(TerminalTextBuffer.backspace({ value: 'savee', caret: 5 }))
      .toEqual({ value: 'save', caret: 4 })
    expect(TerminalTextBuffer.deleteForward({ value: 'savee', caret: 4 }))
      .toEqual({ value: 'save', caret: 4 })
  })

  it('clamps caret movement to the text bounds', () => {
    expect(TerminalTextBuffer.move({ value: 'run', caret: 1 }, -10).caret).toBe(0)
    expect(TerminalTextBuffer.move({ value: 'run', caret: 1 }, 10).caret).toBe(3)
    expect(TerminalTextBuffer.moveToStart({ value: 'run', caret: 2 }).caret).toBe(0)
    expect(TerminalTextBuffer.moveToEnd({ value: 'run', caret: 0 }).caret).toBe(3)
  })
})
