<script lang="ts">
  import { untrack } from 'svelte'
  import type RuntimeSessionStore from '../runtime-session-store'
  import RuntimeView from './RuntimeView.svelte'

  let { session }: { session: RuntimeSessionStore.Session } = $props()
  // The host keys this component by session ID and revision. Selection changes
  // must not invalidate RuntimeView's initialization expressions and State.
  const runtime = untrack(() => session)
</script>

<RuntimeView
  sessionId={runtime.id}
  appNode={runtime.appNode}
  projectNode={runtime.projectNode}
  resourceSession={runtime.resourceSession}
  storageSession={runtime.storageSession}
  logSession={runtime.logSession}
  launcherId={runtime.launcherId}
  launchValues={runtime.launchValues}
  inspection={runtime.inspection}
/>
