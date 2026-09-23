namespace Constants {
  export type Kind = 'constants'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'constants' })
}
export default Constants
