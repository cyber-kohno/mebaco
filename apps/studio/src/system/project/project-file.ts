import { open, save } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'
import { get } from 'svelte/store'
import JSZip from 'jszip'
import TreeStore from '../store/tree-store'
import TreeNode from '../tree/tree-node'
import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../version'
import { screenStore } from '../store/screen-store'

namespace ProjectFile {
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

  export const saveAs = async () => {
    const selectedPath = await save({
      title: 'Save Mebaco project',
      filters: [
        {
          name: 'Mebaco project',
          extensions: ['mbc'],
        },
      ],
    })
    if (selectedPath == null) return

    const zip = new JSZip()
    zip.file('manifest.json', JSON.stringify(createManifest(), null, 2))
    zip.file('project.json', JSON.stringify({ rootNode: get(TreeStore.rootNode) } satisfies ProjectJson, null, 2))
    zip.folder('assets')

    const bytes = await zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
    })
    await writeFile(ensureMbcExtension(selectedPath), bytes)
  }

  export const openFile = async () => {
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
    if (typeof selectedPath !== 'string') return

    const bytes = await readFile(selectedPath)
    const zip = await JSZip.loadAsync(bytes)
    const manifestFile = zip.file('manifest.json')
    const projectFile = zip.file('project.json')
    if (manifestFile == null || projectFile == null) {
      throw new Error('Mebaco file is missing required entries.')
    }

    parseManifest(await manifestFile.async('string'))
    const projectJson = parseProjectJson(await projectFile.async('string'))

    TreeStore.replaceRoot(projectJson.rootNode)
    screenStore.set('develop')
  }

  export const saveAsWithAlert = async () => {
    try {
      await saveAs()
    } catch (error) {
      console.error('Failed to save project:', error)
      alert(error instanceof Error ? error.message : 'Failed to save project.')
    }
  }

  export const openFileWithAlert = async () => {
    try {
      await openFile()
    } catch (error) {
      console.error('Failed to open project:', error)
      alert(error instanceof Error ? error.message : 'Failed to open project.')
    }
  }
}

export default ProjectFile
