import { PRODUCT_INFO } from '../../src/system/version'
let generation = 2
let rejected = 2
export const setFixture = (nextGeneration: number, nextRejected: number) => {
  generation = nextGeneration
  rejected = nextRejected
}
const TauriMcp = {
  diagnostics: async () => ({
    sessionId: '11111111-1111-4111-8111-111111111111',
    identity: PRODUCT_INFO,
    accepted: 3,
    rejected,
    history:
      rejected > 0
        ? Array.from({ length: 8 }, (_, i) => ({
            code: 'MCP_BRIDGE_GENERATION_MISMATCH',
            studioGen: 1,
            peerGen: generation + i,
            count: 2,
            lastAtEpochMs: 1,
          }))
        : [],
  }),
}
export default TauriMcp
