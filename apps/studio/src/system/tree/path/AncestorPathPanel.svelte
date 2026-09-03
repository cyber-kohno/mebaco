<script lang="ts">
  import { developInteractionStore } from '../../area/develop/interaction/develop-interaction-store'
  import ElementRegistry from '../../element/element-registry'
  import TreeStore from '../../store/tree-store'
  import TreeNavigationController from '../tree-navigation-controller'
  import TreeNode from '../tree-node'
  import TreeViewportController from '../tree-viewport-controller'

  const rootNodeStore = TreeStore.rootNode
  const selectedNodeIdStore = TreeStore.selectedNodeId
  const viewportStateStore = TreeViewportController.state

  const ancestorPath = $derived(
    TreeNode.findPath($rootNodeStore, $selectedNodeIdStore) ?? [],
  )
  const criteriaNodeId = $derived(
    $viewportStateStore.viewRootNodeId ?? $rootNodeStore.id,
  )
  const criteriaIndex = $derived(
    ancestorPath.findIndex((node) => node.id === criteriaNodeId),
  )
  const navigationDisabled = $derived($developInteractionStore.type !== 'normal')

  const setCriteria = (
    event: MouseEvent,
    nodeId: number,
  ) => {
    event.preventDefault()
    if (navigationDisabled) return

    const changed = TreeViewportController.setViewRootNodeId($rootNodeStore, nodeId)
    if (changed) TreeViewportController.requestReveal($selectedNodeIdStore)
  }
</script>

<nav
  class="ancestor-path-panel"
  class:navigation-disabled={navigationDisabled}
  aria-label="Ancestor path"
>
  {#each ancestorPath as node, index (node.id)}
    {@const hierarchyText = ElementRegistry.getHierarchyText($rootNodeStore, node)}
    <button
      type="button"
      class="ancestor-row"
      class:above-criteria={criteriaIndex >= 0 && index < criteriaIndex}
      class:criteria={node.id === criteriaNodeId}
      class:selected={node.id === $selectedNodeIdStore}
      disabled={navigationDisabled}
      title={`${node.id} ${hierarchyText}`}
      aria-label={`Node ${node.id}, ${hierarchyText}`}
      aria-current={node.id === $selectedNodeIdStore ? 'location' : undefined}
      onclick={() => TreeNavigationController.jumpToNode(node.id)}
      oncontextmenu={(event) => setCriteria(event, node.id)}
    >
      <span class="node-number">{node.id}</span>
      <span
        class="node-kind"
        class:project-kind={node.element.kind === 'project'}
        class:app-kind={node.element.kind === 'app'}
        class:component-kind={node.element.kind === 'component'}
        class:nested-kind={node.element.kind !== 'project' && node.element.kind !== 'component' && node.element.kind !== 'app'}
      >{hierarchyText}</span>
    </button>
  {/each}
</nav>

<style>
  .ancestor-path-panel {
    width: 100%;
    height: 100%;
    overflow-x: hidden;
    overflow-y: auto;
    border-right: 1px solid var(--mbc-color-border, #c8d8dc);
    background: var(--mbc-color-surface, #ffffff);
  }

  .ancestor-row {
    position: relative;
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    align-items: center;
    width: 100%;
    height: 32px;
    padding: 0 8px 0 0;
    border: 0;
    border-bottom: 1px solid rgba(104, 142, 151, 0.14);
    background: transparent;
    color: var(--mbc-color-text, #2b4850);
    font: inherit;
    text-align: left;
    cursor: default;
  }

  .ancestor-row:hover:not(:disabled) {
    background: var(--mbc-color-primary-soft, #e4f1f4);
  }

  .ancestor-row:focus-visible {
    z-index: 1;
    outline: 2px solid var(--mbc-color-primary, #3b8f9d);
    outline-offset: -2px;
  }

  .ancestor-row.above-criteria {
    background: rgba(91, 116, 126, 0.13);
    color: var(--mbc-color-text-subtle, #63777c);
  }

  .ancestor-row.criteria {
    box-shadow: inset 6px 0 0 var(--mbc-color-primary, #3b8f9d);
  }

  .ancestor-row.selected {
    background: rgba(85, 147, 239, 0.28);
  }

  .ancestor-row:disabled {
    opacity: 0.58;
  }

  .node-number {
    padding-right: 8px;
    color: var(--mbc-color-text-subtle, #63777c);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }

  .node-kind {
    overflow: hidden;
    color: rgb(95, 95, 95);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .node-kind.project-kind {
    color: #171717;
    font-weight: 600;
  }

  .node-kind.app-kind {
    color: #175fbf;
    font-weight: 600;
  }

  .node-kind.component-kind {
    color: #b3263e;
    font-weight: 600;
  }

  .node-kind.nested-kind {
    padding-left: 8px;
  }
</style>
