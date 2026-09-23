namespace Language {
  export type Id = 'en' | 'ja'

  export type Definition = Readonly<{
    id: Id
    label: string
  }>

  export const defaultId: Id = 'en'

  export const definitions: readonly Definition[] = Object.freeze([
    { id: 'en', label: 'English' },
    { id: 'ja', label: '日本語' },
  ])

  export const isId = (value: string): value is Id => (
    definitions.some((definition) => definition.id === value)
  )
}

export default Language
