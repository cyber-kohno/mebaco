import { get } from 'svelte/store'
import TreeStore from '@system/workspace/tree/state'
import RuntimeSessionStore from '@system/runtime/runtime-session-store'
import PreviewController from '@system/runtime/preview/preview-controller'
import RuntimePreviewProbe from '@system/runtime/preview/runtime-preview-probe'
import RuntimeLog from '@system/runtime/log/runtime-log'
import StorageRuntime from '@system/runtime/storage/storage-runtime'
import ResourceRuntime from '@system/runtime/resource/resource-runtime'
import type TreeNode from '@system/model/tree/tree-node'

/** Finite, scoped runtime operations. Never modifies the project tree or persistent storage. */
namespace McpPreviewController {
  let busy = false
  let opened: { previewId: string; revision: number } | null = null
  const fail = (code: string, message: string): never => { throw new RuntimePreviewProbe.Error(code, message) }
  const integer = (value: unknown, fallback: number, min: number, max: number, name: string): number => {
    if (value == null) return fallback
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      return fail('INVALID_PARAMS', `${name} must be an integer between ${min} and ${max}.`)
    }
    return value
  }
  const object = (value: unknown): Record<string, unknown> => {
    if (value == null || typeof value !== 'object' || Array.isArray(value)) return fail('INVALID_PARAMS', 'An object is required.')
    return value as Record<string, unknown>
  }
  const current = (previewId: unknown): RuntimePreviewProbe.Session => {
    const inspection = get(RuntimeSessionStore.store)?.inspection
    if (typeof previewId !== 'string' || inspection == null || inspection.previewId !== previewId || opened?.previewId !== previewId) {
      return fail('PREVIEW_NOT_AVAILABLE', 'previewId must identify the current MCP-owned preview. Start a new preview if it was closed.')
    }
    return inspection
  }

  export const supports = (method: string): boolean => ['startPreview', 'inspectPreview', 'interactPreview', 'closePreview'].includes(method)

  export const handle = async (method: string, params: unknown): Promise<unknown> => {
    if (busy) return fail('PREVIEW_BUSY', 'Another preview request is running. Retry after it completes.')
    busy = true
    try {
      const args = object(params)
      if (method === 'closePreview') {
        current(args.previewId)
        PreviewController.close()
        opened = null
        return { previewId: args.previewId, closed: true }
      }
      const timeoutMs = integer(args.timeoutMs, 500, 0, 2000, 'timeoutMs')
      const maxElements = integer(args.maxElements, 200, 1, 500, 'maxElements')
      const maxTextLength = integer(args.maxTextLength, 4096, 1, 16000, 'maxTextLength')
      let inspection: RuntimePreviewProbe.Session
      let settled: boolean
      if (method === 'startPreview') {
        const revision = get(TreeStore.revision)
        if (args.expectedRevision !== revision) return fail('REVISION_CONFLICT', `Expected revision ${String(args.expectedRevision)}, actual ${revision}. Read the current revision first.`)
        if (get(RuntimeSessionStore.store) != null) return fail('PREVIEW_ALREADY_OPEN', 'A preview is already open. Close it explicitly before starting an MCP preview; it will not be replaced.')
        if (typeof args.appId !== 'string' || args.appId.length === 0 || args.appId.length > 128) return fail('INVALID_PARAMS', 'appId must be an application definition ID.')
        if (args.launcherId != null && (typeof args.launcherId !== 'string' || args.launcherId.length > 128)) return fail('INVALID_PARAMS', 'launcherId must be a string of at most 128 characters.')
        const viewportArgs = args.viewport == null ? {} : object(args.viewport)
        const viewport = {
          width: integer(viewportArgs.width, 1024, 128, 3840, 'viewport.width'),
          height: integer(viewportArgs.height, 768, 128, 2160, 'viewport.height'),
        }
        const launchValues = args.launchValues == null ? undefined : object(args.launchValues)
        if (JSON.stringify(launchValues ?? {}).length > 64000) return fail('INVALID_PARAMS', 'launchValues must be at most 64000 JSON characters.')
        // Snapshot the unsaved model, so later project editing cannot mutate this runtime.
        const projectNode = JSON.parse(JSON.stringify(get(TreeStore.rootNode))) as TreeNode.Node
        inspection = new RuntimePreviewProbe.Session(crypto.randomUUID(), viewport)
        const memory = new Map<string, unknown>()
        const storageSession = new StorageRuntime.Session(projectNode, { kind: 'development', id: inspection.previewId }, {
          invoke: (async (command: string, payload: unknown) => {
            const request = object(object(payload).request)
            const id = String(request.storageId)
            if (command === 'storage_get') return structuredClone(memory.has(id) ? memory.get(id) : request.initial)
            if (command === 'storage_set') { memory.set(id, structuredClone(request.value)); return }
            throw new Error(`Unsupported preview storage command: ${command}`)
          }) as StorageRuntime.Backend['invoke'],
        })
        const logSession = RuntimeLog.create(projectNode, { sink: {
          debug: (values) => inspection.log('debug', values), info: (values) => inspection.log('info', values),
          warn: (values) => inspection.log('warn', values), error: (values) => inspection.log('error', values),
        } })
        const resourceSession = ResourceRuntime.create(projectNode, {
          invoke: async () => { throw new Error('Resource I/O is disabled in MCP previews. Use a manually opened preview for resource-backed tests.') },
        })
        if (!PreviewController.open({ projectNode, appDefinitionId: args.appId,
          launcherId: args.launcherId as string | undefined, launchValues, resourceSession, storageSession, logSession, inspection })) {
          resourceSession.dispose()
          inspection.dispose()
          return fail('PREVIEW_START_FAILED', 'App not found or its entry component configuration is invalid.')
        }
        opened = { previewId: inspection.previewId, revision }
        settled = await inspection.settle(timeoutMs)
      } else {
        inspection = current(args.previewId)
        if (method === 'interactPreview') {
          if (opened?.revision !== get(TreeStore.revision)) return fail('STALE_PREVIEW', 'The project changed after this preview started. Close and restart it before interacting.')
          if (!['input', 'click', 'focus', 'blur', 'scroll'].includes(String(args.action))) return fail('INVALID_PARAMS', 'action must be input, click, focus, blur, or scroll.')
          if (typeof args.elementId !== 'string') return fail('INVALID_PARAMS', 'elementId is required; obtain it from inspect_preview.')
          if (args.action === 'input' && (typeof args.value !== 'string' || args.value.length > 64000)) return fail('INVALID_PARAMS', 'input value must be a string of at most 64000 characters.')
          for (const key of ['scrollTop', 'scrollLeft']) {
            if (args[key] != null && (typeof args[key] !== 'number' || !Number.isFinite(args[key]) || Math.abs(args[key] as number) > 10000000)) return fail('INVALID_PARAMS', `${key} must be a finite scroll offset within +/-10000000.`)
          }
          settled = await inspection.interact({ type: args.action as RuntimePreviewProbe.Action['type'], elementId: args.elementId,
            value: args.value as string | undefined, scrollTop: args.scrollTop as number | undefined, scrollLeft: args.scrollLeft as number | undefined }, timeoutMs)
        } else if (method === 'inspectPreview') settled = await inspection.settle(timeoutMs)
        else return fail('METHOD_NOT_FOUND', `Unsupported preview method: ${method}`)
      }
      let snapshot: unknown
      try { snapshot = { ...inspection.snapshot(maxElements, maxTextLength), ready: true } }
      catch (error) {
        if (!(error instanceof RuntimePreviewProbe.Error) || error.code !== 'PREVIEW_NOT_READY') throw error
        // Even if the view has not mounted by the deadline, return its ID so
        // the caller can inspect again or close it without trapping a session.
        snapshot = { previewId: inspection.previewId, requestedViewport: inspection.viewport, ready: false }
        settled = false
      }
      return { ...snapshot as Record<string, unknown>, settled, activeAppId: get(RuntimeSessionStore.store)?.app.appId,
        revision: opened!.revision, currentRevision: get(TreeStore.revision), stale: opened!.revision !== get(TreeStore.revision) }
    } finally { busy = false }
  }
}

export default McpPreviewController
