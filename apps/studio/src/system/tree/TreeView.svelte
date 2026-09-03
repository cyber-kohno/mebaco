<script lang="ts">
  import { tick } from 'svelte'
  import ActionMenu from '../action-menu/action-menu-controller'
  import { developInteractionStore } from '../area/develop/interaction/develop-interaction-store'
  import ElementTreeLabel from '../element/ElementTreeLabel.svelte'
  import { elementDialogStore } from '../element-dialog/element-dialog-store'
  import TreeStore from '../store/tree-store'
  import ExpressionVerificationStore from '../validation/expression/expression-verification-store'
  import TreeContextMenuResolver from './tree-context-menu-resolver'
  import TreeNode from './tree-node'
  import TreeDestinationController from './destination/tree-destination-controller'
  import TreeViewportController from './tree-viewport-controller'

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
  const treeViewportState = TreeViewportController.state
  const treeRevealRequest = TreeViewportController.revealRequest
  let treeViewElement: HTMLDivElement | undefined = $state()
  const displayRootNode = $derived(
    TreeViewportController.resolveDisplayRoot($rootNodeStore, $treeViewportState),
  )
  const selectionRelations = $derived(
    TreeNode.getSelectionRelations(displayRootNode, $selectedNodeIdStore),
  )
  const destinationCandidateNodeIds = $derived(
    TreeDestinationController.collectDestinationCandidateNodeIds(
      $rootNodeStore,
      $developInteractionStore,
    ),
  )

  const revealNode = async (nodeId: number) => {
    await tick()
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

    const viewport = treeViewElement
    const row = viewport?.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`)
    if (viewport == null || row == null) return

    const viewportRect = viewport.getBoundingClientRect()
    const rowRect = row.getBoundingClientRect()
    const desiredTop = viewport.scrollTop
      + rowRect.top
      - viewportRect.top
      - viewport.clientHeight * 0.35
    viewport.scrollTop = Math.max(
      0,
      Math.min(desiredTop, viewport.scrollHeight - viewport.clientHeight),
    )

    const label = row.querySelector<HTMLElement>('.element-tree-label')
    if (label == null) return

    const margin = 12
    const labelRect = label.getBoundingClientRect()
    if (labelRect.left < viewportRect.left + margin) {
      viewport.scrollLeft = Math.max(
        0,
        viewport.scrollLeft + labelRect.left - viewportRect.left - margin,
      )
    } else if (labelRect.right > viewportRect.right - margin) {
      viewport.scrollLeft = Math.min(
        viewport.scrollWidth - viewport.clientWidth,
        viewport.scrollLeft + labelRect.right - viewportRect.right + margin,
      )
    }
  }

  $effect(() => {
    const request = $treeRevealRequest
    if (request != null) void revealNode(request.nodeId)
  })

  const toggleNode = (node: TreeNode.Node) => {
    if (node.children.length === 0) return
    node.isOpen = !node.isOpen
    TreeStore.selectedNodeId.set(node.id)
    TreeStore.rootNode.set(TreeNode.clone($rootNodeStore))
  }

  const selectNode = (node: TreeNode.Node) => {
    TreeStore.selectedNodeId.set(node.id)
  }

  const isEditingNode = (row: VisibleNode): boolean => {
    const session = $elementDialogStore
    if (session == null) return false
    if (session.mode === 'create') return row.isPreview
    return row.node.id === session.nodeId
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

    ActionMenu.openAt(
      TreeContextMenuResolver.resolve($rootNodeStore, node, parentNode),
      event.clientX,
      event.clientY,
    )
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

<div bind:this={treeViewElement} class="tree-view" role="tree" aria-label="Tree prototype">
  <div class="tree-content">
    {#each buildVisibleNodes(displayRootNode) as row (row.node.id)}
      {@const verificationEntry = $expressionVerificationEntries[row.node.id]}
      {@const verificationStatus = ExpressionVerificationStore.getStatus(
        $rootNodeStore,
        row.node,
        $expressionVerificationEntries,
      )}
      {@const destinationActive = $developInteractionStore.type === 'destination-transaction'}
      {@const destinationCandidate = destinationCandidateNodeIds.has(row.node.id)}
      {@const destinationSource = $developInteractionStore.type === 'destination-transaction'
        && $developInteractionStore.sourceNodeId === row.node.id}
      <div
        class:selected={$selectedNodeIdStore === row.node.id}
        class:ancestor={selectionRelations.ancestorIds.has(row.node.id)}
        class:sibling={selectionRelations.siblingIds.has(row.node.id)}
        class:editing={isEditingNode(row)}
        class:disabled-descendant={row.disabledDescendant}
        class:destination-unavailable={destinationActive && !destinationCandidate}
        class:destination-candidate={destinationCandidate}
        class:destination-source={destinationSource}
        class="tree-row"
        style:--tree-depth={row.depth}
        data-node-id={row.node.id}
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

        <span class="branch-slot">
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
          {:else if row.depth > 0}
            <span class="leaf-connector" aria-hidden="true"></span>
          {/if}
        </span>

        <span class="verification-slot">
          {#if verificationStatus != null}
            <span
              class="expression-verification-status {verificationStatus}"
              title={`Expression verification: ${verificationStatus}${verificationEntry?.messages.length ? ` — ${verificationEntry.messages.join(' ')}` : ''}`}
              aria-label={`Expression verification: ${verificationStatus}`}
            >{verificationStatus === 'verified' ? '✓' : verificationStatus === 'error' ? '×' : '?'}</span>
          {:else}
            <span
              class="expression-verification-status not-applicable"
              title="Expression verification: not applicable"
              aria-label="Expression verification: not applicable"
            >−</span>
          {/if}
        </span>

        <ElementTreeLabel element={row.node.element} parentNode={row.parentNode} rootNode={$rootNodeStore} disabled={row.node.disabled} />
      </div>
    {/each}
    <div class="tree-tail-space" aria-hidden="true"></div>
  </div>
</div>

<style>
  .tree-view {
    width: 100%;
    height: 100%;
    overflow: auto;
    background: var(--mbc-develop-workspace-background, #f4fbfc);
    color: #2b4850;
  }

  .tree-content {
    display: inline-block;
    min-width: 100%;
    padding: 8px;
  }

  .tree-tail-space {
    width: 1px;
    height: 320px;
    pointer-events: none;
  }

  .tree-row {
    position: relative;
    display: flex;
    align-items: stretch;
    width: max-content;
    min-width: 100%;
    height: 40px;
    white-space: nowrap;
    outline: none;
  }

  .tree-row.destination-unavailable:not(.destination-source)::after {
    position: absolute;
    z-index: 5;
    left: calc(var(--tree-depth, 0) * 40px + 33px);
    top: 0;
    right: 0;
    height: 40px;
    background: rgba(0, 0, 0, 0.38);
    pointer-events: none;
    content: '';
  }

  .tree-row.destination-candidate {
    box-shadow: inset 0 0 0 2px rgba(38, 152, 118, 0.62);
  }

  .tree-row.destination-source {
    animation: destination-source-pulse 1.2s ease-in-out infinite alternate;
  }

  @keyframes destination-source-pulse {
    from { background-color: rgba(220, 38, 38, 0.5); }
    to { background-color: rgba(250, 204, 21, 0.5); }
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
    width: 20px;
    height: 3px;
  }

  .branch-slot {
    position: relative;
    display: block;
    flex: 0 0 33px;
    width: 33px;
    height: 40px;
  }

  .leaf-connector {
    position: absolute;
    left: 0;
    top: 19px;
    width: 100%;
    height: 3px;
    background: #68aeb9;
    opacity: 0.72;
  }

  .branch-button {
    position: absolute;
    left: 3px;
    top: 5px;
    width: 30px;
    height: 30px;
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

  .verification-slot {
    display: flex;
    flex: 0 0 26px;
    align-items: flex-start;
    width: 26px;
    height: 40px;
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
  .expression-verification-status.not-applicable {
    color: var(--mbc-color-text-subtle);
    font-weight: 700;
  }
</style>
