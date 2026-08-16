import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'

namespace LoopElement {
  export type Kind = 'loop'

  export type CountElement = {
    kind: Kind
    mode: 'count'
    countSource: string
    indexId: string
  }

  export type CollectionElement = {
    kind: Kind
    mode: 'collection'
    collectionSource: string
    itemId: string
    indexId: string
  }

  export type Element = CountElement | CollectionElement

  export const createCount = (
    countSource: string,
    indexId: string,
  ): CountElement => ({
    kind: 'loop',
    mode: 'count',
    countSource,
    indexId,
  })

  export const createCollection = (
    collectionSource: string,
    itemId: string,
    indexId: string,
  ): CollectionElement => ({
    kind: 'loop',
    mode: 'collection',
    collectionSource,
    itemId,
    indexId,
  })

  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
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
        defaultValue: 'item',
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
        defaultValue: 'index',
        required: true,
        charset: 'jsIdentifier',
        minLength: 1,
        maxLength: 32,
        differentFromKeys: ['itemId'],
        differentFromWhen: { key: 'mode', value: 'collection' },
      },
    ],
    createPreview: () => createCount('...', 'index'),
    getInitialValues: (element) => {
      return {
        mode: element.mode,
        countSource: element.mode === 'count' ? element.countSource : '0',
        collectionSource: element.mode === 'collection' ? element.collectionSource : '',
        itemId: element.mode === 'collection' ? element.itemId : 'item',
        indexId: element.indexId,
      }
    },
    create: (values) => values.mode === 'collection'
      ? createCollection(
          values.collectionSource,
          values.itemId,
          values.indexId,
        )
      : createCount(values.countSource, values.indexId),
    update: (_element, values) => values.mode === 'collection'
      ? createCollection(
          values.collectionSource,
          values.itemId,
          values.indexId,
        )
      : createCount(values.countSource, values.indexId),
  })

  const getPreview = (element: Element): string => {
    const source = (
      element.mode === 'count' ? element.countSource : element.collectionSource
    ).replace(/\s*\r?\n\s*/g, ' ')
    const sourcePreview = source.length > 24 ? `${source.slice(0, 24)}...` : source
    return element.mode === 'count'
      ? `$var.${element.indexId}: ${sourcePreview}`
      : `$var.${element.itemId}, $var.${element.indexId}: ${sourcePreview}`
  }

  export const definition = {
    kind: 'loop',
    treeLabel: {
      type: 'static',
      kindText: 'Loop',
      tone: 'iteration',
      getValueText: getPreview,
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
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default LoopElement
