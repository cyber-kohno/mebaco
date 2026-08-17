<script lang="ts">
  import type TagElement from '../../element/kind/view/tag-element'
  import StyleElement from '../../element/kind/view/style-element'
  import FormulaContext from '../formula/formula-context'
  import RuntimeStyleResolver from './style-resolver'
  import type TreeNode from '../../tree/tree-node'
  import ResolvedStyleMonitor from './ResolvedStyleMonitor.svelte'

  type Props = {
    rootNode: TreeNode.Node
    styles: string
  }

  let { rootNode, styles }: Props = $props()

  const parseApplications = (
    source: string,
  ): TagElement.StyleApplication[] => (
    StyleElement.parseBases(source)
      .map((base) => ({
        ...base,
        arguments: base.arguments.filter((argument) => (
          argument.binding.type !== 'delegate'
        )) as TagElement.StyleArgument[],
      }))
  )

  const preview = $derived.by(() => {
    const applications = parseApplications(styles)
    return RuntimeStyleResolver
      .createCatalog(rootNode)
      .resolve(applications, FormulaContext.createEmpty(), {
        includeUnresolvedDeclarations: true,
      })
  })
</script>

<ResolvedStyleMonitor
  resolution={preview}
  unavailableMessage="Tag style monitor is unavailable."
/>
