import { beforeEach, describe, expect, it, vi } from 'vitest'
import type TreeNode from '@system/model/tree/tree-node'

const mocks = vi.hoisted(() => {
  let root: unknown = null
  return {
    verify: vi.fn(),
    setResult: vi.fn(),
    rootNode: {
      subscribe: (subscriber: (value: unknown) => void) => {
        subscriber(root)
        return () => {}
      },
      set: (value: unknown) => { root = value },
    },
  }
})

vi.mock('@system/workspace/tree/state', () => ({
  default: { rootNode: mocks.rootNode },
}))
vi.mock('@system/application/validation/expression', () => ({
  ExpressionVerificationRunner: { verify: mocks.verify },
}))
vi.mock('@system/workspace/validation/state', () => ({
  ExpressionVerificationStore: { setResult: mocks.setResult },
}))

import ElementAutoVerification from './element-auto-verification'

const createRoot = (source: string): TreeNode.Node => ({
  id: 1,
  element: { kind: 'project' },
  isOpen: true,
  children: [{
    id: 2,
    element: { kind: 'text', source: { type: 'formula', source } },
    isOpen: true,
    children: [],
  }],
})

describe('ElementAutoVerification', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores the Verify result for the unchanged committed tree', async () => {
    const root = createRoot('$state.title')
    mocks.rootNode.set(root)
    const result = { status: 'verified' as const, messages: [] }
    mocks.verify.mockResolvedValue(result)

    await ElementAutoVerification.verify(2)

    expect(mocks.verify).toHaveBeenCalledWith(root, root.children[0])
    expect(mocks.setResult).toHaveBeenCalledWith(root.children[0], result)
  })

  it('discards an asynchronous result after the tree changes', async () => {
    const root = createRoot('$state.title')
    mocks.rootNode.set(root)
    let finish: ((value: { status: 'verified'; messages: never[] }) => void) | undefined
    mocks.verify.mockReturnValue(new Promise((resolve) => { finish = resolve }))

    const verification = ElementAutoVerification.verify(2)
    mocks.rootNode.set(createRoot('$state.heading'))
    finish?.({ status: 'verified', messages: [] })
    await verification

    expect(mocks.setResult).not.toHaveBeenCalled()
  })
})
