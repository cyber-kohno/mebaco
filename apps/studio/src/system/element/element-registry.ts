import type MebacoElement from './element'
import type ElementDefinition from './element-definition'
import type TreeNode from '../tree/tree-node'
import AppElement from './kind/app/app-element'
import EntryElement from './kind/app/entry-element'
import LaunchOptionsElement from './kind/app/launch/launch-options-element'
import LaunchArgumentsElement from './kind/app/launch/launch-arguments-element'
import LaunchArgumentElement from './kind/app/launch/launch-argument-element'
import ImportsElement from './kind/app/import/imports-element'
import TransitionsElement from './kind/app/import/transitions-element'
import LauncherElement from './kind/project/launcher-element'
import ComponentElement from './kind/component/definition/component-element'
import ComponentUseElement from './kind/component/reference/component-use-element'
import ElementsElement from './kind/component/definition/elements-element'
import PropsElement from './kind/component/definition/props-element'
import SlotsElement from './kind/component/definition/slot/slots-element'
import SlotElement from './kind/component/definition/slot/slot-element'
import SlotContentsElement from './kind/component/reference/slot/slot-contents-element'
import SlotContentElement from './kind/component/reference/slot/slot-content-element'
import SlotUseElement from './kind/component/definition/slot/slot-use-element'
import RetentionElement from './kind/component/definition/retention-element'
import ValuePropElement from './kind/component/definition/value-prop-element'
import ConditionalElement from './kind/directive/conditional-element'
import ElseElement from './kind/directive/else-element'
import ElseIfElement from './kind/directive/else-if-element'
import IfElement from './kind/directive/if-element'
import CaseElement from './kind/directive/case-element'
import DefaultElement from './kind/directive/default-element'
import SwitchElement from './kind/directive/switch-element'
import ControlConditionalElement from './kind/directive/control-conditional-element'
import ControlSwitchElement from './kind/directive/control-switch-element'
import LoopElement from './kind/directive/loop-element'
import ComponentsElement from './kind/declare/components-element'
import DeclaresElement from './kind/declare/declares-element'
import FunctionsElement from './kind/declare/functions-element'
import TypesElement from './kind/declare/types-element'
import StylesElement from './kind/declare/styles-element'
import AppsElement from './kind/project/apps-element'
import CommonElement from './kind/project/common-element'
import LaunchersElement from './kind/project/launchers-element'
import ProjectElement from './kind/project/project-element'
import StateElement from './kind/variable/store/state-element'
import StatesElement from './kind/variable/store/states-element'
import StoreElement from './kind/variable/store/store-element'
import StyleElement from './kind/view/style/style-element'
import StyleParamElement from './kind/view/style/style-param-element'
import StyleParamsElement from './kind/view/style/style-params-element'
import StyleLocalsElement from './kind/view/style/style-locals-element'
import TagElement from './kind/view/tag/tag-element'
import TextElement from './kind/view/text/text-element'
import ObjectTypeElement from './kind/type/object/object-type-element'
import UnionTypeElement from './kind/type/union/union-type-element'
import SignatureTypeElement from './kind/type/signature/signature-type-element'
import VariableElement from './kind/variable/variable-element'
import ActionElement from './kind/variable/action-element'
import TransitionElement from './kind/variable/transition-element'
import BlockElement from './kind/block/block-element'
import FunctionElement from './kind/function/function-element'
import FunctionProcedureElement from './kind/function/function-procedure-element'
import FunctionReturnElement from './kind/function/function-return-element'
import PromiseElement from './kind/promise/promise-element'
import PromiseThenElement from './kind/promise/promise-then-element'
import PromiseCatchElement from './kind/promise/promise-catch-element'
import ResourcesElement from './kind/resource/resources-element'
import DirectoryResourceElement from './kind/resource/directory-resource-element'
import TextResourceElement from './kind/resource/text-resource-element'
import SqliteResourceElement from './kind/resource/sqlite-resource-element'
import DebugElement from './kind/debug/debug-element'
import DebugConfigurationsElement from './kind/debug/debug-configurations-element'
import DebugConfigurationElement from './kind/debug/debug-configuration-element'
import DebugResourceBindingsElement from './kind/debug/debug-resource-bindings-element'
import DebugLogElement from './kind/debug/debug-log-element'

