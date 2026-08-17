import AppElement from './kind/app/app-element'
import EntryElement from './kind/app/entry-element'
import ComponentElement from './kind/component/component-element'
import ComponentUseElement from './kind/component/component-use-element'
import ElementsElement from './kind/component/elements-element'
import PropsElement from './kind/component/props-element'
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

const MebacoElement = {}

namespace MebacoElement {
  export type Kind =
    | AppElement.Kind
    | EntryElement.Kind
    | ComponentElement.Kind
    | ComponentUseElement.Kind
    | ElementsElement.Kind
    | PropsElement.Kind
    | RetentionElement.Kind
    | ValuePropElement.Kind
    | ConditionalElement.Kind
    | ElseElement.Kind
    | ElseIfElement.Kind
    | IfElement.Kind
    | CaseElement.Kind
    | DefaultElement.Kind
    | SwitchElement.Kind
    | LoopElement.Kind
    | ComponentsElement.Kind
    | DeclaresElement.Kind
    | FunctionsElement.Kind
    | AppsElement.Kind
    | CommonElement.Kind
    | LaunchersElement.Kind
    | ProjectElement.Kind
    | StateElement.Kind
    | StatesElement.Kind
    | StoreElement.Kind
    | StyleElement.Kind
    | StyleParamElement.Kind
    | StyleParamsElement.Kind
    | TagElement.Kind
    | TextElement.Kind
    | TypesElement.Kind
    | ObjectTypeElement.Kind
    | UnionTypeElement.Kind
    | StylesElement.Kind
    | VariableElement.Kind
    | ActionElement.Kind
    | BlockElement.Kind

  export type Element =
    | AppElement.Element
    | EntryElement.Element
    | ComponentElement.Element
    | ComponentUseElement.Element
    | ElementsElement.Element
    | PropsElement.Element
    | RetentionElement.Element
    | ValuePropElement.Element
    | ConditionalElement.Element
    | ElseElement.Element
    | ElseIfElement.Element
    | IfElement.Element
    | CaseElement.Element
    | DefaultElement.Element
    | SwitchElement.Element
    | LoopElement.Element
    | ComponentsElement.Element
    | DeclaresElement.Element
    | FunctionsElement.Element
    | AppsElement.Element
    | CommonElement.Element
    | LaunchersElement.Element
    | ProjectElement.Element
    | StateElement.Element
    | StatesElement.Element
    | StoreElement.Element
    | StyleElement.Element
    | StyleParamElement.Element
    | StyleParamsElement.Element
    | TagElement.Element
    | TextElement.Element
    | TypesElement.Element
    | ObjectTypeElement.Element
    | UnionTypeElement.Element
    | StylesElement.Element
    | VariableElement.Element
    | ActionElement.Element
    | BlockElement.Element
}

export default MebacoElement
