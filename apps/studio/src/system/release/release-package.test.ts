import { describe, expect, it, vi } from 'vitest'
import JSZip from 'jszip'
import type TreeNode from '../tree/tree-node'
import type BundleElement from '../element/kind/release/bundle-element'

vi.mock('../validation/expression/expression-source-catalog', () => ({
  default: { isVerificationCandidate: () => false },
}))
vi.mock('../validation/expression/expression-verification-runner', () => ({
  default: { verify: vi.fn() },
}))
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn() }))
vi.mock('@tauri-apps/plugin-fs', () => ({ writeFile: vi.fn() }))

import ReleasePackage from './release-package'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('Release Package archive', () => {
  it('writes a versioned manifest and runtime module without Release settings', async () => {
    const component = node(9, { kind: 'component', id: 'Main', componentId: 'main-component' })
    const app = node(5, { kind: 'app', id: 'sample-app', appId: 'sample-app-id' }, [
      node(6, { kind: 'entry', componentId: 'main-component', propBindings: [] }),
      node(7, { kind: 'declares' }, [node(8, { kind: 'components' }, [component])]),
    ])
    const launcher = node(4, {
      kind: 'launcher', launcherId: 'launcher-id', id: 'sample', name: 'Sample',
      appId: 'sample-app-id', argumentBindings: [],
    })
    const bundle: BundleElement.Element = {
      kind: 'bundle', bundleId: 'bundle-id', id: 'desktop', launcherIds: ['launcher-id'],
    }
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'launchers' }, [launcher]),
      node(3, { kind: 'apps' }, [app]),
      node(10, { kind: 'common' }, [node(11, { kind: 'resources' })]),
      node(12, { kind: 'release' }, [node(13, { kind: 'bundles' }, [node(14, bundle)])]),
    ])

    const unbuiltArchive = await ReleasePackage.createArchive(root, bundle)
    expect('errors' in unbuiltArchive ? unbuiltArchive.errors : []).toContain(
      "Bundle 'desktop' has not been built. Run 'build desktop' before releasing.",
    )

    const candidate = await ReleasePackage.createRevisionCandidate(root, bundle)
    expect(candidate).not.toHaveProperty('errors')
    if ('errors' in candidate) return
    bundle.revision = {
      generation: 1,
      contentHash: candidate.contentHash,
      builtAt: '2026-09-09T00:00:00.000Z',
    }
    const archive = await ReleasePackage.createArchive(root, bundle)
    expect(archive).not.toHaveProperty('errors')
    if ('errors' in archive) return

    const zip = await JSZip.loadAsync(archive.bytes)
    const manifest = JSON.parse(await zip.file('manifest.json')!.async('string'))
    const moduleJson = JSON.parse(await zip.file('module.json')!.async('string'))

    expect(manifest).toMatchObject({
      format: 'mebaco-app', formatVersion: 1,
      bundle: {
        bundleId: 'bundle-id', id: 'desktop', generation: 1,
        contentHash: candidate.contentHash, builtAt: '2026-09-09T00:00:00.000Z',
        launcherCount: 1, appCount: 1,
      },
    })
    expect(moduleJson.bundle.launcherIds).toEqual(['launcher-id'])
    expect(moduleJson.launchers[0]).toMatchObject({ launcherId: 'launcher-id' })
    expect(moduleJson.apps[0]).toMatchObject({ element: { appId: 'sample-app-id' } })
    expect(moduleJson.common.children).toEqual([])
    expect(JSON.stringify(moduleJson)).not.toContain('"kind":"release"')

    ;(component.element as { id: string }).id = 'ChangedMain'
    const staleArchive = await ReleasePackage.createArchive(root, bundle)
    expect('errors' in staleArchive ? staleArchive.errors : []).toContain(
      "Bundle 'desktop' has changed since Revision 1 was built. Run 'build desktop' before releasing.",
    )
  })
})
