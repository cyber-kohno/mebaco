<script lang="ts">
  import { onMount } from 'svelte'
  import { elementDialogStore } from '../element-dialog/element-dialog-store'
  import { commandSessionStore } from '../terminal/command-session-store'
  import TreeStore from '../store/tree-store'
  import TreeNode from '../tree/tree-node'
  import TreeNavigationController from '../tree/tree-navigation-controller'
  import ReferenceGraph from './reference-graph'
  import ReferenceGraphController from './reference-graph-controller'

  const rootNodeStore = TreeStore.rootNode
  const referenceGraphNodeId = ReferenceGraphController.selectedNodeId

  onMount(() => {
    let previousNodeId: number | undefined
    const unsubscribeSelection = TreeStore.selectedNodeId.subscribe((nodeId) => {
      if (previousNodeId != null && previousNodeId !== nodeId) {
        ReferenceGraphController.close()
      }
      previousNodeId = nodeId
    })
    const unsubscribeElementDialog = elementDialogStore.subscribe((session) => {
      if (session != null) ReferenceGraphController.close()
    })
    const unsubscribeCommandSession = commandSessionStore.subscribe((session) => {
      if (session != null) ReferenceGraphController.close()
    })

    return () => {
      unsubscribeSelection()
      unsubscribeElementDialog()
      unsubscribeCommandSession()
    }
  })

  const graph = $derived(
    $referenceGraphNodeId == null
      ? null
      : ReferenceGraph.build($rootNodeStore, $referenceGraphNodeId),
  )

  const selectedNode = $derived(
    $referenceGraphNodeId == null
      ? null
      : TreeNode.findNode($rootNodeStore, $referenceGraphNodeId),
  )

  const splitTargetLabel = (label: string) => {
    const separator = label.indexOf('.')
    return separator < 0
      ? { kind: label, id: '' }
      : { kind: label.slice(0, separator), id: label.slice(separator + 1) }
  }

  const navigateToNode = (nodeId: number) => {
    TreeNavigationController.jumpToNode(nodeId)
    ReferenceGraphController.close()
  }
</script>

{#if $referenceGraphNodeId != null && selectedNode != null && graph != null}
  <aside class="reference-graph" aria-label="Reference Graph">
    <header>
      <div>
        <strong>Reference Graph</strong>
        <span>node-{selectedNode.id}: {selectedNode.element.kind}</span>
      </div>
      <button type="button" aria-label="Close Reference Graph" onclick={ReferenceGraphController.close}>×</button>
    </header>

    {#if graph.canHaveReferences}
      <section>
        <h2>References</h2>
        <div class="list-region">
          {#if graph.references.length === 0}
            <p class="empty">No references.</p>
          {:else}
            <ul>
              {#each graph.references as reference}
                <li>
                  <button
                    type="button"
                    class="node-link"
                    aria-label={`Navigate to node-${reference.sourceNodeId}`}
                    onclick={() => navigateToNode(reference.sourceNodeId)}
                  >node-{reference.sourceNodeId}</button>:
                  <span class="reference-label">{reference.sourceLabel}</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </section>
    {/if}

    {#if graph.canHaveDependencies}
      <section>
        <h2>Dependencies</h2>
        <div class="list-region">
          {#if graph.dependencies.length === 0}
            <p class="empty">No dependencies.</p>
          {:else}
            <ul>
              {#each graph.dependencies as dependency}
                {@const target = splitTargetLabel(dependency.targetLabel)}
                <li>
                  <button
                    type="button"
                    class="node-link"
                    aria-label={`Navigate to node-${dependency.targetNodeId}`}
                    onclick={() => navigateToNode(dependency.targetNodeId)}
                  >node-{dependency.targetNodeId}</button>:
                  <span>{target.kind}{target.id.length > 0 ? '.' : ''}</span><span class="dependency-id">{target.id}</span>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      </section>
    {/if}
  </aside>
{/if}

<style>
  .reference-graph {
    position: fixed;
    z-index: 8000;
    top: 56px;
    right: 18px;
    width: min(360px, calc(100vw - 36px));
    overflow: visible;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 8px;
    background: #142b51;
    color: var(--mbc-color-text);
    box-shadow: 0 10px 28px rgba(18, 55, 64, 0.24);
    opacity: 0.85;
  }

  header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 11px 13px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: #373737;
  }

  header strong,
  header span {
    display: block;
  }

  header strong {
    color: #fff;
    font-size: 16px;
  }

  header span {
    margin-top: 3px;
    color: #fff;
    font-size: 11px;
  }

  header button {
    width: 24px;
    height: 24px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 5px;
    background: transparent;
    color: #fff;
    font-size: 18px;
    line-height: 1;
    cursor: default;
  }

  section {
    padding: 10px 13px;
  }

  section + section {
    border-top: 1px solid var(--mbc-color-border);
  }

  h2 {
    margin: 0 0 7px;
    color: rgb(200, 200, 255);
    font-size: 12px;
    letter-spacing: 0.05em;
  }

  .list-region {
    height: 200px;
    overflow-y: auto;
  }

  ul {
    display: grid;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  li,
  .empty {
    margin: 0;
    color: #2b4850;
    font-size: 12px;
    line-height: 1.4;
  }

  li {
    padding-left: 8px;
    color: #fff;
  }

  .node-link {
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: #de5a5a;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }

  .node-link:hover {
    color: #ff8b8b;
    background: rgba(255, 255, 255, 0.1);
  }

  .node-link:focus-visible {
    border-radius: 2px;
    outline: 2px solid #79e6f4;
    outline-offset: 2px;
  }

  .reference-label {
    color: #ffb36b;
  }

  .dependency-id {
    color: #cce879;
  }

  .empty {
    padding: 10px;
    color: #789198;
  }
</style>
