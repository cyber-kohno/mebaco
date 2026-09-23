import type MebacoElement from '@system/model/element/element'
import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type TreeNode from '@system/model/tree/tree-node'
import AppElementDefinition from '@system/workspace/element-definition/app/app-element-definition'
import EntryElementDefinition from '@system/workspace/element-definition/app/entry-element-definition'
import LaunchOptionsElementDefinition from '@system/workspace/element-definition/app/launch-options-element-definition'
import LaunchArgumentsElementDefinition from '@system/workspace/element-definition/app/launch-arguments-element-definition'
import LaunchArgumentElementDefinition from '@system/workspace/element-definition/app/launch-argument-element-definition'
import ImportsElementDefinition from '@system/workspace/element-definition/app/import/imports-element-definition'
import TransitionsElementDefinition from '@system/workspace/element-definition/app/import/transitions-element-definition'
import ResourceImportsElementDefinition from '@system/workspace/element-definition/app/import/resource-imports-element-definition'
import StorageImportsElementDefinition from '@system/workspace/element-definition/app/import/storage-imports-element-definition'
import LauncherElementDefinition from '@system/workspace/element-definition/project/launcher-element-definition'
import ComponentElement from '@system/workspace/element-definition/component/component-element-definition'
import ComponentUseElement from '@system/workspace/element-definition/component/component-use-element-definition'
import ElementsElement from '@system/workspace/element-definition/component/elements-element-definition'
import PropsElement from '@system/workspace/element-definition/component/props-element-definition'
import SlotsElement from '@system/workspace/element-definition/component/slots-element-definition'
import SlotElement from '@system/workspace/element-definition/component/slot-element-definition'
import SlotContentsElement from '@system/workspace/element-definition/component/slot-contents-element-definition'
import SlotContentElement from '@system/workspace/element-definition/component/slot-content-element-definition'
import SlotUseElement from '@system/workspace/element-definition/component/slot-use-element-definition'
import RetentionElement from '@system/workspace/element-definition/component/retention-element-definition'
import ValuePropElement from '@system/workspace/element-definition/component/value-prop-element-definition'
import ConditionalElementDefinition from '@system/workspace/element-definition/directive/conditional-element-definition'
import ElseElementDefinition from '@system/workspace/element-definition/directive/else-element-definition'
import ElseIfElementDefinition from '@system/workspace/element-definition/directive/else-if-element-definition'
import IfElementDefinition from '@system/workspace/element-definition/directive/if-element-definition'
import CaseElement from '@system/workspace/element-definition/directive/case-element-definition'
import DefaultElementDefinition from '@system/workspace/element-definition/directive/default-element-definition'
import SwitchElement from '@system/workspace/element-definition/directive/switch-element-definition'
import ControlConditionalElementDefinition from '@system/workspace/element-definition/directive/control-conditional-element-definition'
import ControlSwitchElement from '@system/workspace/element-definition/directive/control-switch-element-definition'
import LoopElement from '@system/workspace/element-definition/directive/loop-element-definition'
import ComponentsElementDefinition from '@system/workspace/element-definition/declaration/components-element-definition'
import DeclaresElementDefinition from '@system/workspace/element-definition/declaration/declares-element-definition'
import FunctionsElementDefinition from '@system/workspace/element-definition/declaration/functions-element-definition'
import TypesElementDefinition from '@system/workspace/element-definition/declaration/types-element-definition'
import StylesElementDefinition from '@system/workspace/element-definition/declaration/styles-element-definition'
import ConstantsElementDefinition from '@system/workspace/element-definition/declaration/constants-element-definition'
import ConstantElementDefinition from '@system/workspace/element-definition/declaration/constant-element-definition'
import AppsElementDefinition from '@system/workspace/element-definition/project/apps-element-definition'
import CommonElementDefinition from '@system/workspace/element-definition/project/common-element-definition'
import LaunchersElementDefinition from '@system/workspace/element-definition/project/launchers-element-definition'
import ProjectElementDefinition from '@system/workspace/element-definition/project/project-element-definition'
import StateElementDefinition from '@system/workspace/element-definition/variable/store/state-element-definition'
import StatesElementDefinition from '@system/workspace/element-definition/variable/store/states-element-definition'
import StoreElementDefinition from '@system/workspace/element-definition/variable/store/store-element-definition'
import EffectsElementDefinition from '@system/workspace/element-definition/variable/store/effects-element-definition'
import EffectElementDefinition from '@system/workspace/element-definition/variable/store/effect-element-definition'
import StyleElement from '@system/workspace/element-definition/view/style/style-element-definition'
import StyleParamElement from '@system/workspace/element-definition/view/style/style-param-element-definition'
import StyleParamsElement from '@system/workspace/element-definition/view/style/style-params-element-definition'
import StyleLocalsElement from '@system/workspace/element-definition/view/style/style-locals-element-definition'
import StyleKeyframesElement from '@system/workspace/element-definition/view/style/style-keyframes-element-definition'
import TagElement from '@system/workspace/element-definition/view/tag-element-definition'
import TextElement from '@system/workspace/element-definition/view/text-element-definition'
import ObjectTypeElementDefinition from '@system/workspace/element-definition/type-system/object/object-type-element-definition'
import UnionTypeElementDefinition from '@system/workspace/element-definition/type-system/union/union-type-element-definition'
import SignatureTypeElementDefinition from '@system/workspace/element-definition/type-system/signature/signature-type-element-definition'
import VariableElementDefinition from '@system/workspace/element-definition/variable/variable-element-definition'
import ActionElementDefinition from '@system/workspace/element-definition/variable/action-element-definition'
import TransitionElementDefinition from '@system/workspace/element-definition/variable/transition-element-definition'
import BlockElementDefinition from '@system/workspace/element-definition/block/block-element-definition'
import FunctionElementDefinition from '@system/workspace/element-definition/function/function-element-definition'
import FunctionProcedureElementDefinition from '@system/workspace/element-definition/function/function-procedure-element-definition'
import FunctionReturnElementDefinition from '@system/workspace/element-definition/function/function-return-element-definition'
import PromiseElementDefinition from '@system/workspace/element-definition/promise/promise-element-definition'
import PromiseThenElementDefinition from '@system/workspace/element-definition/promise/promise-then-element-definition'
import PromiseCatchElementDefinition from '@system/workspace/element-definition/promise/promise-catch-element-definition'
import ResourcesElementDefinition from '@system/workspace/element-definition/resource/resources-element-definition'
import DirectoryResourceElementDefinition from '@system/workspace/element-definition/resource/directory-resource-element-definition'
import TextResourceElementDefinition from '@system/workspace/element-definition/resource/text-resource-element-definition'
import SqliteResourceElementDefinition from '@system/workspace/element-definition/resource/sqlite-resource-element-definition'
import StorageElementDefinition from '@system/workspace/element-definition/storage/storage-element-definition'
import StorageItemElementDefinition from '@system/workspace/element-definition/storage/storage-item-element-definition'
import DebugElement from '@system/workspace/element-definition/debug/debug-element-definition'
import DebugConfigurationsElement from '@system/workspace/element-definition/debug/debug-configurations-element-definition'
import DebugConfigurationElement from '@system/workspace/element-definition/debug/debug-configuration-element-definition'
import DebugResourceBindingsElement from '@system/workspace/element-definition/debug/debug-resource-bindings-element-definition'
import DebugLogElement from '@system/workspace/element-definition/debug/debug-log-element-definition'
import DebugLaunchShortcutsElement from '@system/workspace/element-definition/debug/debug-launch-shortcuts-element-definition'
import ReleaseElementDefinition from '@system/workspace/element-definition/release/release-element-definition'
import BundlesElementDefinition from '@system/workspace/element-definition/release/bundles-element-definition'
import BundleElementDefinition from '@system/workspace/element-definition/release/bundle-element-definition'

