import { describe, expect, it, vi } from 'vitest'
import { ProjectTreeFactory } from '@system/project/tree-factory'
import BundleElementDefinition from './bundle-element-definition'
import ReleaseElementDefinition from './release-element-definition'

vi.mock('@system/workspace/tree/state', () => ({
  default: { removeNode: vi.fn() },
}))

describe('Release element structure', () => {
  it('creates the fixed Release and Bundles hierarchy', () => {
    const root = ProjectTreeFactory.createRootNode()
    expect(root.children.map((node) => node.element.kind)).toEqual([
      'apps', 'launchers', 'release', 'common', 'debug',
    ])
    const release = root.children[2]
    expect(ReleaseElementDefinition.definition.treeLabel).toMatchObject({ tone: 'manager' })
    expect(release.children).toHaveLength(1)
    expect(release.children[0].element).toEqual({ kind: 'bundles' })
  })

  it('keeps Bundle identity stable and stores ordered Launcher UUIDs', () => {
    const root = ProjectTreeFactory.createRootNode()
    const schema = BundleElementDefinition.createSchema(root)
    const bundle = schema.create({ id: 'desktop', launcherIds: '["b","a","b"]' })
    const renamed = schema.update(bundle, { id: 'production', launcherIds: '["a","b"]' })

    expect(bundle.launcherIds).toEqual(['b', 'a'])
    expect(renamed).toMatchObject({
      bundleId: bundle.bundleId,
      id: 'production',
      launcherIds: ['a', 'b'],
    })
  })

  it('separates Bundle targets from build revision details', () => {
    const schema = BundleElementDefinition.createSchema(ProjectTreeFactory.createRootNode())

    expect(schema.tabs).toEqual([
      { id: 'targets', label: 'Targets' },
      { id: 'revision', label: 'Revision' },
    ])
    expect(schema.fields.find((field) => field.key === 'id'))
      .toMatchObject({ tab: 'targets' })
    expect(schema.fields.find((field) => field.key === 'launcherIds'))
      .toMatchObject({ tab: 'targets' })
    expect(schema.fields.find((field) => field.key === 'generation'))
      .toMatchObject({ tab: 'revision', readOnly: true })
    expect(schema.fields.find((field) => field.key === 'contentHash'))
      .toMatchObject({ tab: 'revision', readOnly: true })
    expect(schema.fields.find((field) => field.key === 'builtAt'))
      .toMatchObject({ tab: 'revision', readOnly: true })
  })
})
