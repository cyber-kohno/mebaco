export type ProductIdentity = Readonly<{
  releaseVersion: string
  bridgeProtocolGen: number
  apiGen: number
  schemaGen: number
}>
export const root: string
export const identityInputs: string[]
export function generationConstants(source: string): {
  API_GEN: number
  SCHEMA_GEN: number
}
export function validateIdentity(
  release: unknown,
  generations: unknown,
): ProductIdentity
export function cargoPackageVersion(source: string): string
export function loadStudioMcpIdentity(base?: string): ProductIdentity
export function studioMcpIdentityPlugin(): import('../apps/studio/node_modules/vite').Plugin