namespace ElementRegistry {
  type DefinitionMap = {
    [K in MebacoElement.Kind]: ElementDefinition.Definition<
      Extract<MebacoElement.Element, { kind: K }>
    >
  }

  const definitions = {
    app: AppElement.definition,
    entry: EntryElement.definition,
    'launch-options': LaunchOptionsElement.definition,
    'launch-arguments': LaunchArgumentsElement.definition,
    'launch-argument': LaunchArgumentElement.definition,
    imports: ImportsElement.definition,
    transitions: TransitionsElement.definition,
    launcher: LauncherElement.definition,
    component: ComponentElement.definition,
    'component-use': ComponentUseElement.definition,
    elements: ElementsElement.definition,
    props: PropsElement.definition,
    slots: SlotsElement.definition,
    slot: SlotElement.definition,
    'slot-contents': SlotContentsElement.definition,
    'slot-content': SlotContentElement.definition,
    'slot-use': SlotUseElement.definition,
    retention: RetentionElement.definition,
    'value-prop': ValuePropElement.definition,
    conditional: ConditionalElement.definition,
    else: ElseElement.definition,
    'else-if': ElseIfElement.definition,
    if: IfElement.definition,
    case: CaseElement.definition,
    default: DefaultElement.definition,
    switch: SwitchElement.definition,
    'control-conditional': ControlConditionalElement.definition,
    'control-switch': ControlSwitchElement.definition,
    loop: LoopElement.definition,
    apps: AppsElement.definition,
    common: CommonElement.definition,
    components: ComponentsElement.definition,
    declares: DeclaresElement.definition,
    functions: FunctionsElement.definition,
    launchers: LaunchersElement.definition,
    project: ProjectElement.definition,
    state: StateElement.definition,
    states: StatesElement.definition,
    store: StoreElement.definition,
    style: StyleElement.definition,
    'style-param': StyleParamElement.definition,
    'style-params': StyleParamsElement.definition,
    'style-locals': StyleLocalsElement.definition,
    tag: TagElement.definition,
    text: TextElement.definition,
    types: TypesElement.definition,
    'object-type': ObjectTypeElement.definition,
    'union-type': UnionTypeElement.definition,
    'signature-type': SignatureTypeElement.definition,
    styles: StylesElement.definition,
    variable: VariableElement.definition,
    action: ActionElement.definition,
    transition: TransitionElement.definition,
    block: BlockElement.definition,
    function: FunctionElement.definition,
    'function-procedure': FunctionProcedureElement.definition,
    'function-return': FunctionReturnElement.definition,
    promise: PromiseElement.definition,
    'promise-then': PromiseThenElement.definition,
    'promise-catch': PromiseCatchElement.definition,
    resources: ResourcesElement.definition,
    'directory-resource': DirectoryResourceElement.definition,
    'text-resource': TextResourceElement.definition,
    'sqlite-resource': SqliteResourceElement.definition,
    debug: DebugElement.definition,
    'debug-configurations': DebugConfigurationsElement.definition,
    'debug-configuration': DebugConfigurationElement.definition,
    'debug-resource-bindings': DebugResourceBindingsElement.definition,
    'debug-log': DebugLogElement.definition,
  } satisfies DefinitionMap

  export const get = <TElement extends MebacoElement.Element>(
    kind: TElement['kind'],
  ): ElementDefinition.Definition<TElement> =>
    definitions[kind] as ElementDefinition.Definition<TElement>

  export const getHierarchyText = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): string => (
    get(node.element.kind).getHierarchyText?.({
      element: node.element,
      node,
      rootNode,
    }) ?? node.element.kind
  )

  export const getSearchIdText = (
    element: MebacoElement.Element,
  ): string | null => (
    get(element.kind).search?.getIdText(element) ?? null
  )
}

export default ElementRegistry
