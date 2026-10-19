import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import StyleKeyframes from '@system/model/view/style/style-keyframes'

namespace StyleKeyframesElementDefinition {
  export const createSchema = (
    reservedNames: readonly string[] = [],
  ): ElementEditSchema.Schema<StyleKeyframes.Element> => ({
    createTitle: 'Create Keyframes',
    updateTitle: 'Update Keyframes',
    fields: [
      {
        type: 'text',
        key: 'id',
        label: 'Id',
        width: 'id',
        required: true,
        charset: 'identifier',
        minLength: 1,
        maxLength: 32,
        reservedNames,
      },
      {
        type: 'styleKeyframes',
        key: 'frames',
        label: 'Frames',
        defaultValue: JSON.stringify(StyleKeyframes.createInitialFrames()),
      },
    ],
    createPreview: () => StyleKeyframes.create('...'),
    getInitialValues: (element) => ({
      id: element.id,
      frames: JSON.stringify(element.frames),
    }),
    create: (values) => StyleKeyframes.create(
      values.id,
      StyleKeyframes.parseFrames(values.frames),
    ),
    update: (element, values) => ({
      ...element,
      id: values.id,
      frames: StyleKeyframes.parseFrames(values.frames),
    }),
  })

  export const definition = {
    kind: 'style-keyframes',
    treeLabel: {
      type: 'static',
      kindText: 'Keyframes',
      tone: 'master',
      getValueText: (element: StyleKeyframes.Element) => element.id,
    },
    getHierarchyText: ({ element }) => element.id,
    search: { getIdText: (element: StyleKeyframes.Element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.parentNode?.children.flatMap((child) => (
        child.id !== context.node.id && child.element.kind === 'style-keyframes'
          ? [child.element.id]
          : []
      )) ?? []
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema(reservedNames),
        )),
        action('Delete', () => {
          void import('@system/workspace/element-editor/deletion/element-deletion-controller').then(
            ({ default: controller }) => controller.requestDelete({
              rootNode: context.rootNode,
              node: context.node,
              policy: { label: 'Keyframes', structuralReferences: 'block' },
              deleteNode: () => import('@system/workspace/tree/state').then(
                ({ default: store }) => store.removeNode(context.node.id),
              ),
            }),
          )
        }, 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<StyleKeyframes.Element>
}

export default StyleKeyframesElementDefinition
