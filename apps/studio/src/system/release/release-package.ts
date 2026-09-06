import { save as saveDialog } from '@tauri-apps/plugin-dialog'
import { writeFile } from '@tauri-apps/plugin-fs'
import JSZip from 'jszip'
import type TreeNode from '../tree/tree-node'
import type BundleElement from '../element/kind/release/bundle-element'
import ReleaseBundle from './release-bundle'
import ExpressionSourceCatalog from '../validation/expression/expression-source-catalog'
import ExpressionVerificationRunner from '../validation/expression/expression-verification-runner'
import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../version'

namespace ReleasePackage {
  export type SaveResult =
    | { status: 'saved'; fileName: string }
    | { status: 'cancelled' }
    | { status: 'invalid'; errors: readonly string[] }

  export type Manifest = {
    format: 'mebaco-app'
    formatVersion: 1
    appVersion: string
    schemaGen: number
    apiGen: number
    createdAt: string
    bundle: {
      bundleId: string
      id: string
      launcherCount: number
      appCount: number
      resourceCount: number
    }
  }

  export type ModuleJson = {
    bundle: {
      bundleId: string
      id: string
      launcherIds: readonly string[]
    }
    launchers: readonly ReleaseBundle.LauncherNode['element'][]
    apps: readonly TreeNode.Node[]
    common: TreeNode.Node | null
    resources: readonly ReleaseBundle.ResourceNode['element'][]
  }

  const ensureExtension = (path: string): string => (
    path.toLowerCase().endsWith('.mbcapp') ? path : `${path}.mbcapp`
  )

  const fileNameFromPath = (path: string): string => (
    path.replaceAll('\\', '/').split('/').at(-1) ?? path
  )

  const collectNodes = (
    roots: readonly TreeNode.Node[],
  ): TreeNode.Node[] => {
    const result: TreeNode.Node[] = []
    const seen = new Set<number>()
    const visit = (node: TreeNode.Node) => {
      if (seen.has(node.id)) return
      seen.add(node.id)
      result.push(node)
      node.children.forEach(visit)
    }
    roots.forEach(visit)
    return result
  }

  const getCommonModule = (rootNode: TreeNode.Node): TreeNode.Node | null => {
    const common = rootNode.children.find((node) => node.element.kind === 'common')
    if (common == null) return null
    return {
      ...common,
      children: common.children.filter((node) => node.element.kind !== 'resources'),
    }
  }

  const verifyExpressions = async (
    rootNode: TreeNode.Node,
    analysis: ReleaseBundle.Analysis,
  ): Promise<string[]> => {
    const common = rootNode.children.find((node) => node.element.kind === 'common')
    const nodes = collectNodes([
      ...analysis.apps,
      ...(common == null ? [] : [common]),
    ])
    const errors: string[] = []

    for (const node of nodes) {
      if (!ExpressionSourceCatalog.isVerificationCandidate(rootNode, node)) continue
      const result = await ExpressionVerificationRunner.verify(rootNode, node)
      if (result?.status !== 'error') continue
      const detail = result.messages.join(' ')
      errors.push(`node-${node.id} ${node.element.kind}: ${detail || 'Expression verification failed.'}`)
    }
    return errors
  }

  export const createArchive = async (
    rootNode: TreeNode.Node,
    bundle: BundleElement.Element,
  ): Promise<{ bytes: Uint8Array; analysis: ReleaseBundle.Analysis } | { errors: readonly string[] }> => {
    const analysis = ReleaseBundle.analyze(rootNode, bundle.launcherIds)
    if (analysis.errors.length > 0) return { errors: analysis.errors }

    const expressionErrors = await verifyExpressions(rootNode, analysis)
    if (expressionErrors.length > 0) return { errors: expressionErrors }

    const manifest: Manifest = {
      format: 'mebaco-app',
      formatVersion: 1,
      appVersion: APP_VERSION,
      schemaGen: SCHEMA_GEN,
      apiGen: API_GEN,
      createdAt: new Date().toISOString(),
      bundle: {
        bundleId: bundle.bundleId,
        id: bundle.id,
        launcherCount: analysis.launchers.length,
        appCount: analysis.apps.length,
        resourceCount: analysis.resources.length,
      },
    }
    const moduleJson: ModuleJson = {
      bundle: {
        bundleId: bundle.bundleId,
        id: bundle.id,
        launcherIds: bundle.launcherIds,
      },
      launchers: analysis.launchers.map((node) => node.element),
      apps: analysis.apps,
      common: getCommonModule(rootNode),
      resources: analysis.resources.map((node) => node.element),
    }
    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify(manifest, null, 2))
    zip.file('module.json', JSON.stringify(moduleJson, null, 2))
    zip.folder('assets')
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' })
    return { bytes, analysis }
  }

  export const save = async (
    rootNode: TreeNode.Node,
    bundle: BundleElement.Element,
  ): Promise<SaveResult> => {
    const archive = await createArchive(rootNode, bundle)
    if ('errors' in archive) return { status: 'invalid', errors: archive.errors }

    const selectedPath = await saveDialog({
      title: `Save Mebaco Application Package — ${bundle.id}`,
      defaultPath: `${bundle.id}.mbcapp`,
      filters: [{ name: 'Mebaco Application Package', extensions: ['mbcapp'] }],
    })
    if (selectedPath == null) return { status: 'cancelled' }

    const targetPath = ensureExtension(selectedPath)
    await writeFile(targetPath, archive.bytes)
    return { status: 'saved', fileName: fileNameFromPath(targetPath) }
  }
}

export default ReleasePackage
