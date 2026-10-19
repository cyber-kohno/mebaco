namespace Loop {
  export type Kind = 'loop'

  export type CountElement = {
    kind: Kind
    mode: 'count'
    countSource: string
    indexId: string
  }

  export type CollectionElement = {
    kind: Kind
    mode: 'collection'
    collectionSource: string
    itemId: string
    indexId: string
  }

  export type Element = CountElement | CollectionElement

  export const createCount = (
    countSource: string,
    indexId: string,
  ): CountElement => ({
    kind: 'loop',
    mode: 'count',
    countSource,
    indexId,
  })

  export const createCollection = (
    collectionSource: string,
    itemId: string,
    indexId: string,
  ): CollectionElement => ({
    kind: 'loop',
    mode: 'collection',
    collectionSource,
    itemId,
    indexId,
  })
}

export default Loop
