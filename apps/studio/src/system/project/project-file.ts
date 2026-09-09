import { get } from 'svelte/store'
import JSZip from 'jszip'
import TreeStore from '../store/tree-store'
import TreeNode from '../tree/tree-node'
import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../version'
import ToastController from '../feedback/toast/toast-controller'
import ProjectSession from './project-session-store'
import ExpressionVerificationStore from '../validation/expression/expression-verification-store'
import ResourceImportsElement from '../element/kind/app/import/resource-imports-element'
import StorageImportsElement from '../element/kind/app/import/storage-imports-element'
import StorageElement from '../element/kind/storage/storage-element'
import ReleaseElement from '../element/kind/release/release-element'
import BundlesElement from '../element/kind/release/bundles-element'
import NativeDialogController from '../ui/native-dialog-controller'
import TauriFileSystem from '../infra/tauri/filesystem'

namespace ProjectFile {
  export type SaveResult =
    | { status: 'saved'; mode: 'overwrite' | 'new'; fileName: string | null }
    | { status: 'cancelled' }
    | { status: 'unchanged' }

  type Manifest = {
    format: 'mebaco'
    appVersion: string
    schemaGen: number
    apiGen: number
  }

  type ProjectJson = {
    rootNode: TreeNode.Node
    migrationApplied?: boolean
  }

  const createManifest = (): Manifest => ({
    format: 'mebaco',
    appVersion: APP_VERSION,
    schemaGen: SCHEMA_GEN,
    apiGen: API_GEN,
  })

  const ensureMbcExtension = (filePath: string): string => (
    filePath.toLowerCase().endsWith('.mbc') ? filePath : `${filePath}.mbc`
  )

  const isTreeNode = (value: unknown): value is TreeNode.Node => {
    if (value == null || typeof value !== 'object') return false

    const node = value as Partial<TreeNode.Node>
    return (
      typeof node.id === 'number'
      && typeof node.isOpen === 'boolean'
      && node.element != null
      && typeof node.element === 'object'
      && typeof (node.element as { kind?: unknown }).kind === 'string'
      && Array.isArray(node.children)
      && node.children.every(isTreeNode)
    )
  }

  const parseManifest = (source: string): Manifest => {
    const manifest = JSON.parse(source) as Partial<Manifest>
    if (
      manifest.format !== 'mebaco'
      || manifest.schemaGen !== SCHEMA_GEN
      || manifest.apiGen !== API_GEN
    ) {
      throw new Error('Unsupported Mebaco file.')
    }

    return {
      format: manifest.format,
      appVersion: String(manifest.appVersion ?? ''),
      schemaGen: manifest.schemaGen,
      apiGen: manifest.apiGen,
    }
  }

  const parseProjectJson = (source: string): ProjectJson => {
    const projectJson = JSON.parse(source) as Partial<ProjectJson>
    if (!isTreeNode(projectJson.rootNode)) {
      throw new Error('Invalid project data.')
    }

    const rootNode = projectJson.rootNode
    const resourceIds: string[] = []
    let nextNodeId = 1
    const inspect = (node: TreeNode.Node) => {
      nextNodeId = Math.max(nextNodeId, node.id + 1)
      if (
        node.element.kind === 'directory-resource'
        || node.element.kind === 'text-resource'
        || node.element.kind === 'sqlite-resource'
      ) resourceIds.push(node.element.resourceId)
      node.children.forEach(inspect)
    }
    inspect(rootNode)

    let migrationApplied = false
    if (rootNode.element.kind === 'project' && rootNode.element.projectId == null) {
      rootNode.element.projectId = crypto.randomUUID()
      migrationApplied = true
    }
    const migrate = (node: TreeNode.Node) => {
      if (node.element.kind === 'app') {
        const imports = node.children.find((child) => child.element.kind === 'imports')
        if (
          imports != null
          && !imports.children.some((child) => child.element.kind === 'resource-imports')
        ) {
          imports.children.push({
            id: nextNodeId,
            element: {
              ...ResourceImportsElement.create(),
              resourceIds: [...resourceIds],
            },
            isOpen: true,
            children: [],
          })
          nextNodeId += 1
          migrationApplied = true
        }
        if (
          imports != null
          && !imports.children.some((child) => child.element.kind === 'storage-imports')
        ) {
          imports.children.push({
            id: nextNodeId,
            element: StorageImportsElement.create(),
            isOpen: true,
            children: [],
          })
          nextNodeId += 1
          migrationApplied = true
        }
      }
      node.children.forEach(migrate)
    }
    migrate(rootNode)

    const common = rootNode.children.find((child) => child.element.kind === 'common')
    if (common != null && !common.children.some((child) => child.element.kind === 'storage')) {
      common.children.push({
        id: nextNodeId,
        element: StorageElement.create(),
        isOpen: true,
        children: [],
      })
      nextNodeId += 1
      migrationApplied = true
    }

    let releaseNode = rootNode.children.find((child) => child.element.kind === 'release')
    if (releaseNode == null) {
      releaseNode = {
        id: nextNodeId,
        element: ReleaseElement.create(),
        isOpen: true,
        children: [],
      }
      nextNodeId += 1
      const launchersIndex = rootNode.children.findIndex((child) => child.element.kind === 'launchers')
      rootNode.children.splice(launchersIndex < 0 ? rootNode.children.length : launchersIndex + 1, 0, releaseNode)
      migrationApplied = true
    }
    if (!releaseNode.children.some((child) => child.element.kind === 'bundles')) {
      releaseNode.children.push({
        id: nextNodeId,
        element: BundlesElement.create(),
        isOpen: true,
        children: [],
      })
      nextNodeId += 1
      migrationApplied = true
    }

    return { rootNode, migrationApplied }
  }

