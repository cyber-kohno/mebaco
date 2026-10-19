declare module 'virtual:mebaco-product-info' {
  const identity: Readonly<{
    releaseVersion: string
    bridgeProtocolGen: number
    apiGen: number
    schemaGen: number
  }>
  export default identity
}
