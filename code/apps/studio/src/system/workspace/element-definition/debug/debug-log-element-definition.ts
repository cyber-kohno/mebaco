import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import DebugLogTreeLabel from '@system/workspace/tree/label/debug/DebugLogTreeLabel.svelte'
import DebugLog from '@system/model/debug/debug-log'

namespace DebugLogElementDefinition {
  const parseLevel = (value: string): DebugLog.Level => {
    switch (value) {
      case 'debug':
      case 'info':
      case 'warn':
      case 'error':
      case 'off':
        return value
      default:
        return 'info'
    }
  }

  export const createSchema = (): ElementEditSchema.Schema<DebugLog.Element> => ({
    createTitle: 'Create Log',
    updateTitle: 'Update Log',
    fields: [
      {
        type: 'select',
        key: 'level',
        label: 'Log level',
        defaultValue: 'info',
        required: true,
        options: [
          { value: 'debug', label: 'Debug' },
          { value: 'info', label: 'Info' },
          { value: 'warn', label: 'Warn' },
          { value: 'error', label: 'Error' },
          { value: 'off', label: 'Off' },
        ],
      },
      { type: 'checkbox', key: 'showLevel', label: 'Show log level', defaultValue: 'true' },
      { type: 'checkbox', key: 'showDate', label: 'Show date', defaultValue: 'true' },
      { type: 'checkbox', key: 'showTime', label: 'Show time', defaultValue: 'true' },
      { type: 'checkbox', key: 'showNodeId', label: 'Show node ID', defaultValue: 'true' },
    ],
    getInitialValues: (element) => ({
      level: element.level,
      showLevel: String(element.showLevel),
      showDate: String(element.showDate),
      showTime: String(element.showTime),
      showNodeId: String(element.showNodeId),
    }),
    create: DebugLog.create,
    update: (element, values) => ({
      ...element,
      level: parseLevel(values.level),
      showLevel: values.showLevel === 'true',
      showDate: values.showDate === 'true',
      showTime: values.showTime === 'true',
      showNodeId: values.showNodeId === 'true',
    }),
  })

  export const definition = {
    kind: 'debug-log',
    treeLabel: { type: 'component', Component: DebugLogTreeLabel },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [action('Modify', () => ElementDialog.openUpdate(
        context.node.id,
        context.element,
        createSchema(),
      ))]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<DebugLog.Element>
}

export default DebugLogElementDefinition
