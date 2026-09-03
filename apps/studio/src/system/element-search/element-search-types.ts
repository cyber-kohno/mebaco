const ElementSearchTypes = {}

namespace ElementSearchTypes {
  export type Entry = {
    nodeId: number
    kind: string
    normalizedKind: string
    address: string
    idText: string
    normalizedIdText: string
  }

  export type Filter = {
    exact: boolean
    text: string
    normalizedText: string
  }

  export type Query = {
    id: Filter
    kind: Filter
  }

  export type HighlightSegment = {
    text: string
    highlighted: boolean
  }

  export type Session = {
    query: string
    entries: readonly Entry[]
    selectedIndex: number
  }
}

export default ElementSearchTypes