  const writeProject = async (selectedPath: string) => {
    const targetPath = ensureMbcExtension(selectedPath)
    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify(createManifest(), null, 2))
    zip.file('project.json', JSON.stringify({ rootNode: get(TreeStore.rootNode) } satisfies ProjectJson, null, 2))
    zip.folder('assets')

    const bytes = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
    })
    await TauriFileSystem.writeBinaryFile(targetPath, bytes)
    ProjectSession.markSaved(get(TreeStore.rootNode), targetPath)
    return get(ProjectSession.store)
  }

  export const saveAs = async (): Promise<SaveResult> => {
    const selectedPath = await NativeDialogController.save({
      title: 'Save Mebaco project',
      filters: [
        {
          name: 'Mebaco project',
          extensions: ['mbc'],
        },
      ],
    })
    if (selectedPath == null) return { status: 'cancelled' }

    const session = await writeProject(selectedPath)
    return { status: 'saved', mode: 'new', fileName: session.fileName }
  }

  export const save = async (): Promise<SaveResult> => {
    const session = get(ProjectSession.store)
    if (session.path == null) {
      return saveAs()
    }
    if (!session.isDirty) return { status: 'unchanged' }

    await writeProject(session.path)
    ToastController.show('Project saved successfully.', { tone: 'success' })
    return { status: 'saved', mode: 'overwrite', fileName: session.fileName }
  }

  export const openFile = async (): Promise<boolean> => {
    const selectedPath = await NativeDialogController.open({
      title: 'Open Mebaco project',
      multiple: false,
      filters: [
        {
          name: 'Mebaco project',
          extensions: ['mbc'],
        },
      ],
    })
    if (typeof selectedPath !== 'string') return false

    const bytes = await TauriFileSystem.readBinaryFile(selectedPath)
    const zip = await JSZip.loadAsync(bytes)
    const manifestFile = zip.file('manifest.json')
    const projectFile = zip.file('project.json')
    if (manifestFile == null || projectFile == null) {
      throw new Error('Mebaco file is missing required entries.')
    }

    parseManifest(await manifestFile.async('string'))
    const projectJson = parseProjectJson(await projectFile.async('string'))

    ExpressionVerificationStore.clear()
    TreeStore.replaceRoot(projectJson.rootNode)
    ProjectSession.markSaved(get(TreeStore.rootNode), selectedPath)
    if (projectJson.migrationApplied === true) ProjectSession.markDirty()
    return true
  }

  export const startEmpty = () => {
    ExpressionVerificationStore.clear()
    TreeStore.replaceRoot(TreeNode.createRootNode())
    ProjectSession.startNew(get(TreeStore.rootNode))
  }

  export const close = () => {
    ExpressionVerificationStore.clear()
    ProjectSession.clear()
    TreeStore.replaceRoot(TreeNode.createRootNode())
  }

  export const saveWithAlert = async () => {
    try {
      await save()
    } catch (error) {
      console.error('Failed to save project:', error)
      alert(error instanceof Error ? error.message : 'Failed to save project.')
    }
  }

  export const saveAsWithAlert = async () => {
    try {
      await saveAs()
    } catch (error) {
      console.error('Failed to save project:', error)
      alert(error instanceof Error ? error.message : 'Failed to save project.')
    }
  }

  export const openFileWithAlert = async (): Promise<boolean> => {
    try {
      return await openFile()
    } catch (error) {
      console.error('Failed to open project:', error)
      alert(error instanceof Error ? error.message : 'Failed to open project.')
      return false
    }
  }
}

export default ProjectFile
