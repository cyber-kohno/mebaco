namespace StorageImports {
  export type Kind = 'storage-imports'
  export type Element = { kind: Kind; storageIds: string[] }

  export const create = (): Element => ({ kind: 'storage-imports', storageIds: [] })
}

export default StorageImports
