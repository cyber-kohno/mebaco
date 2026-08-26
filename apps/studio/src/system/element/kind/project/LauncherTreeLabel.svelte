<script lang="ts">
  import type LauncherElement from './launcher-element'
  import TreeStore from '../../../store/tree-store'
  import DefinitionCatalog from '../../definition-catalog'
  let { element }: { element: LauncherElement.Element } = $props()
  const rootNodeStore = TreeStore.rootNode
  const appName = $derived(element.appId == null
    ? ''
    : DefinitionCatalog.resolveName($rootNodeStore, element.appId, new Set(['app'])) ?? '-')
</script>

<span class="node-label">
  <span class="node-kind">Launcher</span>
  <span class="node-value"><span class="id">{element.id}</span><span class="name">&nbsp;[{element.name}]</span><span class="separator">:&nbsp;</span><span class="app">{appName}</span></span>
</span>

<style>
  .node-label { display:inline-flex; align-items:center; height:100%; margin-left:3px; color:#2b4850; font-size:15px; font-weight:700; opacity:.86; }
  .node-kind, .node-value { display:inline-flex; align-items:center; height:30px; border:1px solid #87bac2; line-height:1; }
  .node-kind { padding:0 10px; border-radius:4px 0 0 4px; background:#e1b5cc; color:#27484f; }
  .node-value { min-width:130px; padding:0 12px; border-left:0; border-radius:0 4px 4px 0; background:#496970; color:#f4fbfc; }
  .id { color:#ffe184; }
  .name, .separator { color:#f4fbfc; }
  .app { color:#ffb36b; }
</style>
