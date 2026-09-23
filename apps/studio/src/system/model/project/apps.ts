namespace Apps {
  export type Kind = 'apps'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'apps' })
}

export default Apps
