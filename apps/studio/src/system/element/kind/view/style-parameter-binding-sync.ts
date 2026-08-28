import TreeNode from '../../../tree/tree-node'
import type StyleElement from './style-element'
import type StyleParamElement from './style-param-element'
import StyleParameterValue from './style-parameter-value'
import type TagElement from './tag-element'

namespace StyleParameterBindingSync {
  type Operation =
    | {
        type: 'add'
        ownerStyleId: string
        parameter: StyleParamElement.Element
      }
    | {
        type: 'update'
        ownerStyleId: string
        previous: StyleParamElement.Element
        parameter: StyleParamElement.Element
      }
    | {
        type: 'remove'
        parameterIds: ReadonlySet<string>
      }

  const findOwnerStyleId = (
    rootNode: TreeNode.Node,
    parameterNodeId: number,
  ): string | null => {
    const path = TreeNode.findPath(rootNode, parameterNodeId)
    const paramsNode = path?.at(-2)
    const styleNode = path?.at(-3)
    return paramsNode?.element.kind === 'style-params'
      && styleNode?.element.kind === 'style'
      ? styleNode.element.styleId
      : null
  }

  const createResolvedBinding = (
    parameter: StyleParamElement.Element,
  ): StyleElement.ArgumentBinding => parameter.defaultValue === undefined
    ? {
        type: 'value',
        value: {
          type: 'literal',
          value: StyleParameterValue.createTypeDefault(parameter.valueType),
        },
      }
    : { type: 'default' }

  const valueTypeChanged = (
    previous: StyleParamElement.Element,
    parameter: StyleParamElement.Element,
  ): boolean => previous.valueType !== parameter.valueType

  const reconcileArguments = (
    arguments_: readonly StyleElement.Argument[],
    operation: Operation,
    directlyReferencesOwner: boolean,
    usage: 'inheritance' | 'application',
  ): StyleElement.Argument[] => {
    if (operation.type === 'remove') {
      return arguments_.filter((argument) => !operation.parameterIds.has(argument.parameterId))
    }

    const parameterId = operation.parameter.parameterId
    const currentIndex = arguments_.findIndex((argument) => argument.parameterId === parameterId)
    if (operation.type === 'add') {
      if (!directlyReferencesOwner || currentIndex >= 0) return [...arguments_]
      return [
        ...arguments_,
        { parameterId, binding: createResolvedBinding(operation.parameter) },
      ]
    }

    if (currentIndex < 0) {
      if (usage === 'inheritance' || !directlyReferencesOwner) return [...arguments_]
      return [
        ...arguments_,
        { parameterId, binding: createResolvedBinding(operation.parameter) },
      ]
    }

    const current = arguments_[currentIndex]
    if (current.binding.type === 'delegate') return [...arguments_]
    const shouldReset = valueTypeChanged(operation.previous, operation.parameter)
      || (
        current.binding.type === 'default'
        && operation.previous.defaultValue !== undefined
        && operation.parameter.defaultValue === undefined
      )
    if (!shouldReset) return [...arguments_]

    const next: StyleElement.Argument = {
      parameterId,
      binding: createResolvedBinding(operation.parameter),
    }
    return arguments_.map((argument, index) => index === currentIndex ? next : argument)
  }

  const apply = (
    rootNode: TreeNode.Node,
    operation: Operation,
  ): number => {
    let updatedCount = 0
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'style') {
        const element = node.element
        const bases = element.bases.map((base) => ({
          ...base,
          arguments: reconcileArguments(
            base.arguments,
            operation,
            operation.type !== 'remove' && base.styleId === operation.ownerStyleId,
            'inheritance',
          ),
        }))
        if (JSON.stringify(bases) !== JSON.stringify(element.bases)) {
          node.element = { ...element, bases }
          updatedCount += 1
        }
      } else if (node.element.kind === 'tag') {
        const element = node.element
        const styles = element.styles.map((style) => ({
          ...style,
          arguments: reconcileArguments(
            style.arguments,
            operation,
            operation.type !== 'remove' && style.styleId === operation.ownerStyleId,
            'application',
          ) as TagElement.StyleArgument[],
        }))
        if (JSON.stringify(styles) !== JSON.stringify(element.styles)) {
          node.element = { ...element, styles }
          updatedCount += 1
        }
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return updatedCount
  }

  export const add = (
    rootNode: TreeNode.Node,
    parameterNodeId: number,
    parameter: StyleParamElement.Element,
  ): number => {
    const ownerStyleId = findOwnerStyleId(rootNode, parameterNodeId)
    return ownerStyleId == null
      ? 0
      : apply(rootNode, { type: 'add', ownerStyleId, parameter })
  }

  export const update = (
    rootNode: TreeNode.Node,
    parameterNodeId: number,
    previous: StyleParamElement.Element,
    parameter: StyleParamElement.Element,
  ): number => {
    const ownerStyleId = findOwnerStyleId(rootNode, parameterNodeId)
    return ownerStyleId == null
      ? 0
      : apply(rootNode, {
          type: 'update',
          ownerStyleId,
          previous,
          parameter,
        })
  }

  export const remove = (
    rootNode: TreeNode.Node,
    parameterIds: Iterable<string>,
  ): number => apply(rootNode, {
    type: 'remove',
    parameterIds: new Set(parameterIds),
  })
}

export default StyleParameterBindingSync
