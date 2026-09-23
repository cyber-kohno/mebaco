import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ContentActions from '@system/workspace/tree/context-menu/content-actions'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import LoopTreeLabel from '@system/workspace/tree/label/directive/LoopTreeLabel.svelte'
import TreeStore from '@system/workspace/tree/state'
import Loop from '@system/model/directive/loop'

namespace LoopElementDefinition {
  export type SchemaOptions = {
    initialItemId?: string
    initialIndexId?: string
  }

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Loop.Element> => ({
    createTitle: 'Create Loop',
    updateTitle: 'Update Loop',
    fields: [
      {
        type: 'select',
        key: 'mode',
        label: 'Mode',
        defaultValue: 'count',
        required: true,
        width: 'mode',
        options: [
          { value: 'count', label: 'Count' },
          { value: 'collection', label: 'For Each' },
        ],
      },
      {
        type: 'formula',
        key: 'countSource',
        label: 'Count',
        defaultValue: '0',
        required: true,
        maxLength: 4000,
        expectedType: 'number',
        visibleWhen: { key: 'mode', value: 'count' },
      },
      {
        type: 'formula',
        key: 'collectionSource',
        label: 'Collection',
        required: true,
        maxLength: 4000,
        expectedType: 'array',
        visibleWhen: { key: 'mode', value: 'collection' },
      },
      {
        type: 'text',
        key: 'itemId',
        label: 'Item Variable',
        width: 'id',
        defaultValue: options.initialItemId ?? 'item',
        required: true,
        charset: 'jsIdentifier',
        minLength: 1,
        maxLength: 32,
        visibleWhen: { key: 'mode', value: 'collection' },
      },
      {
        type: 'text',
        key: 'indexId',
        label: 'Index Variable',
        width: 'id',
        defaultValue: options.initialIndexId ?? 'index',
        required: true,
        charset: 'jsIdentifier',
        minLength: 1,
        maxLength: 32,
        differentFromKeys: ['itemId'],
        differentFromWhen: { key: 'mode', value: 'collection' },
      },
    ],
    createPreview: () => Loop.createCount('...', options.initialIndexId ?? 'index'),
    getInitialValues: (element) => {
      return {
        mode: element.mode,
        countSource: element.mode === 'count' ? element.countSource : '0',
        collectionSource: element.mode === 'collection' ? element.collectionSource : '',
        itemId: element.mode === 'collection' ? element.itemId : options.initialItemId ?? 'item',
        indexId: element.indexId,
      }
    },
    create: (values) => values.mode === 'collection'
      ? Loop.createCollection(
          values.collectionSource,
          values.itemId,
          values.indexId,
        )
      : Loop.createCount(values.countSource, values.indexId),
    update: (_element, values) => values.mode === 'collection'
      ? Loop.createCollection(
          values.collectionSource,
          values.itemId,
          values.indexId,
        )
      : Loop.createCount(values.countSource, values.indexId),
  })

  export const definition = {
    kind: 'loop',
    treeLabel: {
      type: 'component',
      Component: LoopTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const items: ActionMenuState.Item[] = [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema(),
          )
        }),
        ...ContentActions.createOptionalRetentionItems(
          context.node,
          context.rootNode,
        ),
      ]

      items.push(action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'))
      return items
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Loop.Element>
}

export default LoopElementDefinition

