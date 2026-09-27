import TauriMcp from '@system/infra/tauri/mcp'
import { get } from 'svelte/store'
import McpSessionState from './mcp-session-state'
import ConfirmDialogController from '@system/ui/feedback/confirm/confirm-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import ProjectSession from '@system/project/project-session-store'
import { createMcpProjectSummary } from './mcp-project-summary'
import TreeNode from '@system/model/tree/tree-node'
import TreeViewportController from '@system/workspace/tree/tree-viewport-controller'
import McpProjectReader from './mcp-project-reader'
import ElementRegistry from '@system/workspace/element-definition/element-registry'
import Tag from '@system/model/view/tag'
import Text from '@system/model/view/text'
import HtmlTag from '@system/model/element/html-tag'
import TagAttributeCatalog from '@system/model/view/tag-attribute-catalog'
import ResolvableValue from '@system/model/value/resolvable-value'

namespace McpToolHandler {
  const handle = async (request: TauriMcp.BridgeRequest): Promise<void> => {
    if (get(McpSessionState.store) === 'available') {
      McpSessionState.set('connected')
    }

    try {
      if (request.method === 'ping') {
        await TauriMcp.respond({
          id: request.id,
          result: { application: 'Mebaco Studio', status: 'ready' },
        })
        return
      }

      if (
        get(McpSessionState.detailsStore) == null
        || !['available', 'connected'].includes(get(McpSessionState.store))
        || get(ProjectSession.store).savedFingerprint == null
      ) {
        await TauriMcp.respond({
          id: request.id,
          error: {
            code: 'SESSION_NOT_AVAILABLE',
            message: 'The selected Mebaco Studio development session is no longer available.',
          },
        })
        return
      }

      if (request.method === 'showMessage') {
        const message = typeof request.params === 'object'
          && request.params != null
          && 'message' in request.params
          && typeof request.params.message === 'string'
          ? request.params.message.trim()
          : ''
        if (message === '' || message.length > 2000) {
          await TauriMcp.respond({
            id: request.id,
            error: {
              code: 'INVALID_PARAMS',
              message: 'message must contain between 1 and 2000 characters.',
            },
          })
          return
        }
        void ConfirmDialogController.openNotice({
          title: 'MCP message',
          message,
        })
        await TauriMcp.respond({
          id: request.id,
          result: { displayed: true },
        })
        return
      }

      if (request.method === 'getProjectSummary') {
        const summary = createMcpProjectSummary(
          get(TreeStore.rootNode),
          get(TreeStore.selectedNodeId),
          get(ProjectSession.store).isDirty,
          get(TreeStore.revision),
        )
        await TauriMcp.respond({ id: request.id, result: summary })
        return
      }

      if (request.method === 'getProjectOverview') {
        await TauriMcp.respond({
          id: request.id,
          result: McpProjectReader.getProjectOverview({
            rootNode: get(TreeStore.rootNode),
            dirty: get(ProjectSession.store).isDirty,
            revision: get(TreeStore.revision),
            sessionId: get(McpSessionState.detailsStore)?.sessionId ?? null,
          }),
        })
        return
      }

      if (request.method === 'getAppContext') {
        const appId = typeof request.params === 'object'
          && request.params != null
          && 'appId' in request.params
          && typeof request.params.appId === 'string'
          ? request.params.appId
          : ''
        if (appId === '') {
          await TauriMcp.respond({
            id: request.id,
            error: { code: 'INVALID_PARAMS', message: 'appId must be a non-empty string.' },
          })
          return
        }
        const result = McpProjectReader.getAppContext({
          rootNode: get(TreeStore.rootNode),
          dirty: get(ProjectSession.store).isDirty,
          revision: get(TreeStore.revision),
          sessionId: get(McpSessionState.detailsStore)?.sessionId ?? null,
        }, appId)
        const error = 'error' in result ? result.error as { code: string; message: string } : null
        await TauriMcp.respond(error == null
          ? { id: request.id, result }
          : { id: request.id, error })
        return
      }

      if (request.method === 'getAppAnalysisContext') {
        const params = typeof request.params === 'object' && request.params != null
          ? request.params as Record<string, unknown>
          : {}
        const appId = typeof params.appId === 'string' ? params.appId : ''
        const maxNodes = params.maxNodes ?? 200
        if (appId === '') {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'appId must be a non-empty string.' } })
          return
        }
        if (typeof maxNodes !== 'number' || !Number.isInteger(maxNodes) || maxNodes < 1 || maxNodes > 300) {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'maxNodes must be an integer from 1 to 300.' } })
          return
        }
        const result = McpProjectReader.getAppAnalysisContext({
          rootNode: get(TreeStore.rootNode),
          dirty: get(ProjectSession.store).isDirty,
          revision: get(TreeStore.revision),
          sessionId: get(McpSessionState.detailsStore)?.sessionId ?? null,
        }, appId, maxNodes)
        const error = 'error' in result ? result.error as { code: string; message: string } : null
        await TauriMcp.respond(error == null ? { id: request.id, result } : { id: request.id, error })
        return
      }

      if (request.method === 'getComponentStructure') {
        const params = typeof request.params === 'object' && request.params != null
          ? request.params as Record<string, unknown>
          : {}
        const componentId = typeof params.componentId === 'string' ? params.componentId : ''
        if (componentId === '') {
          await TauriMcp.respond({
            id: request.id,
            error: { code: 'INVALID_PARAMS', message: 'componentId must be a non-empty string.' },
          })
          return
        }
        const isInteger = (value: unknown): value is number => (
          typeof value === 'number' && Number.isInteger(value)
        )
        if (
          params.maxDepth != null && !isInteger(params.maxDepth)
          || params.maxNodes != null && !isInteger(params.maxNodes)
        ) {
          await TauriMcp.respond({
            id: request.id,
            error: { code: 'INVALID_PARAMS', message: 'maxDepth and maxNodes must be integers.' },
          })
          return
        }
        const result = McpProjectReader.getComponentStructure({
          rootNode: get(TreeStore.rootNode),
          dirty: get(ProjectSession.store).isDirty,
          revision: get(TreeStore.revision),
          sessionId: get(McpSessionState.detailsStore)?.sessionId ?? null,
        }, componentId, {
          maxDepth: isInteger(params.maxDepth) ? params.maxDepth : undefined,
          maxNodes: isInteger(params.maxNodes) ? params.maxNodes : undefined,
        })
        const error = 'error' in result ? result.error as { code: string; message: string } : null
        await TauriMcp.respond(error == null
          ? { id: request.id, result }
          : { id: request.id, error })
        return
      }

      if (request.method === 'getNodeDetails') {
        const params = typeof request.params === 'object' && request.params != null
          ? request.params as Record<string, unknown>
          : {}
        const nodeId = typeof params.nodeId === 'number' && Number.isInteger(params.nodeId)
          ? params.nodeId
          : null
        if (nodeId == null || nodeId < 0) {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'nodeId must be a non-negative integer.' } })
          return
        }
        if (params.includeSource != null && typeof params.includeSource !== 'boolean') {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'includeSource must be a boolean.' } })
          return
        }
        const result = McpProjectReader.getNodeDetails({
          rootNode: get(TreeStore.rootNode),
          dirty: get(ProjectSession.store).isDirty,
          revision: get(TreeStore.revision),
          sessionId: get(McpSessionState.detailsStore)?.sessionId ?? null,
        }, nodeId, params.includeSource === true)
        const error = 'error' in result ? result.error as { code: string; message: string } : null
        await TauriMcp.respond(error == null ? { id: request.id, result } : { id: request.id, error })
        return
      }

      if (request.method === 'getNodeReferences') {
        const params = typeof request.params === 'object' && request.params != null
          ? request.params as Record<string, unknown>
          : {}
        const nodeId = typeof params.nodeId === 'number' && Number.isInteger(params.nodeId)
          ? params.nodeId
          : null
        const direction = params.direction ?? 'both'
        const limit = params.limit ?? 50
        if (nodeId == null || nodeId < 0) {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'nodeId must be a non-negative integer.' } })
          return
        }
        if (!['incoming', 'outgoing', 'both'].includes(direction as string)) {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'direction must be incoming, outgoing, or both.' } })
          return
        }
        if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 200) {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'limit must be an integer from 1 to 200.' } })
          return
        }
        const result = McpProjectReader.getNodeReferences({
          rootNode: get(TreeStore.rootNode),
          dirty: get(ProjectSession.store).isDirty,
          revision: get(TreeStore.revision),
          sessionId: get(McpSessionState.detailsStore)?.sessionId ?? null,
        }, nodeId, direction as 'incoming' | 'outgoing' | 'both', limit)
        const error = 'error' in result ? result.error as { code: string; message: string } : null
        await TauriMcp.respond(error == null ? { id: request.id, result } : { id: request.id, error })
        return
      }

      if (request.method === 'setNodeDisabled') {
        const params = typeof request.params === 'object' && request.params != null
          ? request.params as Record<string, unknown>
          : {}
        const nodeId = typeof params.nodeId === 'number' && Number.isInteger(params.nodeId)
          ? params.nodeId
          : null
        const expectedRevision = typeof params.expectedRevision === 'number'
          && Number.isSafeInteger(params.expectedRevision)
          && params.expectedRevision >= 0
          ? params.expectedRevision
          : null
        const dryRun = params.dryRun ?? false
        if (
          nodeId == null
          || nodeId < 0
          || expectedRevision == null
          || typeof params.disabled !== 'boolean'
          || typeof dryRun !== 'boolean'
        ) {
          await TauriMcp.respond({
            id: request.id,
            error: {
              code: 'INVALID_PARAMS',
              message: 'nodeId, expectedRevision, disabled, and dryRun must have valid types.',
            },
          })
          return
        }

        const actualRevision = get(TreeStore.revision)
        if (expectedRevision !== actualRevision) {
          await TauriMcp.respond({
            id: request.id,
            error: {
              code: 'REVISION_CONFLICT',
              message: `Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`,
              expectedRevision,
              actualRevision,
            },
          })
          return
        }

        const node = TreeNode.findNode(get(TreeStore.rootNode), nodeId)
        if (node == null) {
          await TauriMcp.respond({
            id: request.id,
            error: { code: 'NODE_NOT_FOUND', message: 'No node matches the supplied nodeId.' },
          })
          return
        }
        if (!ElementRegistry.get(node.element.kind).canDisable) {
          await TauriMcp.respond({
            id: request.id,
            error: {
              code: 'EDIT_NOT_SUPPORTED',
              message: `Nodes of kind ${node.element.kind} cannot be disabled.`,
            },
          })
          return
        }

        const previousDisabled = node.disabled === true
        try {
          const transaction = TreeStore.transaction(
            {
              source: 'mcp',
              label: `${params.disabled ? 'Disable' : 'Enable'} node ${nodeId}`,
              expectedRevision,
            },
            () => {
              if (dryRun || previousDisabled === params.disabled) return false
              return TreeStore.transformNode(nodeId, (target) => {
                target.disabled = params.disabled as boolean
                return true
              })
            },
          )
          await TauriMcp.respond({
            id: request.id,
            result: {
              nodeId,
              dryRun,
              changed: dryRun ? false : transaction.changed,
              wouldChange: previousDisabled !== params.disabled,
              previousRevision: expectedRevision,
              revision: get(TreeStore.revision),
              previousDisabled,
              disabled: params.disabled,
            },
          })
        } catch (error) {
          if (error instanceof TreeStore.RevisionConflictError) {
            await TauriMcp.respond({
              id: request.id,
              error: {
                code: error.code,
                message: error.message,
                expectedRevision: error.expectedRevision,
                actualRevision: error.actualRevision,
              },
            })
            return
          }
          throw error
        }
        return
      }

      if (request.method === 'updateNodeProperty') {
        const params = typeof request.params === 'object' && request.params != null
          ? request.params as Record<string, unknown>
          : {}
        const nodeId = typeof params.nodeId === 'number' && Number.isInteger(params.nodeId) ? params.nodeId : null
        const expectedRevision = typeof params.expectedRevision === 'number'
          && Number.isSafeInteger(params.expectedRevision) && params.expectedRevision >= 0
          ? params.expectedRevision : null
        const property = typeof params.property === 'string' ? params.property : ''
        const value = params.value
        const dryRun = params.dryRun ?? false
        if (nodeId == null || nodeId < 0 || expectedRevision == null || !['comment', 'tagName', 'source'].includes(property) || typeof dryRun !== 'boolean') {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'nodeId, expectedRevision, property, value, and dryRun must have valid types.' } })
          return
        }
        if (get(TreeStore.revision) !== expectedRevision) {
          await TauriMcp.respond({ id: request.id, error: { code: 'REVISION_CONFLICT', message: `Tree revision conflict: expected ${expectedRevision}, actual ${get(TreeStore.revision)}.`, expectedRevision, actualRevision: get(TreeStore.revision) } })
          return
        }
        const node = TreeNode.findNode(get(TreeStore.rootNode), nodeId)
        if (node == null) {
          await TauriMcp.respond({ id: request.id, error: { code: 'NODE_NOT_FOUND', message: 'No node matches the supplied nodeId.' } })
          return
        }
        const element = node.element as Record<string, unknown>
        if (property === 'tagName' && element.kind !== 'tag' || property === 'comment' && typeof element.comment !== 'string' || property === 'source' && element.kind !== 'text' && typeof element.source !== 'string' && typeof (element.implementation as Record<string, unknown> | undefined)?.source !== 'string') {
          await TauriMcp.respond({ id: request.id, error: { code: 'EDIT_NOT_SUPPORTED', message: `Property ${property} is not supported for node kind ${String(element.kind)}.` } })
          return
        }
        if (typeof value !== 'string' || value.length > 8000) {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'value must be a string of at most 8000 characters.' } })
          return
        }
        const previousValue = property === 'source' && element.kind === 'text'
          ? ((element.source as Record<string, unknown>).value ?? '')
          : property === 'source' && typeof element.source !== 'string'
            ? (element.implementation as Record<string, unknown>).source
            : element[property]
        const changed = previousValue !== value
        try {
          const transaction = TreeStore.transaction({ source: 'mcp', label: `Update ${property} on node ${nodeId}`, expectedRevision }, () => {
            if (dryRun || !changed) return false
            return TreeStore.transformNode(nodeId, (target) => {
              const next = target.element as Record<string, unknown>
              if (property === 'source' && next.kind === 'text') {
                next.source = Text.createLiteral(value)
              } else if (property === 'source' && typeof next.source !== 'string') {
                next.implementation = { ...(next.implementation as Record<string, unknown>), source: value }
              } else next[property] = value
              return true
            })
          })
          await TauriMcp.respond({ id: request.id, result: { nodeId, property, previousValue, value, dryRun, changed: dryRun ? false : transaction.changed, wouldChange: changed, previousRevision: expectedRevision, revision: get(TreeStore.revision) } })
        } catch (error) {
          if (error instanceof TreeStore.RevisionConflictError) {
            await TauriMcp.respond({ id: request.id, error: { code: error.code, message: error.message, expectedRevision: error.expectedRevision, actualRevision: error.actualRevision } })
            return
          }
          throw error
        }
        return
      }

      if (request.method === 'deleteNode') {
        const params = typeof request.params === 'object' && request.params != null ? request.params as Record<string, unknown> : {}
        const nodeId = typeof params.nodeId === 'number' && Number.isInteger(params.nodeId) ? params.nodeId : null
        const expectedRevision = typeof params.expectedRevision === 'number' && Number.isSafeInteger(params.expectedRevision) && params.expectedRevision >= 0 ? params.expectedRevision : null
        const dryRun = params.dryRun ?? false
        if (nodeId == null || nodeId < 0 || expectedRevision == null || typeof dryRun !== 'boolean') {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'nodeId, expectedRevision, and dryRun must have valid types.' } })
          return
        }
        const actualRevision = get(TreeStore.revision)
        if (actualRevision !== expectedRevision) {
          await TauriMcp.respond({ id: request.id, error: { code: 'REVISION_CONFLICT', message: `Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`, expectedRevision, actualRevision } })
          return
        }
        const root = get(TreeStore.rootNode)
        const node = TreeNode.findNode(root, nodeId)
        const parent = TreeNode.findParent(root, nodeId)
        if (node == null) {
          await TauriMcp.respond({ id: request.id, error: { code: 'NODE_NOT_FOUND', message: 'No node matches the supplied nodeId.' } })
          return
        }
        if (parent == null || node.children.length > 0) {
          await TauriMcp.respond({ id: request.id, error: { code: 'EDIT_NOT_SUPPORTED', message: 'Only non-root leaf nodes can be deleted.' } })
          return
        }
        const selectedNodeId = get(TreeStore.selectedNodeId)
        const transaction = TreeStore.transaction({ source: 'mcp', label: `Delete node ${nodeId}`, expectedRevision }, () => {
          if (dryRun) return false
          TreeStore.removeNode(nodeId)
          return true
        })
        await TauriMcp.respond({ id: request.id, result: { nodeId, parentNodeId: parent.id, selectedNodeId: selectedNodeId === nodeId ? parent.id : selectedNodeId, dryRun, changed: dryRun ? false : transaction.changed, previousRevision: expectedRevision, revision: get(TreeStore.revision) } })
        return
      }

      if (request.method === 'insertNode') {
        const params = typeof request.params === 'object' && request.params != null ? request.params as Record<string, unknown> : {}
        const parentNodeId = typeof params.parentNodeId === 'number' && Number.isInteger(params.parentNodeId) ? params.parentNodeId : null
        const expectedRevision = typeof params.expectedRevision === 'number' && Number.isSafeInteger(params.expectedRevision) && params.expectedRevision >= 0 ? params.expectedRevision : null
        const kind = typeof params.kind === 'string' ? params.kind : ''
        const dryRun = params.dryRun ?? false
        const index = params.index == null ? undefined : (typeof params.index === 'number' && Number.isInteger(params.index) ? params.index : null)
        if (parentNodeId == null || parentNodeId < 0 || expectedRevision == null || !['tag', 'text'].includes(kind) || index === null || typeof dryRun !== 'boolean') {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'parentNodeId, expectedRevision, kind, index, and dryRun must have valid types.' } })
          return
        }
        const actualRevision = get(TreeStore.revision)
        if (actualRevision !== expectedRevision) {
          await TauriMcp.respond({ id: request.id, error: { code: 'REVISION_CONFLICT', message: `Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`, expectedRevision, actualRevision } })
          return
        }
        if (TreeNode.findNode(get(TreeStore.rootNode), parentNodeId) == null) {
          await TauriMcp.respond({ id: request.id, error: { code: 'NODE_NOT_FOUND', message: 'No parent node matches parentNodeId.' } })
          return
        }
        const tagName = params.tagName ?? 'div'
        const value = params.value ?? ''
        if (kind === 'tag' && (typeof tagName !== 'string' || !HtmlTag.isTagName(tagName))) {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'tagName must be a supported HTML tag name.' } })
          return
        }
        if (typeof value !== 'string' || value.length > 8000) {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'value must be a string of at most 8000 characters.' } })
          return
        }
        const element = kind === 'tag' ? Tag.create(tagName as Tag.TagName, '') : Text.createLiteral(value)
        const transaction = TreeStore.transaction({ source: 'mcp', label: `Insert ${kind} node`, expectedRevision }, () => {
          if (dryRun) return null
          return TreeStore.addChildAndGetId(parentNodeId, element, index ?? undefined)
        })
        await TauriMcp.respond({ id: request.id, result: { parentNodeId, kind, nodeId: transaction.result, dryRun, changed: dryRun ? false : transaction.changed, previousRevision: expectedRevision, revision: get(TreeStore.revision) } })
        return
      }

      if (request.method === 'moveNode') {
        const params = typeof request.params === 'object' && request.params != null ? request.params as Record<string, unknown> : {}
        const nodeId = typeof params.nodeId === 'number' && Number.isInteger(params.nodeId) ? params.nodeId : null
        const expectedRevision = typeof params.expectedRevision === 'number' && Number.isSafeInteger(params.expectedRevision) && params.expectedRevision >= 0 ? params.expectedRevision : null
        const direction = params.direction
        const dryRun = params.dryRun ?? false
        if (nodeId == null || nodeId < 0 || expectedRevision == null || !['up', 'down'].includes(direction as string) || typeof dryRun !== 'boolean') {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'nodeId, expectedRevision, direction (up/down), and dryRun must have valid types.' } })
          return
        }
        const actualRevision = get(TreeStore.revision)
        if (actualRevision !== expectedRevision) {
          await TauriMcp.respond({ id: request.id, error: { code: 'REVISION_CONFLICT', message: `Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`, expectedRevision, actualRevision } })
          return
        }
        if (TreeNode.findNode(get(TreeStore.rootNode), nodeId) == null) {
          await TauriMcp.respond({ id: request.id, error: { code: 'NODE_NOT_FOUND', message: 'No node matches nodeId.' } })
          return
        }
        const transaction = TreeStore.transaction({ source: 'mcp', label: `Move node ${nodeId}`, expectedRevision }, () => {
          if (dryRun) return false
          return TreeStore.moveNode(nodeId, direction === 'up' ? -1 : 1)
        })
        await TauriMcp.respond({ id: request.id, result: { nodeId, direction, dryRun, changed: dryRun ? false : transaction.changed, previousRevision: expectedRevision, revision: get(TreeStore.revision) } })
        return
      }

      if (request.method === 'updateNodeAttribute') {
        const params = typeof request.params === 'object' && request.params != null ? request.params as Record<string, unknown> : {}
        const nodeId = typeof params.nodeId === 'number' && Number.isInteger(params.nodeId) ? params.nodeId : null
        const expectedRevision = typeof params.expectedRevision === 'number' && Number.isSafeInteger(params.expectedRevision) && params.expectedRevision >= 0 ? params.expectedRevision : null
        const name = typeof params.name === 'string' ? params.name.trim() : ''
        const value = params.value
        const dryRun = params.dryRun ?? false
        if (nodeId == null || nodeId < 0 || expectedRevision == null || name === '' || typeof value !== 'string' || value.length > 8000 || typeof dryRun !== 'boolean') {
          await TauriMcp.respond({ id: request.id, error: { code: 'INVALID_PARAMS', message: 'nodeId, expectedRevision, name, value, and dryRun must have valid types.' } })
          return
        }
        const actualRevision = get(TreeStore.revision)
        if (actualRevision !== expectedRevision) {
          await TauriMcp.respond({ id: request.id, error: { code: 'REVISION_CONFLICT', message: `Tree revision conflict: expected ${expectedRevision}, actual ${actualRevision}.`, expectedRevision, actualRevision } })
          return
        }
        const node = TreeNode.findNode(get(TreeStore.rootNode), nodeId)
        if (node == null) { await TauriMcp.respond({ id: request.id, error: { code: 'NODE_NOT_FOUND', message: 'No node matches nodeId.' } }); return }
        if (node.element.kind !== 'tag') { await TauriMcp.respond({ id: request.id, error: { code: 'EDIT_NOT_SUPPORTED', message: 'Attributes can only be edited on Tag nodes.' } }); return }
        const policy = TagAttributeCatalog.resolvePolicy(node.element.tagName, name)
        if (policy.status !== 'supported') { await TauriMcp.respond({ id: request.id, error: { code: 'EDIT_NOT_SUPPORTED', message: `Attribute ${name} is not supported for <${node.element.tagName}>.` } }); return }
        const existing = node.element.attributes.find((attribute) => attribute.type === 'attribute' && attribute.name === name)
        const previousValue = existing?.type === 'attribute' && existing.value.type === 'literal' ? existing.value.value : null
        const changed = previousValue !== value
        const transaction = TreeStore.transaction({ source: 'mcp', label: `Update attribute ${name} on node ${nodeId}`, expectedRevision }, () => {
          if (dryRun || !changed) return false
          return TreeStore.transformNode(nodeId, (target) => {
            if (target.element.kind !== 'tag') return false
            const attributes = [...target.element.attributes]
            const index = attributes.findIndex((attribute) => attribute.type === 'attribute' && attribute.name === name)
            const next = { type: 'attribute' as const, name, value: ResolvableValue.createLiteral(value) }
            if (index < 0) attributes.push(next)
            else attributes[index] = next
            target.element = { ...target.element, attributes }
            return true
          })
        })
        await TauriMcp.respond({ id: request.id, result: { nodeId, name, previousValue, value, dryRun, changed: dryRun ? false : transaction.changed, previousRevision: expectedRevision, revision: get(TreeStore.revision) } })
        return
      }

      if (request.method === 'selectNode') {
        const nodeId = typeof request.params === 'object'
          && request.params != null
          && 'nodeId' in request.params
          && typeof request.params.nodeId === 'number'
          && Number.isInteger(request.params.nodeId)
          ? request.params.nodeId
          : null
        const rootNode = get(TreeStore.rootNode)
        if (nodeId == null || TreeNode.findNode(rootNode, nodeId) == null) {
          await TauriMcp.respond({
            id: request.id,
            error: { code: 'INVALID_PARAMS', message: 'nodeId must identify an existing node.' },
          })
          return
        }
        TreeStore.selectedNodeId.set(nodeId)
        TreeViewportController.requestReveal(nodeId)
        await TauriMcp.respond({ id: request.id, result: { selectedNodeId: nodeId } })
        return
      }

      await TauriMcp.respond({
        id: request.id,
        error: {
          code: 'METHOD_NOT_FOUND',
          message: `Unsupported Studio bridge method: ${request.method}`,
        },
      })
    } finally {
      if (get(McpSessionState.store) === 'connected') {
        McpSessionState.set('available')
      }
    }
  }

  export const connect = (): Promise<() => void> => TauriMcp.onRequest(handle)
}

export default McpToolHandler
