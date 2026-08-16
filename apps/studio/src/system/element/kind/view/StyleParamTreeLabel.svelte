<script lang="ts">
  import type StyleParamElement from './style-param-element'

  type Props = {
    element: StyleParamElement.Element
  }

  let { element }: Props = $props()
</script>

<span class="param-label">
  <span class="param-kind">Parameter</span>
  <span class="param-value">
    <span class="param-prefix">$param.</span><span class="param-name">{element.id}</span><span class="param-separator">:&nbsp;</span><span class="param-type">{element.valueType}</span>
  </span>
</span>

<style>
  .param-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .param-kind,
  .param-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .param-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #eadfcf;
    color: #27484f;
  }

  .param-value {
    min-width: 130px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
  }

  .param-prefix,
  .param-separator {
    color: rgba(255, 255, 255, 0.8);
  }

  .param-name {
    color: #cce879;
  }

  .param-type {
    color: #ffe184;
  }
</style>
