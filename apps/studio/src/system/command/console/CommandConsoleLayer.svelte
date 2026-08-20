<script lang="ts">
  import CommandController from '../command-controller'
  import CommandRegistry from '../command-registry'
  import CommandRunner from '../command-runner'
  import { commandSessionStore } from '../command-session-store'
  import type { CommandSession } from '../command-types'
  import bodyPortal from '../../ui/portal/body-portal'

  let inputElement = $state<HTMLInputElement | undefined>(undefined)
  let session = $state<CommandSession | null>(null)

  $effect(() => {
    const unsubscribe = commandSessionStore.subscribe((value) => {
      session = value
    })
    return unsubscribe
  })

  let suggestions = $derived(session == null
    ? []
    : CommandRegistry.getSuggestions(CommandRunner.createContext(), session.input))

  $effect(() => {
    if (session == null) return
    setTimeout(() => inputElement?.focus(), 0)
  })
</script>

<svelte:window onkeydown={CommandController.handleKeydown} />

{#if session != null}
  <div class="layer" use:bodyPortal>
    <div class="scrim" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) CommandController.close() }}></div>
  <div class="console" role="dialog" aria-modal="true" aria-label="Command console">
    <header class="header">
      <span class="title">Command</span>
      <span class="hint">Enter run · Tab complete · Esc close</span>
    </header>

    <div class="outputs" aria-live="polite">
      {#if session.outputs.length === 0}
        <div class="empty">Type a command or choose one below.</div>
      {/if}
      {#each session.outputs as output}
        <div class="output" data-tone={output.tone}>{output.message}</div>
      {/each}
    </div>

    <div class="input-row">
      <span class="prompt">&gt;</span>
      <input
        bind:this={inputElement}
        value={session.input}
        aria-label="Command input"
        autocomplete="off"
        spellcheck="false"
        oninput={(event) => CommandController.setInput(event.currentTarget.value)}
      />
    </div>

    {#if suggestions.length > 0}
      <div class="suggestions" role="listbox" aria-label="Available commands">
        {#each suggestions as suggestion, index}
          <button
            type="button"
            class:focused={index === session.focus}
            role="option"
            aria-selected={index === session.focus}
            onclick={() => {
              CommandController.setInput(`${suggestion.definition.id} `)
            }}
          >
            <span class="command-name">{suggestion.definition.id}</span>
            <span class="command-description">{suggestion.definition.description}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  </div>
{/if}

<style>
  .layer {
    position: fixed;
    z-index: 12000;
    inset: 0;
    pointer-events: none;
  }

  .scrim {
    position: fixed;
    z-index: 0;
    inset: 0;
    background: rgba(18, 55, 64, 0.22);
    pointer-events: auto;
  }

  .console {
    position: fixed;
    z-index: 1;
    top: 12%;
    left: 50%;
    display: flex;
    flex-direction: column;
    width: min(720px, calc(100% - 40px));
    max-height: min(620px, calc(100% - 80px));
    border: 1px solid #79c4ce;
    border-radius: 8px;
    background: rgba(247, 252, 253, 0.98);
    box-shadow: 0 18px 42px rgba(18, 55, 64, 0.32);
    color: #243f47;
    font-size: 14px;
    transform: translateX(-50%);
    overflow: hidden;
    pointer-events: auto;
  }

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #c6e4e8;
    background: #eaf7fa;
  }

  .title {
    color: #236f7a;
    font-size: 15px;
    font-weight: 800;
  }

  .hint {
    color: #6e8c92;
    font-size: 12px;
  }

  .outputs {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-height: 52px;
    max-height: 280px;
    padding: 12px 16px;
    overflow: auto;
  }

  .empty {
    color: #6e8c92;
  }

  .output {
    white-space: pre-wrap;
    line-height: 1.45;
  }

  .output[data-tone='success'] { color: #287047; }
  .output[data-tone='warning'] { color: #8a481f; }
  .output[data-tone='danger'] { color: #a33d45; }

  .input-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    border-top: 1px solid #c6e4e8;
    background: #ffffff;
  }

  .prompt {
    color: #287f8b;
    font-size: 18px;
    font-weight: 800;
  }

  input {
    flex: 1 1 auto;
    min-width: 0;
    height: 34px;
    padding: 0 10px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    outline: none;
  }

  input:focus {
    border-color: #4ec3d3;
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .suggestions {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    border-top: 1px solid #c6e4e8;
    background: #f0fafb;
  }

  .suggestions button {
    display: grid;
    grid-template-columns: 150px minmax(0, 1fr);
    gap: 12px;
    min-height: 32px;
    padding: 6px 10px;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    color: #496970;
    font: inherit;
    text-align: left;
    cursor: default;
  }

  .suggestions button.focused,
  .suggestions button:hover {
    border-color: #8ed9e5;
    background: #d9f3f6;
    color: #174d59;
  }

  .command-name { font-weight: 800; }
  .command-description { color: #6e8c92; }
</style>
