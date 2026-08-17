import type ElementEditSchema from '../../../element-dialog/element-edit-schema'

namespace TagEventCatalog {
  type EventGroup =
    | 'mouse'
    | 'pointer'
    | 'touch'
    | 'keyboard'
    | 'form'
    | 'focus'
    | 'drag'
    | 'clipboard'
    | 'media'
    | 'animation'
    | 'transition'

  type EventDefinition = {
    name: string
    eventType: string
    group: EventGroup
  }

  const definitions = [
    { name: 'click', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'dblclick', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'mousedown', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'mouseup', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'mousemove', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'mouseenter', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'mouseleave', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'mouseover', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'mouseout', eventType: 'MouseEvent', group: 'mouse' },
    { name: 'contextmenu', eventType: 'MouseEvent', group: 'mouse' },

    { name: 'pointerdown', eventType: 'PointerEvent', group: 'pointer' },
    { name: 'pointerup', eventType: 'PointerEvent', group: 'pointer' },
    { name: 'pointermove', eventType: 'PointerEvent', group: 'pointer' },
    { name: 'pointerenter', eventType: 'PointerEvent', group: 'pointer' },
    { name: 'pointerleave', eventType: 'PointerEvent', group: 'pointer' },
    { name: 'pointerover', eventType: 'PointerEvent', group: 'pointer' },
    { name: 'pointerout', eventType: 'PointerEvent', group: 'pointer' },
    { name: 'pointercancel', eventType: 'PointerEvent', group: 'pointer' },

    { name: 'touchstart', eventType: 'TouchEvent', group: 'touch' },
    { name: 'touchmove', eventType: 'TouchEvent', group: 'touch' },
    { name: 'touchend', eventType: 'TouchEvent', group: 'touch' },
    { name: 'touchcancel', eventType: 'TouchEvent', group: 'touch' },

    { name: 'keydown', eventType: 'KeyboardEvent', group: 'keyboard' },
    { name: 'keyup', eventType: 'KeyboardEvent', group: 'keyboard' },

    { name: 'input', eventType: 'InputEvent', group: 'form' },
    { name: 'beforeinput', eventType: 'InputEvent', group: 'form' },
    { name: 'change', eventType: 'Event', group: 'form' },
    { name: 'submit', eventType: 'SubmitEvent', group: 'form' },
    { name: 'reset', eventType: 'Event', group: 'form' },
    { name: 'invalid', eventType: 'Event', group: 'form' },

    { name: 'focus', eventType: 'FocusEvent', group: 'focus' },
    { name: 'blur', eventType: 'FocusEvent', group: 'focus' },
    { name: 'focusin', eventType: 'FocusEvent', group: 'focus' },
    { name: 'focusout', eventType: 'FocusEvent', group: 'focus' },

    { name: 'dragstart', eventType: 'DragEvent', group: 'drag' },
    { name: 'drag', eventType: 'DragEvent', group: 'drag' },
    { name: 'dragenter', eventType: 'DragEvent', group: 'drag' },
    { name: 'dragover', eventType: 'DragEvent', group: 'drag' },
    { name: 'dragleave', eventType: 'DragEvent', group: 'drag' },
    { name: 'drop', eventType: 'DragEvent', group: 'drag' },
    { name: 'dragend', eventType: 'DragEvent', group: 'drag' },

    { name: 'copy', eventType: 'ClipboardEvent', group: 'clipboard' },
    { name: 'cut', eventType: 'ClipboardEvent', group: 'clipboard' },
    { name: 'paste', eventType: 'ClipboardEvent', group: 'clipboard' },

    { name: 'load', eventType: 'Event', group: 'media' },
    { name: 'error', eventType: 'Event', group: 'media' },
    { name: 'scroll', eventType: 'Event', group: 'media' },
    { name: 'wheel', eventType: 'WheelEvent', group: 'media' },

    { name: 'animationstart', eventType: 'AnimationEvent', group: 'animation' },
    { name: 'animationiteration', eventType: 'AnimationEvent', group: 'animation' },
    { name: 'animationend', eventType: 'AnimationEvent', group: 'animation' },

    { name: 'transitionstart', eventType: 'TransitionEvent', group: 'transition' },
    { name: 'transitionrun', eventType: 'TransitionEvent', group: 'transition' },
    { name: 'transitionend', eventType: 'TransitionEvent', group: 'transition' },
    { name: 'transitioncancel', eventType: 'TransitionEvent', group: 'transition' },
  ] satisfies readonly EventDefinition[]

  const eventTypes = new Map(definitions.map((definition) => [
    definition.name,
    definition.eventType,
  ]))

  export const options = definitions.map((definition) => ({
    value: definition.name,
    label: definition.name,
    detail: definition.eventType,
    title: `${definition.group}: ${definition.eventType}`,
  })) satisfies readonly ElementEditSchema.SelectOption[]

  export const getEventType = (eventName: string): string => (
    eventTypes.get(eventName) ?? 'Event'
  )

  export const isKnown = (eventName: string): boolean => eventTypes.has(eventName)
}

export default TagEventCatalog
