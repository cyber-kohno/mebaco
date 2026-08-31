import { open, save as saveDialog } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'
import { get } from 'svelte/store'
import JSZip from 'jszip'
import TreeStore from '../store/tree-store'
import TreeNode from '../tree/tree-node'
import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../version'
import ToastController from '../feedback/toast/toast-controller'
import ProjectSession from './project-session-store'
import ExpressionVerificationStore from '../validation/expression/expression-verification-store'

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

    return {
      rootNode: projectJson.rootNode,
    }
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
    await writeFile(targetPath, bytes)
    ProjectSession.markSaved(get(TreeStore.rootNode), targetPath)
    return get(ProjectSession.store)
  }

  export const saveAs = async (): Promise<SaveResult> => {
    const selectedPath = await saveDialog({
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
    const selectedPath = await open({
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

    const bytes = await readFile(selectedPath)
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
