import type App from '@system/model/app/app'
import type Entry from '@system/model/app/entry'
import type LaunchOptions from '@system/model/app/launch-options'
import type LaunchArguments from '@system/model/app/launch-arguments'
import type LaunchArgument from '@system/model/app/launch-argument'
import type Imports from '@system/model/app/import/imports'
import type Transitions from '@system/model/app/import/transitions'
import type ResourceImports from '@system/model/app/import/resource-imports'
import type StorageImports from '@system/model/app/import/storage-imports'
import Launcher from '@system/model/project/launcher'
import ComponentElement from '@system/model/component/component'
import ComponentUseElement from '@system/model/component/component-use'
import ElementsElement from '@system/model/component/elements'
import PropsElement from '@system/model/component/props'
import SlotsElement from '@system/model/component/slots'
import SlotElement from '@system/model/component/slot'
import SlotContentsElement from '@system/model/component/slot-contents'
import SlotContentElement from '@system/model/component/slot-content'
import SlotUseElement from '@system/model/component/slot-use'
import RetentionElement from '@system/model/component/retention'
import ValuePropElement from '@system/model/component/value-prop'
import Conditional from '@system/model/directive/conditional'
import ElseDirective from '@system/model/directive/else'
import ElseIfDirective from '@system/model/directive/else-if'
import IfDirective from '@system/model/directive/if'
import CaseElement from '@system/model/directive/case'
import DefaultDirective from '@system/model/directive/default'
import SwitchElement from '@system/model/directive/switch'
import ControlConditional from '@system/model/directive/control-conditional'
import ControlSwitchElement from '@system/model/directive/control-switch'
import LoopElement from '@system/model/directive/loop'
import Components from '@system/model/declaration/components'
import Declares from '@system/model/declaration/declares'
import Functions from '@system/model/declaration/functions'
import Types from '@system/model/declaration/types'
import Styles from '@system/model/declaration/styles'
import Constants from '@system/model/declaration/constants'
import Constant from '@system/model/declaration/constant'
import Apps from '@system/model/project/apps'
import Common from '@system/model/project/common'
import Launchers from '@system/model/project/launchers'
import ProjectModel from '@system/model/project/project'
import State from '@system/model/variable/state'
import States from '@system/model/variable/states'
import Store from '@system/model/variable/store'
import Effects from '@system/model/variable/effects'
import Effect from '@system/model/variable/effect'
import StyleElement from '@system/model/view/style/style'
import StyleParamElement from '@system/model/view/style/style-param'
import StyleParamsElement from '@system/model/view/style/style-params'
import StyleLocalsElement from '@system/model/view/style/style-locals'
import StyleKeyframesElement from '@system/model/view/style/style-keyframes'
import TagElement from '@system/model/view/tag'
import TextElement from '@system/model/view/text'
import type ObjectType from '@system/model/type-system/object/object-type'
import type UnionType from '@system/model/type-system/union/union-type'
import type SignatureType from '@system/model/type-system/signature/signature-type'
import Variable from '@system/model/variable/variable'
import Action from '@system/model/variable/action'
import Transition from '@system/model/variable/transition'
import Block from '@system/model/block/block'
import FunctionDefinition from '@system/model/function/function-definition'
import FunctionProcedure from '@system/model/function/function-procedure'
import FunctionReturn from '@system/model/function/function-return'
import PromiseModel from '@system/model/promise/promise'
import PromiseThen from '@system/model/promise/promise-then'
import PromiseCatch from '@system/model/promise/promise-catch'
import type Resources from '@system/model/resource/resources'
import type DirectoryResource from '@system/model/resource/directory-resource'
import type TextResource from '@system/model/resource/text-resource'
import type SqliteResource from '@system/model/resource/sqlite-resource'
import Storage from '@system/model/storage/storage'
import type StorageItem from '@system/model/storage/storage-item'
import DebugElement from '@system/model/debug/debug'
import DebugConfigurationsElement from '@system/model/debug/debug-configurations'
import DebugConfigurationElement from '@system/model/debug/debug-configuration'
import DebugResourceBindingsElement from '@system/model/debug/debug-resource-bindings'
import DebugLogElement from '@system/model/debug/debug-log'
import DebugLaunchShortcutsElement from '@system/model/debug/debug-launch-shortcuts'
import Release from '@system/model/release/release'
import Bundles from '@system/model/release/bundles'
import Bundle from '@system/model/release/bundle'

const MebacoElement = {}

