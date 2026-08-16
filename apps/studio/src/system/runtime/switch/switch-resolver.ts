import type FormulaContext from '../formula/formula-context'
import type ScriptError from '../script/script-error'
import type TreeNode from '../../tree/tree-node'
import FormulaEvaluator from '../formula/formula-evaluator'
import ScriptErrorValue from '../script/script-error'
import SwitchValueType from '../../element/kind/directive/switch-value-type'
import type UnionDefinition from '../../element/kind/type/union-definition'

namespace SwitchResolver {
  export type Result = {
    branchNode: TreeNode.Node | null
    error: ScriptError.Value | null
  }

  const invalid = (message: string): Result => ({
    branchNode: null,
    error: ScriptErrorValue.create('runtime', message),
  })

  const normalizeValueType = (
    valueType: unknown,
  ): SwitchValueType.Definition => (
    SwitchValueType.parse(JSON.stringify(valueType))
    ?? SwitchValueType.createFromLegacy(valueType)
  )

  const findLiteralUnion = (
    node: TreeNode.Node,
    unionTypeId: string,
  ): UnionDefinition.Literal | undefined => {
    if (
      node.element.kind === 'union-type'
      && node.element.typeId === unionTypeId
      && node.element.definition.type === 'literal'
    ) return node.element.definition

    for (const child of node.children) {
      const found = findLiteralUnion(child, unionTypeId)
      if (found != null) return found
    }
    return undefined
  }

  export const resolve = (
    switchNode: TreeNode.Node,
    context: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): Result => {
    if (switchNode.element.kind !== 'switch') {
      return invalid('Switch element is invalid.')
    }
    const valueType = normalizeValueType(switchNode.element.valueType)
    const primitive = SwitchValueType.getPrimitiveName(
      valueType,
      (unionTypeId) => findLiteralUnion(projectNode, unionTypeId),
    )
    if (primitive == null) return invalid('Switch Literal Union was not found.')
    const allowedLiterals = SwitchValueType.getAllowedLiterals(
      valueType,
      (unionTypeId) => findLiteralUnion(projectNode, unionTypeId),
    )

    const caseNodes = switchNode.children.filter((node) => node.element.kind === 'case')
    const defaultNodes = switchNode.children.filter((node) => node.element.kind === 'default')
    if (defaultNodes.length > 1) return invalid('Switch has multiple Default branches.')
    if (
      defaultNodes.length === 1
      && switchNode.children.at(-1)?.id !== defaultNodes[0].id
    ) return invalid('Default must be the last Switch branch.')

    const caseKeys = new Set<string>()
    for (const caseNode of caseNodes) {
      if (caseNode.element.kind !== 'case') continue
      if (caseNode.element.value.type !== primitive) {
        return invalid('Case value type does not match the Switch value type.')
      }
      if (
        allowedLiterals != null
        && !allowedLiterals.includes(caseNode.element.value.value)
      ) return invalid('Case value is not allowed by the Switch value type.')
      if (
        caseNode.element.value.type === 'number'
        && !Number.isFinite(caseNode.element.value.value)
      ) return invalid('Case number must be finite.')
      const key = `${caseNode.element.value.type}:${String(caseNode.element.value.value)}`
      if (caseKeys.has(key)) return invalid('Switch contains a duplicated Case value.')
      caseKeys.add(key)
    }

    const evaluated = FormulaEvaluator.evaluateExpression(
      switchNode.element.source,
      context,
    )
    if (!evaluated.ok) return { branchNode: null, error: evaluated.error }
    if (typeof evaluated.value !== primitive) {
      return invalid(`Switch expression must return a ${primitive}.`)
    }
    if (
      primitive === 'number'
      && !Number.isFinite(evaluated.value)
    ) return invalid('Switch expression must return a finite number.')
    if (
      allowedLiterals != null
      && !allowedLiterals.includes(evaluated.value as SwitchValueType.Literal)
    ) return invalid('Switch expression returned a value outside the Literal Union.')

    const matched = caseNodes.find((caseNode) => (
      caseNode.element.kind === 'case'
      && caseNode.element.value.value === evaluated.value
    ))
    return {
      branchNode: matched ?? defaultNodes[0] ?? null,
      error: null,
    }
  }
}

export default SwitchResolver
