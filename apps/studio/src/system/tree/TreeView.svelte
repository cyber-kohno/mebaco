<script lang="ts">
  import ActionMenu from '../action-menu/action-menu-controller'
  import DisabledActionMenu from '../element/disabled-action-menu'
  import ElementTreeLabel from '../element/ElementTreeLabel.svelte'
  import ElementRegistry from '../element/element-registry'
  import { elementDialogStore } from '../element-dialog/element-dialog-store'
  import TreeStore from '../store/tree-store'
  import ExpressionVerificationActions from '../validation/expression-verification-actions'
  import ExpressionVerificationStore from '../validation/expression-verification-store'
  import TreeNode from './tree-node'

  type VisibleNode = {
    node: TreeNode.Node
    parentNode: TreeNode.Node | null
    depth: number
    lines: boolean[]
    isPreview: boolean
    disabledDescendant: boolean
  }

  const rootNodeStore = TreeStore.rootNode
  const selectedNodeIdStore = TreeStore.selectedNodeId
  const expressionVerificationEntries = ExpressionVerificationStore.entries
  let altPressed = $state(false)
  const selectionRelations = $derived(
    TreeNode.getSelectionRelations($rootNodeStore, $selectedNodeIdStore),
  )

  const toggleNode = (node: TreeNode.Node) => {
    if (node.children.length === 0) return
    node.isOpen = !node.isOpen
    TreeStore.selectedNodeId.set(node.id)
    TreeStore.rootNode.set(TreeNode.clone($rootNodeStore))
  }

  const selectNode = (node: TreeNode.Node) => {
    TreeStore.selectedNodeId.set(node.id)
  }

  const handleWindowKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Alt' || event.altKey) altPressed = true
  }

  const handleWindowKeyup = (event: KeyboardEvent) => {
    if (event.key === 'Alt') altPressed = false
  }

  const handleWindowBlur = () => {
    altPressed = false
  }

  const isEditingNode = (row: VisibleNode): boolean => {
    const session = $elementDialogStore
    if (session == null) return false
    if (session.mode === 'create') return row.isPreview
    return row.node.id === session.nodeId
  }

  const getContextMenu = (
    node: TreeNode.Node,
    parentNode: TreeNode.Node | null,
  ) => {
    const definition = ElementRegistry.get(node.element.kind)
    const items = definition.getContextMenu({
      element: node.element,
      node,
      parentNode,
      rootNode: $rootNodeStore,
    })

    const withVerification = ExpressionVerificationActions.add(items, $rootNodeStore, node)
    return definition.canDisable
      ? DisabledActionMenu.add(withVerification, node.disabled === true, () => {
          TreeStore.toggleDisabled(node.id)
        })
      : withVerification
  }

  const openContextMenu = (
    event: MouseEvent,
    node: TreeNode.Node,
    parentNode: TreeNode.Node | null,
    isPreview: boolean,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    if (isPreview) return
    selectNode(node)

    ActionMenu.openAt(getContextMenu(node, parentNode), event.clientX, event.clientY)
  }

  const buildVisibleNodes = (
    node: TreeNode.Node,
    parentNode: TreeNode.Node | null = null,
    depth = 0,
    lines: boolean[] = [],
    disabledDescendant = false,
  ): VisibleNode[] => {
    const rows: VisibleNode[] = [{ node, parentNode, depth, lines, isPreview: node.id < 0, disabledDescendant }]

    if (node.isOpen) {
      const createSession = $elementDialogStore?.mode === 'create' ? $elementDialogStore : null
      const previewElement =
        createSession?.parentNodeId === node.id
          ? createSession.schema.createPreview?.()
          : undefined
      const previewNode: TreeNode.Node | null =
        previewElement == null
          ? null
          : {
              id: -1,
              element: previewElement,
              isOpen: true,
              children: [],
            }
      const children = previewNode == null
        ? node.children
        : (() => {
            const nextChildren = [...node.children]
            nextChildren.splice(
              createSession?.insertIndex ?? nextChildren.length,
              0,
              previewNode,
            )
            return nextChildren
          })()

      children.forEach((child, index) => {
        rows.push(...buildVisibleNodes(child, node, depth + 1, [...lines, index < children.length - 1], disabledDescendant || node.disabled === true))
      })
    }

    return rows
  }
</script>

<svelte:window
  onkeydown={handleWindowKeydown}
  onkeyup={handleWindowKeyup}
  onblur={handleWindowBlur}
/>

