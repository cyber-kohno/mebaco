<script lang="ts">
  import RuntimeError from './runtime-error'

  type Props = {
    failure: RuntimeError.Failure
  }

  let { failure }: Props = $props()
</script>

<section class="runtime-error-screen" role="alert" aria-live="assertive">
  <div class="runtime-error-card">
    <div class="runtime-error-kind">
      {failure.category === 'assert' ? 'Mebaco Runtime Error' : 'Application Runtime Error'}
    </div>
    <h1>{failure.category === 'assert' ? 'Implementation assertion failed' : 'Unexpected runtime error'}</h1>
    <p class="runtime-error-message">{failure.message}</p>
    {#if failure.nodeId != null || failure.elementKind != null}
      <dl>
        {#if failure.nodeId != null}<dt>Node</dt><dd>{failure.nodeId}</dd>{/if}
        {#if failure.elementKind != null}<dt>Element</dt><dd>{failure.elementKind}</dd>{/if}
      </dl>
    {/if}
  </div>
</section>

<style>
  .runtime-error-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 100%;
    padding: 32px;
    box-sizing: border-box;
    background: #fff7f7;
    color: #512b2b;
    font-size: 14px;
  }

  .runtime-error-card {
    width: min(720px, 100%);
    padding: 24px 28px;
    border: 1px solid #d58e8e;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(100, 35, 35, 0.14);
  }

  .runtime-error-kind {
    color: #a33d3d;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  h1 {
    margin: 8px 0 14px;
    color: #633131;
    font-size: 20px;
  }

  .runtime-error-message {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.6;
  }

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 4px 12px;
    margin: 18px 0 0;
    color: #795454;
    font-size: 12px;
  }

  dt { font-weight: 800; }
  dd { margin: 0; }
</style>
