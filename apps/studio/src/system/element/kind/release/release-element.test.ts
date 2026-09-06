import { describe, expect, it, vi } from 'vitest'
import TreeNode from '../../../tree/tree-node'
import BundleElement from './bundle-element'
import ReleaseElement from './release-element'

vi.mock('../../../store/tree-store', () => ({
  default: { removeNode: vi.fn() },
}))

describe('Release element structure', () => {
  it('creates the fixed Release and Bundles hierarchy', () => {
    const root = TreeNode.createRootNode()
    expect(root.children.map((node) => node.element.kind)).toEqual([
      'apps', 'launchers', 'release', 'common', 'debug',
    ])
    const release = root.children[2]
    expect(ReleaseElement.definition.treeLabel).toMatchObject({ tone: 'manager' })
    expect(release.children).toHaveLength(1)
    expect(release.children[0].element).toEqual({ kind: 'bundles' })
  })

  it('keeps Bundle identity stable and stores ordered Launcher UUIDs', () => {
    const root = TreeNode.createRootNode()
    const schema = BundleElement.createSchema(root)
    const bundle = schema.create({ id: 'desktop', launcherIds: '["b","a","b"]' })
    const renamed = schema.update(bundle, { id: 'production', launcherIds: '["a","b"]' })

    expect(bundle.launcherIds).toEqual(['b', 'a'])
    expect(renamed).toMatchObject({
      bundleId: bundle.bundleId,
      id: 'production',
      launcherIds: ['a', 'b'],
    })
  })
})
