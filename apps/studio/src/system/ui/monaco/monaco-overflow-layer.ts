namespace MonacoOverflowLayer {
  export type Layer = {
    element: HTMLDivElement
    destroy: () => void
  }

  export const create = (): Layer => {
    const element = document.createElement('div')
    element.className = 'monaco-editor vs mebaco-monaco-overflow-layer'
    document.body.append(element)

    return {
      element,
      destroy: () => {
        element.remove()
      },
    }
  }
}

export default MonacoOverflowLayer
