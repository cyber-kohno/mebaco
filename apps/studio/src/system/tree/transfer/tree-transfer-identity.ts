import ExpressionReferenceRenamer from '../../analysis/reference/expression-reference-renamer'
import DefinitionCatalog from '../../element/definition-catalog'
import type MebacoElement from '../../element/element'
import type SignatureDefinition from '../../element/kind/type/signature/signature-definition'
import type TypeExpression from '../../element/kind/type/type-expression'
import type ValueTypeDefinition from '../../element/kind/type/value-type-definition'
import TreeTransferCatalog from './tree-transfer-catalog'
import type TreeNode from '../tree-node'

namespace TreeTransferIdentity {
  export type CopyResult = {
    node: TreeNode.Node
    nextNodeId: number
    nodeIds: ReadonlyMap<number, number>
  }

  type IdentityMaps = {
    definitionIds: Map<string, string>
    parameterIds: Map<string, string>
    propertyIds: Map<string, string>
    referenceIds: Map<string, string>
  }

  const createMaps = (): IdentityMaps => ({
    definitionIds: new Map(),
    parameterIds: new Map(),
    propertyIds: new Map(),
    referenceIds: new Map(),
  })

  const addFreshId = (
    map: Map<string, string>,
    id: string,
  ) => {
    if (!map.has(id)) map.set(id, crypto.randomUUID())
  }

  const collectTypeExpression = (
    expression: TypeExpression.Expression,
    maps: IdentityMaps,
  ) => {
    if (expression.type === 'array') {
      collectTypeExpression(expression.item, maps)
      return
    }
    if (expression.type !== 'object') return
    expression.properties.forEach((property) => {
      addFreshId(maps.propertyIds, property.propertyId)
      collectTypeExpression(property.valueType, maps)
    })
  }

  const collectValueType = (
    definition: ValueTypeDefinition.Definition | null,
    maps: IdentityMaps,
  ) => {
    if (definition != null) collectTypeExpression(definition.valueType, maps)
  }

  const collectSignature = (
    definition: SignatureDefinition.Definition,
    maps: IdentityMaps,
  ) => {
    definition.parameters.forEach((parameter) => {
      addFreshId(maps.parameterIds, parameter.parameterId)
      collectTypeExpression(parameter.valueType, maps)
    })
    collectValueType(definition.returnType, maps)
  }

  const collectElementIdentities = (
    element: MebacoElement.Element,
    maps: IdentityMaps,
  ) => {
    const definitionId = DefinitionCatalog.getDefinitionId(element)
    if (definitionId != null) addFreshId(maps.definitionIds, definitionId)

    switch (element.kind) {
      case 'style':
        element.bases.forEach((base) => addFreshId(maps.referenceIds, base.referenceId))
        break
      case 'object-type':
        element.properties.forEach((property) => {
          addFreshId(maps.propertyIds, property.propertyId)
          collectTypeExpression(property.valueType, maps)
        })
        break
      case 'signature-type':
        collectSignature(element, maps)
        break
      case 'function':
        if (element.signature.mode === 'inline') {
          collectSignature(element.signature.definition, maps)
        }
        break
      case 'variable':
        if (element.typeSetting.type === 'explicit') {
          collectTypeExpression(element.typeSetting.valueType, maps)
        }
        break
      case 'promise':
        collectValueType(element.resultType, maps)
        break
      case 'tag':
        element.styles.forEach((style) => addFreshId(maps.referenceIds, style.referenceId))
        break
      case 'value-prop':
      case 'launch-argument':
      case 'state':
        collectTypeExpression(element.valueType, maps)
        break
    }
  }

  const collectIdentities = (
    node: TreeNode.Node,
    maps: IdentityMaps,
  ) => {
    collectElementIdentities(node.element, maps)
    node.children.forEach((child) => collectIdentities(child, maps))
  }

  const remapTypeExpression = (
    expression: TypeExpression.Expression,
    maps: IdentityMaps,
  ) => {
    if (expression.type === 'array') {
      remapTypeExpression(expression.item, maps)
      return
    }
    if (expression.type === 'reference') {
      expression.objectTypeIds = expression.objectTypeIds.map(
        (id) => maps.definitionIds.get(id) ?? id,
      )
      return
    }
    if (expression.type === 'named') {
      expression.namedTypeId = maps.definitionIds.get(expression.namedTypeId)
        ?? expression.namedTypeId
      return
    }
    if (expression.type !== 'object') return
    expression.properties.forEach((property) => {
      property.propertyId = maps.propertyIds.get(property.propertyId)
        ?? property.propertyId
      remapTypeExpression(property.valueType, maps)
    })
  }

  const remapValueType = (
    definition: ValueTypeDefinition.Definition | null,
    maps: IdentityMaps,
  ) => {
    if (definition != null) remapTypeExpression(definition.valueType, maps)
  }

  const remapSignature = (
    definition: SignatureDefinition.Definition,
    maps: IdentityMaps,
  ) => {
    definition.parameters.forEach((parameter) => {
      parameter.parameterId = maps.parameterIds.get(parameter.parameterId)
        ?? parameter.parameterId
      remapTypeExpression(parameter.valueType, maps)
    })
    remapValueType(definition.returnType, maps)
  }

