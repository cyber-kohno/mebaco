namespace TerminalTextBuffer {
  export type Value = {
    value: string
    caret: number
  }

  const clampCaret = (value: string, caret: number): number => (
    Math.max(0, Math.min(value.length, caret))
  )

  export const normalize = (state: Value): Value => ({
    value: state.value,
    caret: clampCaret(state.value, state.caret),
  })

  export const insert = (state: Value, text: string): Value => {
    const current = normalize(state)
    return {
      value: `${current.value.slice(0, current.caret)}${text}${current.value.slice(current.caret)}`,
      caret: current.caret + text.length,
    }
  }

  export const backspace = (state: Value): Value => {
    const current = normalize(state)
    if (current.caret === 0) return current
    return {
      value: `${current.value.slice(0, current.caret - 1)}${current.value.slice(current.caret)}`,
      caret: current.caret - 1,
    }
  }

  export const deleteForward = (state: Value): Value => {
    const current = normalize(state)
    if (current.caret === current.value.length) return current
    return {
      value: `${current.value.slice(0, current.caret)}${current.value.slice(current.caret + 1)}`,
      caret: current.caret,
    }
  }

  export const move = (state: Value, offset: number): Value => ({
    value: state.value,
    caret: clampCaret(state.value, state.caret + offset),
  })

  export const moveToStart = (state: Value): Value => ({ value: state.value, caret: 0 })
  export const moveToEnd = (state: Value): Value => ({ value: state.value, caret: state.value.length })
}

export default TerminalTextBuffer