namespace ElementRegistry {
  type DefinitionMap = {
    [K in MebacoElement.Kind]: ElementDefinition.Definition<
      Extract<MebacoElement.Element, { kind: K }>
    >
  }

  const definitions = {
    app: AppElementDefinition.definition,
    entry: EntryElementDefinition.definition,
    'launch-options': LaunchOptionsElementDefinition.definition,
    'launch-arguments': LaunchArgumentsElementDefinition.definition,
    'launch-argument': LaunchArgumentElementDefinition.definition,
    imports: ImportsElementDefinition.definition,
    transitions: TransitionsElementDefinition.definition,
    'resource-imports': ResourceImportsElementDefinition.definition,
    'storage-imports': StorageImportsElementDefinition.definition,
    launcher: LauncherElementDefinition.definition,
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
    conditional: ConditionalElementDefinition.definition,
    else: ElseElementDefinition.definition,
    'else-if': ElseIfElementDefinition.definition,
    if: IfElementDefinition.definition,
    case: CaseElement.definition,
    default: DefaultElementDefinition.definition,
    switch: SwitchElement.definition,
    'control-conditional': ControlConditionalElementDefinition.definition,
    'control-switch': ControlSwitchElement.definition,
    loop: LoopElement.definition,
    apps: AppsElementDefinition.definition,
    common: CommonElementDefinition.definition,
    components: ComponentsElementDefinition.definition,
    declares: DeclaresElementDefinition.definition,
    functions: FunctionsElementDefinition.definition,
    launchers: LaunchersElementDefinition.definition,
    project: ProjectElementDefinition.definition,
    state: StateElementDefinition.definition,
    states: StatesElementDefinition.definition,
    store: StoreElementDefinition.definition,
    effects: EffectsElementDefinition.definition,
    effect: EffectElementDefinition.definition,
    style: StyleElement.definition,
    'style-param': StyleParamElement.definition,
    'style-params': StyleParamsElement.definition,
    'style-locals': StyleLocalsElement.definition,
    'style-keyframes': StyleKeyframesElement.definition,
    tag: TagElement.definition,
    text: TextElement.definition,
    types: TypesElementDefinition.definition,
    'object-type': ObjectTypeElementDefinition.definition,
    'union-type': UnionTypeElementDefinition.definition,
    'signature-type': SignatureTypeElementDefinition.definition,
    styles: StylesElementDefinition.definition,
    constants: ConstantsElementDefinition.definition,
    constant: ConstantElementDefinition.definition,
    variable: VariableElementDefinition.definition,
    action: ActionElementDefinition.definition,
    transition: TransitionElementDefinition.definition,
    block: BlockElementDefinition.definition,
    function: FunctionElementDefinition.definition,
    'function-procedure': FunctionProcedureElementDefinition.definition,
    'function-return': FunctionReturnElementDefinition.definition,
    promise: PromiseElementDefinition.definition,
    'promise-then': PromiseThenElementDefinition.definition,
    'promise-catch': PromiseCatchElementDefinition.definition,
    resources: ResourcesElementDefinition.definition,
    'directory-resource': DirectoryResourceElementDefinition.definition,
    'text-resource': TextResourceElementDefinition.definition,
    'sqlite-resource': SqliteResourceElementDefinition.definition,
    storage: StorageElementDefinition.definition,
    'key-value': StorageItemElementDefinition.definition,
    debug: DebugElement.definition,
    'debug-configurations': DebugConfigurationsElement.definition,
    'debug-configuration': DebugConfigurationElement.definition,
    'debug-resource-bindings': DebugResourceBindingsElement.definition,
    'debug-log': DebugLogElement.definition,
    'debug-launch-shortcuts': DebugLaunchShortcutsElement.definition,
    release: ReleaseElementDefinition.definition,
    bundles: BundlesElementDefinition.definition,
    bundle: BundleElementDefinition.definition,
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
