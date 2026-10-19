namespace Functions {
  export type Kind = 'functions'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'functions' })
}
export default Functions