  const cloneElement = (
    element: MebacoElement.Element,
    copiedName: string | null,
    maps: IdentityMaps,
    isRoot: boolean,
  ): MebacoElement.Element => {
    const clone = structuredClone(element)

    switch (clone.kind) {
      case 'style':
        if (isRoot && copiedName != null) clone.id = copiedName
        clone.styleId = maps.definitionIds.get(clone.styleId) ?? clone.styleId
        clone.bases.forEach((base) => {
          base.referenceId = maps.referenceIds.get(base.referenceId)
            ?? base.referenceId
          base.styleId = maps.definitionIds.get(base.styleId) ?? base.styleId
          base.arguments.forEach((argument) => {
            argument.parameterId = maps.definitionIds.get(argument.parameterId)
              ?? argument.parameterId
          })
        })
        break
      case 'style-param':
        clone.parameterId = maps.definitionIds.get(clone.parameterId)
          ?? clone.parameterId
        break
      case 'tag':
        clone.styles.forEach((style) => {
          style.referenceId = maps.referenceIds.get(style.referenceId)
            ?? style.referenceId
          style.styleId = maps.definitionIds.get(style.styleId) ?? style.styleId
          style.arguments.forEach((argument) => {
            argument.parameterId = maps.definitionIds.get(argument.parameterId)
              ?? argument.parameterId
          })
        })
        break
      case 'component':
        clone.componentId = maps.definitionIds.get(clone.componentId)
          ?? clone.componentId
        break
      case 'component-use':
        if (clone.componentId != null) {
          clone.componentId = maps.definitionIds.get(clone.componentId)
            ?? clone.componentId
        }
        clone.propBindings.forEach((binding) => {
          binding.propId = maps.definitionIds.get(binding.propId) ?? binding.propId
        })
        break
      case 'slot':
      case 'slot-content':
        clone.slotId = maps.definitionIds.get(clone.slotId) ?? clone.slotId
        break
      case 'slot-use':
        clone.slotId = maps.definitionIds.get(clone.slotId) ?? clone.slotId
        clone.propBindings.forEach((binding) => {
          binding.propId = maps.definitionIds.get(binding.propId) ?? binding.propId
        })
        break
      case 'object-type':
        if (isRoot && copiedName != null) clone.id = copiedName
        clone.typeId = maps.definitionIds.get(clone.typeId) ?? clone.typeId
        clone.baseObjectIds = clone.baseObjectIds.map(
          (id) => maps.definitionIds.get(id) ?? id,
        )
        clone.properties.forEach((property) => {
          property.propertyId = maps.propertyIds.get(property.propertyId)
            ?? property.propertyId
          remapTypeExpression(property.valueType, maps)
        })
        break
      case 'union-type':
        if (isRoot && copiedName != null) clone.id = copiedName
        clone.typeId = maps.definitionIds.get(clone.typeId) ?? clone.typeId
        if (clone.definition.type === 'object') {
          clone.definition.objectTypeIds = clone.definition.objectTypeIds.map(
            (id) => maps.definitionIds.get(id) ?? id,
          )
        }
        break
      case 'signature-type':
        if (isRoot && copiedName != null) clone.id = copiedName
        clone.typeId = maps.definitionIds.get(clone.typeId) ?? clone.typeId
        remapSignature(clone, maps)
        break
      case 'function':
        if (isRoot && copiedName != null) clone.id = copiedName
        if (clone.signature.mode === 'inline') {
          remapSignature(clone.signature.definition, maps)
        } else {
          clone.signature.signatureTypeId = maps.definitionIds.get(
            clone.signature.signatureTypeId,
          ) ?? clone.signature.signatureTypeId
        }
        break
      case 'variable':
        if (clone.typeSetting.type === 'explicit') {
          remapTypeExpression(clone.typeSetting.valueType, maps)
        }
        break
      case 'promise':
        remapValueType(clone.resultType, maps)
        break
      case 'value-prop':
        clone.propId = maps.definitionIds.get(clone.propId) ?? clone.propId
        remapTypeExpression(clone.valueType, maps)
        break
      case 'launch-argument':
        clone.propId = maps.definitionIds.get(clone.propId) ?? clone.propId
        remapTypeExpression(clone.valueType, maps)
        break
      case 'state':
        remapTypeExpression(clone.valueType, maps)
        break
      case 'switch':
      case 'control-switch':
        if (clone.valueType.type === 'union') {
          clone.valueType.unionTypeId = maps.definitionIds.get(clone.valueType.unionTypeId)
            ?? clone.valueType.unionTypeId
        }
        break
    }
    return clone
  }

  export const copy = (
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    copiedName: string | null,
    firstNodeId: number,
  ): CopyResult => {
    if (!TreeTransferCatalog.isTransferableKind(sourceNode.element.kind)) {
      throw new Error(`Element '${sourceNode.element.kind}' cannot be copied.`)
    }

    const maps = createMaps()
    collectIdentities(sourceNode, maps)
    const nodeIds = new Map<number, number>()
    let nextNodeId = firstNodeId

    const cloneNode = (node: TreeNode.Node, isRoot = false): TreeNode.Node => {
      const nextId = nextNodeId++
      nodeIds.set(node.id, nextId)
      const sourceElement = sourceNode.element.kind === 'function' && copiedName != null
        ? ExpressionReferenceRenamer.rewriteElementReferences(
            rootNode,
            node.id,
            sourceNode.id,
            copiedName,
          ).element
        : node.element
      return {
        id: nextId,
        element: cloneElement(sourceElement, copiedName, maps, isRoot),
        isOpen: node.isOpen,
        disabled: node.disabled,
        children: node.children.map((child) => cloneNode(child)),
      }
    }

    return {
      node: cloneNode(sourceNode, true),
      nextNodeId,
      nodeIds,
    }
  }
}

export default TreeTransferIdentity
