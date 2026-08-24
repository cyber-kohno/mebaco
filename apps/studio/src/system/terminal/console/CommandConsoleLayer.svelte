<script lang="ts">
  import CommandController from '../command-controller'
  import CommandRegistry from '../command-registry'
  import CommandRunner from '../command-runner'
  import { commandSessionStore } from '../command-session-store'
  import type { CommandSession } from '../command-types'
  import bodyPortal from '../../ui/body-portal'

  let inputElement = $state<HTMLInputElement | undefined>(undefined)
  let promptInputElement = $state<HTMLInputElement | undefined>(undefined)
  let inputLineElement = $state<HTMLDivElement | undefined>(undefined)
  let outputElement = $state<HTMLDivElement | undefined>(undefined)
  let session = $state<CommandSession | null>(null)
  let previousOutputCount = $state(0)
  let previousPromptActive = $state(false)
  let suggestionPosition = $state({ left: 0, top: 0, width: 0 })

  $effect(() => {
    const unsubscribe = commandSessionStore.subscribe((value) => {
      session = value
    })
    return unsubscribe
  })

  const updateSuggestionPosition = () => {
    const line = inputLineElement
    if (line == null || suggestions.length === 0) return
    const rect = line.getBoundingClientRect()
    suggestionPosition = {
      left: rect.left,
      top: rect.bottom + 4,
      width: Math.min(rect.width, 420),
    }
  }

  const handleTerminalScroll = () => {
    if (suggestions.length > 0) CommandController.dismissSuggestions()
    updateSuggestionPosition()
  }

  const focusTerminalInput = () => {
    if (session?.prompt?.inputSpec != null) promptInputElement?.focus()
    else if (session?.prompt == null) inputElement?.focus()
  }

  const handleTerminalFocusout = (event: FocusEvent) => {
    const terminal = event.currentTarget as HTMLElement
    if (event.relatedTarget instanceof Node && terminal.contains(event.relatedTarget)) return
    setTimeout(focusTerminalInput, 0)
  }

  $effect(() => {
    suggestions.length
    session?.input
    session?.completionDismissed
    setTimeout(updateSuggestionPosition, 0)
    window.addEventListener('resize', updateSuggestionPosition)
    outputElement?.addEventListener('scroll', handleTerminalScroll)
    return () => {
      window.removeEventListener('resize', updateSuggestionPosition)
      outputElement?.removeEventListener('scroll', handleTerminalScroll)
    }
  })

  let suggestions = $derived(session == null || session.prompt != null || session.completionDismissed || session.input.trim() === ''
    ? []
    : CommandRegistry.getSuggestions(CommandRunner.createContext(), session.input))

  $effect(() => {
    if (session == null) return
    setTimeout(() => {
      if (session?.prompt?.inputSpec != null) promptInputElement?.focus()
      else if (session?.prompt == null) inputElement?.focus()
    }, 0)
  })

  $effect(() => {
    const outputCount = session?.outputs.length ?? 0
    const promptActive = session?.prompt != null
    const output = outputElement
    if (output == null) {
      previousOutputCount = outputCount
      previousPromptActive = promptActive
      return
    }

    const shouldFollow = output.scrollHeight - output.scrollTop - output.clientHeight < 32
    if ((outputCount !== previousOutputCount || promptActive !== previousPromptActive) && shouldFollow) {
      setTimeout(() => {
        output.scrollTop = output.scrollHeight
      }, 0)
    }
    previousOutputCount = outputCount
    previousPromptActive = promptActive
  })
</script>

<svelte:window onkeydown={CommandController.handleKeydown} />

