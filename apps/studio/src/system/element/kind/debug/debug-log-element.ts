import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'

namespace DebugLogElement {
  export type Kind = 'debug-log'
  export type Level = 'debug' | 'info' | 'warn' | 'error' | 'off'

  export type Element = {
    kind: Kind
    level: Level
    showLevel: boolean
    showDate: boolean
    showTime: boolean
    showNodeId: boolean
  }

  export const create = (): Element => ({
    kind: 'debug-log',
    level: 'info',
    showLevel: true,
    showDate: true,
    showTime: true,
    showNodeId: true,
  })

  const parseLevel = (value: string): Level => {
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

  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
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
    create,
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
    treeLabel: { type: 'static', kindText: 'Log', tone: 'manager' },
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
  } satisfies ElementDefinition.Definition<Element>
}

export default DebugLogElement
