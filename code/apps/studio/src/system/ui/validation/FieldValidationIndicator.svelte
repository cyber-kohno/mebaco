<script lang="ts">
  import Asterisk from '@lucide/svelte/icons/asterisk'
  import CircleX from '@lucide/svelte/icons/circle-x'
  import Ruler from '@lucide/svelte/icons/ruler'
  import Unlink from '@lucide/svelte/icons/unlink'
  import type ValidationIssue from './validation-issue'

  type Props = {
    issue: ValidationIssue.Issue
  }

  let { issue }: Props = $props()
</script>

<span
  class="validation-indicator"
  class:warning={issue.severity === 'warning'}
  class:error={issue.severity === 'error'}
  title={issue.message}
  role="img"
  aria-label={issue.message}
>
  {#if issue.category === 'required'}
    <Asterisk size={14} strokeWidth={2.4} />
  {:else if issue.category === 'length'}
    <Ruler size={14} strokeWidth={2.2} />
  {:else if issue.category === 'consistency'}
    <Unlink size={14} strokeWidth={2.2} />
  {:else}
    <CircleX size={14} strokeWidth={2.2} />
  {/if}
</span>

<style>
  .validation-indicator {
    display: inline-flex;
    flex: 0 0 16px;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
  }

  .warning {
    color: var(--mbc-color-validation-warning-strong);
  }

  .error {
    color: var(--mbc-color-validation-error-strong);
  }
</style>
