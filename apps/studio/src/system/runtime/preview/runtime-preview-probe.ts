import { getContext, setContext, tick } from 'svelte'
import type RuntimeError from '../view/runtime-error'

const contextKey = Symbol('mebaco-runtime-preview-probe')

/** Only MCP-owned previews are instrumented. No selectors or arbitrary scripts. */
export namespace RuntimePreviewProbe {
  export type Viewport = { width: number; height: number }
  export type Action = {
    type: 'input' | 'click' | 'focus' | 'blur' | 'scroll'
    elementId: string
    value?: string
    scrollTop?: number
    scrollLeft?: number
  }
  export class Error extends globalThis.Error {
    constructor(readonly code: string, message: string) { super(message) }
  }

  const metrics = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const style = element.ownerDocument.defaultView!.getComputedStyle(element)
    const overflowX = element.scrollWidth > element.clientWidth + 1
    const overflowY = element.scrollHeight > element.clientHeight + 1
    return {
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      clientWidth: element.clientWidth, clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop, scrollLeft: element.scrollLeft,
      overflowX, overflowY,
      scrollableX: overflowX && ['auto', 'scroll'].includes(style.overflowX),
      scrollableY: overflowY && ['auto', 'scroll'].includes(style.overflowY),
      style: {
        display: style.display, visibility: style.visibility,
        overflowX: style.overflowX, overflowY: style.overflowY,
        resize: style.resize, minHeight: style.minHeight,
      },
    }
  }

  export class Session {
    private elements = new Map<string, {
      nodeId: number; instanceKey: string; element: HTMLElement; refKey: () => string | null
    }>()
    private nextId = 1
    private host: HTMLElement | null = null
    private failure: () => RuntimeError.Failure | null = () => null
    private diagnostics: { nodeId: number; message: string }[] = []
    private logs: { level: string; message: string }[] = []
    private pending = 0
    private disposed = false
    constructor(readonly previewId: string, readonly viewport: Viewport) {}

    attach(host: HTMLElement, failure: () => RuntimeError.Failure | null): () => void {
      this.host = host
      this.failure = failure
      return () => { if (this.host === host) this.host = null }
    }

    register(nodeId: number, instanceKey: string, element: HTMLElement, refKey: () => string | null): () => void {
      const id = `${this.previewId}:e${this.nextId++}`
      this.elements.set(id, { nodeId, instanceKey, element, refKey })
      return () => { this.elements.delete(id) }
    }

    report(nodeId: number, message: string): void {
      message = message.slice(0, 2000)
      if (this.diagnostics.some((entry) => entry.nodeId === nodeId && entry.message === message)) return
      if (this.diagnostics.length < 100) this.diagnostics.push({ nodeId, message })
    }

    log(level: string, values: readonly unknown[]): void {
      const message = values.map((value) => {
        try { return typeof value === 'string' ? value : JSON.stringify(value) ?? String(value) }
        catch { return '[unserializable]' }
      }).join(' ').slice(0, 2000)
      this.logs.push({ level, message })
      if (this.logs.length > 100) this.logs.shift()
    }

    beginAction(): () => void {
      this.pending += 1
      let completed = false
      return () => { if (!completed) { completed = true; this.pending -= 1 } }
    }

    /** Wait for Svelte and tracked event handlers, bounded below the MCP bridge timeout. */
    async settle(timeoutMs: number): Promise<boolean> {
      const deadline = Date.now() + timeoutMs
      let stable = 0
      do {
        if (this.disposed) throw new Error('PREVIEW_NOT_AVAILABLE', 'The preview was closed.')
        await tick()
        if (this.host?.isConnected && this.pending === 0) stable += 1
        else stable = 0
        if (stable >= 2) return true
        await new Promise((resolve) => setTimeout(resolve, 10))
      } while (Date.now() < deadline)
      return false
    }

    async interact(action: Action, timeoutMs: number): Promise<boolean> {
      const host = this.host
      const entry = this.elements.get(action.elementId)
      if (host == null || entry == null || !entry.element.isConnected || !host.contains(entry.element)) {
        throw new Error('ELEMENT_NOT_FOUND', 'elementId must identify a currently rendered element in this preview. Inspect again after a rerender.')
      }
      const element = entry.element
      const window = element.ownerDocument.defaultView!
      if (action.type !== 'blur' && (element.closest('[inert]') != null || element.matches(':disabled')
        || window.getComputedStyle(element).visibility === 'hidden' || element.getClientRects().length === 0)) {
        throw new Error('ELEMENT_NOT_INTERACTABLE', 'The target is hidden, inert, or disabled.')
      }
      if (action.type === 'blur') element.blur()
      else if (action.type === 'scroll') {
        if (action.scrollTop != null) element.scrollTop = action.scrollTop
        if (action.scrollLeft != null) element.scrollLeft = action.scrollLeft
        element.dispatchEvent(new window.Event('scroll'))
      } else {
        // Programmatic click alone does not reproduce focus/blur preceding a user click.
        element.focus()
        const focused = await this.settle(timeoutMs)
        if (!focused) return false
        if (!element.isConnected || !host.contains(element)) {
          throw new Error('ELEMENT_NOT_FOUND', 'Focusing the target rerendered it. Inspect and retry with the new elementId.')
        }
        if (action.type === 'click') element.click()
        else if (action.type === 'input') {
          if (element instanceof window.HTMLTextAreaElement || element instanceof window.HTMLInputElement) {
            if (element.readOnly || (element instanceof window.HTMLInputElement
              && !['text', 'search', 'email', 'url', 'tel', 'password', 'number'].includes(element.type))) {
              throw new Error('ELEMENT_NOT_INTERACTABLE', 'Input requires an editable text input or textarea.')
            }
            element.value = action.value!
          } else if (element.isContentEditable) {
            // Preserve renderer-owned text nodes. Replacing textContent detaches
            // Svelte's text bindings and makes a later state update appear lost.
            const walker = element.ownerDocument.createTreeWalker(element, window.NodeFilter.SHOW_TEXT)
            const first = walker.nextNode()
            if (first == null) element.append(element.ownerDocument.createTextNode(action.value!))
            else {
              first.nodeValue = action.value!
              let remaining: Node | null
              while ((remaining = walker.nextNode()) != null) remaining.nodeValue = ''
            }
          }
          else throw new Error('ELEMENT_NOT_INTERACTABLE', 'Input requires a text input, textarea, or contenteditable element.')
          element.dispatchEvent(new window.InputEvent('input', {
            bubbles: true, composed: true, inputType: 'insertReplacementText', data: action.value!,
          }))
        }
      }
      return this.settle(timeoutMs)
    }

    snapshot(maxElements: number, maxTextLength: number) {
      if (this.disposed || this.host?.isConnected !== true) {
        throw new Error('PREVIEW_NOT_READY', 'The runtime view has not mounted yet.')
      }
      const host = this.host
      const frame = host.parentElement
      const active = host.ownerDocument.activeElement
      let textBudget = 64000
      let textTruncated = false
      const clip = (source: string | null): string => {
        const text = source ?? ''
        const length = Math.min(textBudget, maxTextLength)
        if (text.length > length) textTruncated = true
        const result = text.slice(0, length)
        textBudget -= result.length
        return result
      }
      const entries = [...this.elements].filter(([, entry]) => entry.element.isConnected && host.contains(entry.element))
      const elements = entries.slice(0, maxElements).map(([elementId, entry]) => {
        const { element } = entry
        const window = element.ownerDocument.defaultView!
        const isInput = element instanceof window.HTMLInputElement || element instanceof window.HTMLTextAreaElement
        return {
          elementId, nodeId: entry.nodeId, instanceKey: entry.instanceKey, refKey: clip(entry.refKey()),
          tagName: element.tagName.toLowerCase(), role: clip(element.getAttribute('role')),
          label: clip(element.getAttribute('aria-label')), text: clip(element.innerText),
          value: isInput ? clip(element.type === 'password' ? '[redacted]' : element.value) : null,
          contentEditable: element.isContentEditable, focused: element === active,
          disabled: element.matches(':disabled'), ...metrics(element),
        }
      })
      return {
        previewId: this.previewId, requestedViewport: this.viewport,
        webViewViewport: { width: host.ownerDocument.defaultView!.innerWidth,
          height: host.ownerDocument.defaultView!.innerHeight, devicePixelRatio: host.ownerDocument.defaultView!.devicePixelRatio },
        runtime: metrics(host), frame: frame == null ? null : metrics(frame),
        dialog: frame?.parentElement == null ? null : metrics(frame.parentElement),
        focusedElementId: entries.find(([, entry]) => entry.element === active)?.[0] ?? null,
        totalElements: entries.length, elementsTruncated: entries.length > maxElements, textTruncated,
        elements, runtimeFailure: this.failure(), diagnostics: [...this.diagnostics], logs: [...this.logs],
        pendingActions: this.pending,
      }
    }

    dispose(): void { this.disposed = true; this.host = null; this.elements.clear() }
  }

  export const provide = (session: Session | undefined): void => { setContext(contextKey, session) }
  export const current = (): Session | undefined => getContext(contextKey)
}

export default RuntimePreviewProbe
