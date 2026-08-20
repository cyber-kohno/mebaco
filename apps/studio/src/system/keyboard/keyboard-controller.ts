import ShortcutCommand from './shortcut-command'
import ShortcutRegistry from './shortcut-registry'

namespace KeyboardController {
  const matchesKey = (
    event: KeyboardEvent,
    key: ShortcutCommand.Key,
  ): boolean => (
    event.key === key.key
    && event.ctrlKey === (key.ctrl ?? false)
    && event.shiftKey === (key.shift ?? false)
    && event.altKey === (key.alt ?? false)
    && event.metaKey === (key.meta ?? false)
  )

  export const handleKeydown = (
    event: KeyboardEvent,
    context: ShortcutCommand.Context,
  ) => {
    const command = ShortcutRegistry.commands.find((command) => (
      matchesKey(event, command.key) && command.when(context)
    ))
    if (command == null) return

    event.preventDefault()
    event.stopPropagation()
    command.run(context)
  }
}

export default KeyboardController