<div class="tree-view" role="tree" aria-label="Tree prototype">
  <div class="tree-content">
    {#each buildVisibleNodes($rootNodeStore) as row (row.node.id)}
      {@const verificationEntry = $expressionVerificationEntries[row.node.id]}
      {@const verificationStatus = ExpressionVerificationStore.getStatus(
        $rootNodeStore,
        row.node,
        $expressionVerificationEntries,
      )}
      <div
        class:selected={$selectedNodeIdStore === row.node.id}
        class:ancestor={selectionRelations.ancestorIds.has(row.node.id)}
        class:sibling={selectionRelations.siblingIds.has(row.node.id)}
        class:editing={isEditingNode(row)}
        class:disabled-descendant={row.disabledDescendant}
        class:reorder-target={altPressed
          && $selectedNodeIdStore === row.node.id
          && ElementRegistry.get(row.node.element.kind).reorderGroup != null}
        class="tree-row"
        role="treeitem"
        aria-expanded={row.node.children.length > 0 ? row.node.isOpen : undefined}
        aria-selected={$selectedNodeIdStore === row.node.id}
        tabindex="0"
        oncontextmenu={(event) => openContextMenu(event, row.node, row.parentNode, row.isPreview)}
        onclick={() => {
          if (!row.isPreview) selectNode(row.node)
        }}
        ondblclick={() => {
          if (!row.isPreview) toggleNode(row.node)
        }}
        onkeydown={(event) => {
          if (row.isPreview) return
          if (event.key === 'Enter' || event.key === ' ') selectNode(row.node)
        }}
      >
        {#each row.lines as hasNextSibling, index (`${row.node.id}-${index}`)}
          <span class="space" aria-hidden="true">
            {#if index === row.lines.length - 1}
              <span class={hasNextSibling ? 'line-full' : 'line-top'}></span>
              <span class="line-right"></span>
            {:else if hasNextSibling}
              <span class="line-full"></span>
            {/if}
          </span>
        {/each}

        {#if row.node.children.length > 0}
          <button
            class="branch-button"
            type="button"
            aria-label={row.node.isOpen ? 'Close node' : 'Open node'}
            onclick={(event) => {
              event.stopPropagation()
              toggleNode(row.node)
            }}
          >
            {row.node.isOpen ? '-' : '+'}
          </button>
        {/if}

        {#if verificationStatus != null}
          <span
            class="expression-verification-status {verificationStatus}"
            title={`Expression verification: ${verificationStatus}${verificationEntry?.messages.length ? ` — ${verificationEntry.messages.join(' ')}` : ''}`}
            aria-label={`Expression verification: ${verificationStatus}`}
          >{verificationStatus === 'verified' ? '✓' : verificationStatus === 'error' ? '×' : '?'}</span>
        {/if}

        <ElementTreeLabel element={row.node.element} parentNode={row.parentNode} rootNode={$rootNodeStore} disabled={row.node.disabled} />
      </div>
    {/each}
  </div>
</div>

<style>
  .tree-view {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: #f4fbfc;
    color: #2b4850;
  }

  .tree-content {
    display: inline-block;
    min-width: 100%;
    padding: 8px;
  }

  .tree-row {
    display: flex;
    align-items: stretch;
    width: max-content;
    min-width: 100%;
    height: 40px;
    white-space: nowrap;
    outline: none;
  }

  .tree-row.disabled-descendant :global(.element-tree-label) {
    opacity: 0.6;
  }

  .disabled-label {
    display: inline-flex;
    align-items: center;
    height: 30px;
    margin-right: 6px;
    padding: 0 8px;
    border: 1px solid #b86f6f;
    border-radius: 4px;
    background: #6d3939;
    color: #ffe5e5;
    font-size: 12px;
    font-weight: 800;
  }

  .tree-row:hover .branch-button {
    opacity: 1;
  }

  .tree-row.ancestor {
    background: rgba(122, 196, 207, 0.18);
  }

  .tree-row.sibling {
    background: rgba(123, 207, 167, 0.16);
  }

  .tree-row.selected {
    background: rgba(85, 147, 239, 0.34);
  }

  .tree-row.reorder-target {
    background: rgba(239, 171, 85, 0.42);
  }

  .tree-row.editing {
    background: rgba(255, 100, 126, 0.34);
  }

  .space {
    position: relative;
    flex: 0 0 40px;
    width: 40px;
    height: 40px;
  }

  .line-full,
  .line-top,
  .line-right {
    position: absolute;
    display: block;
    background: #68aeb9;
    opacity: 0.72;
  }

  .line-full {
    left: 20px;
    top: 0;
    width: 3px;
    height: 100%;
  }

  .line-top {
    left: 20px;
    top: 0;
    width: 3px;
    height: 20px;
  }

  .line-right {
    left: 20px;
    top: 19px;
    width: 19px;
    height: 3px;
  }

  .branch-button {
    flex: 0 0 30px;
    width: 30px;
    height: 30px;
    margin: 5px 0 0 3px;
  }

  .branch-button {
    border: 1px solid #87bac2;
    border-radius: 4px;
    background: #ffffff;
    color: #236f7a;
    font-size: 24px;
    font-weight: 700;
    line-height: 20px;
    opacity: 0.82;
    cursor: default;
  }

  .branch-button:hover {
    background: var(--mbc-color-primary-soft);
    border-color: var(--mbc-color-primary);
  }

  .expression-verification-status {
    display: inline-flex;
    flex: 0 0 22px;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 30px;
    margin: 5px 2px 0 2px;
    font-size: 18px;
    font-weight: 800;
  }

  .expression-verification-status.unverified { color: #b37b00; }
  .expression-verification-status.verified { color: #188b4b; }
  .expression-verification-status.error { color: #c22f3f; }
</style>
