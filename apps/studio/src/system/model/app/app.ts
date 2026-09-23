namespace App {
  export type Kind = 'app'

  export type Element = {
    kind: Kind
    appId: string
    id: string
  }

  export const create = (
    id: string,
    appId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'app',
    appId,
    id,
  })
}

export default App