namespace MebacoElement {
  export type Kind =
    | App.Kind
    | Entry.Kind
    | LaunchOptions.Kind
    | LaunchArguments.Kind
    | LaunchArgument.Kind
    | Imports.Kind
    | Transitions.Kind
    | ResourceImports.Kind
    | StorageImports.Kind
    | Launcher.Kind
    | ComponentElement.Kind
    | ComponentUseElement.Kind
    | ElementsElement.Kind
    | PropsElement.Kind
    | SlotsElement.Kind
    | SlotElement.Kind
    | SlotContentsElement.Kind
    | SlotContentElement.Kind
    | SlotUseElement.Kind
    | RetentionElement.Kind
    | ValuePropElement.Kind
    | Conditional.Kind
    | ElseDirective.Kind
    | ElseIfDirective.Kind
    | IfDirective.Kind
    | CaseElement.Kind
    | DefaultDirective.Kind
    | SwitchElement.Kind
    | ControlConditional.Kind
    | ControlSwitchElement.Kind
    | LoopElement.Kind
    | Components.Kind
    | Declares.Kind
    | Functions.Kind
    | Apps.Kind
    | Common.Kind
    | Launchers.Kind
    | ProjectModel.Kind
    | State.Kind
    | States.Kind
    | Store.Kind
    | Effects.Kind
    | Effect.Kind
    | StyleElement.Kind
    | StyleParamElement.Kind
    | StyleParamsElement.Kind
    | StyleLocalsElement.Kind
    | StyleKeyframesElement.Kind
    | TagElement.Kind
    | TextElement.Kind
    | Types.Kind
    | ObjectType.Kind
    | UnionType.Kind
    | SignatureType.Kind
    | Styles.Kind
    | Constants.Kind
    | Constant.Kind
    | Variable.Kind
    | Action.Kind
    | Transition.Kind
    | Block.Kind
    | FunctionDefinition.Kind
    | FunctionProcedure.Kind
    | FunctionReturn.Kind
    | PromiseModel.Kind
    | PromiseThen.Kind
    | PromiseCatch.Kind
    | Resources.Kind
    | DirectoryResource.Kind
    | TextResource.Kind
    | SqliteResource.Kind
    | Storage.Kind
    | StorageItem.Kind
    | DebugElement.Kind
    | DebugConfigurationsElement.Kind
    | DebugConfigurationElement.Kind
    | DebugResourceBindingsElement.Kind
    | DebugLogElement.Kind
    | DebugLaunchShortcutsElement.Kind
    | Release.Kind
    | Bundles.Kind
    | Bundle.Kind

  export type Element =
    | App.Element
    | Entry.Element
    | LaunchOptions.Element
    | LaunchArguments.Element
    | LaunchArgument.Element
    | Imports.Element
    | Transitions.Element
    | ResourceImports.Element
    | StorageImports.Element
    | Launcher.Element
    | ComponentElement.Element
    | ComponentUseElement.Element
    | ElementsElement.Element
    | PropsElement.Element
    | SlotsElement.Element
    | SlotElement.Element
    | SlotContentsElement.Element
    | SlotContentElement.Element
    | SlotUseElement.Element
    | RetentionElement.Element
    | ValuePropElement.Element
    | Conditional.Element
    | ElseDirective.Element
    | ElseIfDirective.Element
    | IfDirective.Element
    | CaseElement.Element
    | DefaultDirective.Element
    | SwitchElement.Element
    | ControlConditional.Element
    | ControlSwitchElement.Element
    | LoopElement.Element
    | Components.Element
    | Declares.Element
    | Functions.Element
    | Apps.Element
    | Common.Element
    | Launchers.Element
    | ProjectModel.Element
    | State.Element
    | States.Element
    | Store.Element
    | Effects.Element
    | Effect.Element
    | StyleElement.Element
    | StyleParamElement.Element
    | StyleParamsElement.Element
    | StyleLocalsElement.Element
    | StyleKeyframesElement.Element
    | TagElement.Element
    | TextElement.Element
    | Types.Element
    | ObjectType.Element
    | UnionType.Element
    | SignatureType.Element
    | Styles.Element
    | Constants.Element
    | Constant.Element
    | Variable.Element
    | Action.Element
    | Transition.Element
    | Block.Element
    | FunctionDefinition.Element
    | FunctionProcedure.Element
    | FunctionReturn.Element
    | PromiseModel.Element
    | PromiseThen.Element
    | PromiseCatch.Element
    | Resources.Element
    | DirectoryResource.Element
    | TextResource.Element
    | SqliteResource.Element
    | Storage.Element
    | StorageItem.Element
    | DebugElement.Element
    | DebugConfigurationsElement.Element
    | DebugConfigurationElement.Element
    | DebugResourceBindingsElement.Element
    | DebugLogElement.Element
    | DebugLaunchShortcutsElement.Element
    | Release.Element
    | Bundles.Element
    | Bundle.Element
}

export default MebacoElement
