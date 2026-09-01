<script lang="ts">
  import type ElementDefinition from './element-definition'

  type Props = {
    tone: ElementDefinition.TreeLabelTone
    kindText: string
    valueText?: string
    valueReferenceText?: string
    valuePrefix?: string
    valueSuffix?: string
    valueTone?: 'danger'
  }

  let { tone, kindText, valueText, valueReferenceText, valuePrefix = '', valueSuffix = '', valueTone }: Props = $props()
</script>

<span class="node-label">
  <span class="node-kind" data-tone={tone}>{kindText}</span>
  {#if valueText != null || valueReferenceText != null}
    <span class="node-value" class:master-value={tone === 'master'} class:reference-value={valueReferenceText != null} data-tone={valueTone}>{valuePrefix}{#if valueReferenceText != null}<span class="reference">{valueReferenceText}</span>{:else}{valueText}{/if}{valueSuffix}</span>
  {/if}
</span>

<style>
  .node-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .node-kind,
  .node-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .node-value.master-value {
    color: #ffe184;
  }

  .node-value .reference {
    color: #ffb36b;
  }

  .node-value[data-tone='danger'] {
    color: #ff8f8f;
  }

  .node-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    color: #27484f;
  }

  .node-kind[data-tone='root'] {
    background: #d9e8ec;
  }

  .node-kind[data-tone='folder'] {
    background: #edc0c0;
  }

  .node-kind[data-tone='manager'] {
    background: #d2ecf1;
  }

  .node-kind[data-tone='master'] {
    background: #e1b5cc;
  }

  .node-kind[data-tone='item'] {
    background: #dcedcf;
  }

  .node-kind[data-tone='variable'] {
    background: #eadfcf;
  }

  .node-kind[data-tone='container'] {
    background: #ece8c8;
  }

  .node-kind[data-tone='block'] {
    background: #d8f0ec;
  }

  .node-kind[data-tone='condition'] {
    background: #d9dcf0;
  }

  .node-kind[data-tone='iteration'] {
    background: #d5efdc;
  }

  .node-value {
    min-width: 82px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
    color: #f4fbfc;
  }
</style>
