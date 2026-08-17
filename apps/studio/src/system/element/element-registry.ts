import type MebacoElement from './element'
import type ElementDefinition from './element-definition'
import AppElement from './kind/app/app-element'
import EntryElement from './kind/app/entry-element'
import ComponentElement from './kind/component/component-element'
import ComponentUseElement from './kind/component/component-use-element'
import ElementsElement from './kind/component/elements-element'
import PropsElement from './kind/component/props-element'
import SlotsElement from './kind/component/slots-element'
import SlotElement from './kind/component/slot-element'
import SlotContentsElement from './kind/component/slot-contents-element'
import SlotContentElement from './kind/component/slot-content-element'
import SlotUseElement from './kind/component/slot-use-element'
import RetentionElement from './kind/component/retention-element'
import ValuePropElement from './kind/component/value-prop-element'
import ConditionalElement from './kind/directive/conditional-element'
import ElseElement from './kind/directive/else-element'
import ElseIfElement from './kind/directive/else-if-element'
import IfElement from './kind/directive/if-element'
import CaseElement from './kind/directive/case-element'
import DefaultElement from './kind/directive/default-element'
import SwitchElement from './kind/directive/switch-element'
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
import StyleElement from './kind/view/style-element'
import StyleParamElement from './kind/view/style-param-element'
import StyleParamsElement from './kind/view/style-params-element'
import TagElement from './kind/view/tag-element'
import TextElement from './kind/view/text-element'
import ObjectTypeElement from './kind/type/object-type-element'
import UnionTypeElement from './kind/type/union-type-element'
import VariableElement from './kind/variable/variable-element'
import ActionElement from './kind/variable/action-element'
import BlockElement from './kind/block/block-element'

namespace ElementRegistry {
  type DefinitionMap = {
    [K in MebacoElement.Kind]: ElementDefinition.Definition<
      Extract<MebacoElement.Element, { kind: K }>
    >
  }

  const definitions = {
    app: AppElement.definition,
    entry: EntryElement.definition,
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
    tag: TagElement.definition,
    text: TextElement.definition,
    types: TypesElement.definition,
    'object-type': ObjectTypeElement.definition,
    'union-type': UnionTypeElement.definition,
    styles: StylesElement.definition,
    variable: VariableElement.definition,
    action: ActionElement.definition,
    block: BlockElement.definition,
  } satisfies DefinitionMap

  export const get = <TElement extends MebacoElement.Element>(
    kind: TElement['kind'],
  ): ElementDefinition.Definition<TElement> =>
    definitions[kind] as ElementDefinition.Definition<TElement>
}

export default ElementRegistry