{#if session != null}
  <div class="layer" use:bodyPortal>
    <div class="scrim" role="presentation" onclick={(event) => { if (event.target === event.currentTarget) CommandController.close() }}></div>
    <section class="terminal" role="dialog" aria-modal="true" aria-label="Mebaco terminal" tabindex="-1" onfocusout={handleTerminalFocusout}>
      <header class="header">
        <span class="title">Mebaco terminal</span>
        <span class="hint">↑↓ select · Enter accept/run · Tab complete · Esc close</span>
      </header>

      <div class="terminal-scroll" bind:this={outputElement} aria-live="polite">
        {#if session.outputs.length === 0}
          <div class="welcome">Mebaco terminal. Type a command to show suggestions; use ↑↓ and Enter to choose.</div>
        {/if}
        {#each session.outputs as output}
          <div class="output" data-kind={output.kind} data-tone={output.tone}>{output.message}</div>
        {/each}

        {#if session.prompt != null}
          <div class="choice-prompt" role="listbox" aria-label={session.prompt.message}>
            <div class="prompt-message">{session.prompt.message}</div>
            {#if session.prompt.inputSpec != null}
              <input
                class="prompt-input"
                bind:this={promptInputElement}
                value={session.prompt.inputValue ?? ''}
                placeholder={session.prompt.inputSpec.placeholder ?? ''}
                aria-label={session.prompt.message}
                autocomplete="off"
                spellcheck="false"
                oninput={(event) => CommandController.setPromptInput(event.currentTarget.value)}
              />
            {/if}
            {#each session.prompt.choices as choice, index}
              <button
                type="button"
                class:focused={index === session.prompt.focus}
                role="option"
                aria-selected={index === session.prompt.focus}
                onclick={() => { void CommandController.selectPrompt(index) }}
              >
                <span class="choice-cursor">{index === session.prompt.focus ? '>' : ' '}</span>
                <span class="choice-label">{choice.label}</span>
                {#if choice.detail != null}<span class="choice-detail">{choice.detail}</span>{/if}
              </button>
            {/each}
          </div>
        {/if}

        {#if session.prompt == null}
          <div class="input-line" bind:this={inputLineElement}>
            <span class="node-prompt">node-{session.nodeId}&gt;</span>
            <input
              bind:this={inputElement}
              value={session.input}
              aria-label="Terminal input"
              autocomplete="off"
              spellcheck="false"
              oninput={(event) => CommandController.setInput(event.currentTarget.value)}
            />
          </div>
          <div class="terminal-tail-space" aria-hidden="true"></div>
        {/if}
      </div>

    </section>

    {#if session.prompt == null && suggestions.length > 0}
      <div
        class="suggestions"
        role="listbox"
        aria-label="Completion suggestions"
        style={`left: ${suggestionPosition.left}px; top: ${suggestionPosition.top}px; width: ${suggestionPosition.width}px;`}
      >
        {#each suggestions as suggestion, index}
          <button
            type="button"
            class:focused={index === session.focus}
            role="option"
            aria-selected={index === session.focus}
            onclick={() => CommandController.setInput(suggestion.insertText ?? suggestion.definition.id)}
          >
            <span class="command-name">{suggestion.label ?? suggestion.definition.id}</span>
            <span class="command-description">{suggestion.description ?? suggestion.definition.description}</span>
          </button>
        {/each}
      </div>
    {/if}
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
    background: rgba(18, 55, 64, 0.18);
    pointer-events: auto;
  }

  .terminal {
    position: fixed;
    z-index: 1;
    top: 24px;
    left: 24px;
    display: flex;
    flex-direction: column;
    width: min(760px, calc(100% - 48px));
    height: min(560px, calc(100% - 48px));
    min-height: 240px;
    border: 1px solid #3f7882;
    border-radius: 6px;
    background: #102b31;
    box-shadow: 0 16px 36px rgba(18, 55, 64, 0.38);
    color: #d7eef0;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    overflow: hidden;
    pointer-events: auto;
  }

  .header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    border-bottom: 1px solid #2f5961;
    background: #173b43;
  }

  .title { color: #9fe3e8; font-weight: 800; }
  .hint { color: #80aeb4; font-size: 11px; }

  .terminal-scroll {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 2px;
    min-height: 0;
    padding: 12px;
    overflow: auto;
    white-space: pre-wrap;
  }

  .welcome { color: #80aeb4; }
  .output { line-height: 1.45; }
  .output[data-kind='log'] {
    margin-left: 12px;
    padding: 2px 6px;
    background: #00000076;
  }
  .output[data-tone='success'] { color: #9be0ad; }
  .output[data-tone='warning'] { color: #f0c27c; }
  .output[data-tone='danger'] { color: #ff9ca4; }

  .input-line {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
    min-height: 28px;
    margin-top: 3px;
  }

  .terminal-tail-space {
    flex: 0 0 30%;
    min-height: 120px;
  }

  .node-prompt { color: #9fe3e8; font-weight: 800; }

  input {
    flex: 1 1 auto;
    min-width: 0;
    height: 26px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #f2ffff;
    font: inherit;
    outline: none;
  }

  .choice-prompt {
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    width: 100%;
    margin-top: 3px;
    padding: 4px 0;
    border-radius: 4px;
    background: rgba(255, 255, 255, 0.07);
  }

  .suggestions {
    position: fixed;
    z-index: 3;
    display: flex;
    flex-direction: column;
    max-height: 220px;
    padding: 4px;
    border: 1px solid #3f7882;
    border-radius: 4px;
    background: #173b43;
    color: #d7eef0;
    font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    font-size: 13px;
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.28);
    overflow: auto;
    pointer-events: auto;
  }

  .suggestions button,
  .choice-prompt button {
    display: grid;
    gap: 12px;
    min-height: 28px;
    padding: 5px 8px;
    border: 1px solid transparent;
    border-radius: 3px;
    background: transparent;
    color: #d7eef0;
    font: inherit;
    text-align: left;
    cursor: default;
  }

  .suggestions button { grid-template-columns: 160px minmax(0, 1fr); }
  .choice-prompt button {
    grid-template-columns: 18px 160px minmax(0, 1fr);
    width: 100%;
  }

  .suggestions button.focused,
  .suggestions button:hover,
  .choice-prompt button.focused,
  .choice-prompt button:hover {
    border-color: #5ebdca;
    background: #245563;
  }

  .command-name,
  .choice-label { color: #a8e8eb; font-weight: 800; }
  .command-description,
  .choice-detail { color: #80aeb4; }
  .prompt-message { padding: 5px 8px 7px; color: #b9dfe2; font-weight: 700; }
  .choice-cursor { color: #f6e96b; font-weight: 800; }

  .prompt-input {
    width: calc(100% - 16px);
    height: 28px;
    margin: 0 8px 6px;
    padding: 0 8px;
    border: 1px solid #5ebdca;
    border-radius: 3px;
    background: #102b31;
    color: #f2ffff;
    font: inherit;
    outline: none;
  }
</style>
