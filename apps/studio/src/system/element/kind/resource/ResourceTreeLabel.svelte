<script lang="ts">
  import type DirectoryResourceElement from './directory-resource-element'
  import type SqliteResourceElement from './sqlite-resource-element'
  import type TextResourceElement from './text-resource-element'

  type ResourceElement =
    | DirectoryResourceElement.Element
    | TextResourceElement.Element
    | SqliteResourceElement.Element

  let { element }: { element: ResourceElement } = $props()

  const kindText = $derived(element.kind === 'directory-resource'
    ? 'Directory'
    : element.kind === 'text-resource' ? 'Text file' : 'SQLite')
  const access = $derived(element.kind === 'directory-resource'
    ? element.permissions.access
    : element.access)
</script>

<span class="node-label">
  <span class="node-kind">{kindText}</span>
  <span class="node-value">
    <span class="id">{element.id}</span>
    {#if element.name != null && element.name.trim().length > 0}<span class="name">&nbsp;[{element.name}]</span>{/if}
    <span class="access">&nbsp;{access}</span>
  </span>
</span>

<style>
  .node-label { display:inline-flex; align-items:center; height:100%; margin-left:3px; color:#2b4850; font-size:15px; font-weight:700; opacity:.86; }
  .node-kind, .node-value { display:inline-flex; align-items:center; height:30px; border:1px solid #87bac2; line-height:1; }
  .node-kind { padding:0 10px; border-radius:4px 0 0 4px; background:#e1b5cc; color:#27484f; }
  .node-value { min-width:130px; padding:0 12px; border-left:0; border-radius:0 4px 4px 0; background:#496970; color:#f4fbfc; }
  .id { color:#ffe184; }
  .name { color:#f4fbfc; }
  .access { color:#ff8f8f; }
</style>
