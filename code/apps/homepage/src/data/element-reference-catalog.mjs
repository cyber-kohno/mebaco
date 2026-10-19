const studio = (path) => `apps/studio/src/system/${path}`;
const reference = (kind, title, sources) => ({
  kind, title, page: `/reference/elements/${kind}/`,
  reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
  sources: sources.map(studio),
});

// source-reviewed is not a release guarantee or a desktop end-to-end test result.
export const elementReferences = [
  reference('declares', 'Declares', [
    'model/declaration/declares.ts', 'project/project-tree-factory.ts',
    'workspace/element-definition/declaration/declares-element-definition.ts',
    'workspace/element-definition/app/app-element-definition.ts',
    'workspace/element-definition/component/component-element-definition.ts',
  ]),
  reference('constants', 'Constants', [
    'model/declaration/constants.ts', 'model/declaration/constant-scope.ts',
    'workspace/element-definition/declaration/constants-element-definition.ts',
    'project/project-tree-factory.ts', 'workspace/element-definition/app/app-element-definition.ts',
  ]),
  reference('types', 'Types', [
    'model/declaration/types.ts', 'workspace/element-definition/declaration/types-element-definition.ts',
    'model/type-system/type-catalog.ts', 'project/project-tree-factory.ts',
    'workspace/element-definition/app/app-element-definition.ts',
  ]),
  reference('functions', 'Functions', [
    'model/declaration/functions.ts', 'workspace/element-definition/declaration/functions-element-definition.ts',
    'workspace/tree/context-menu/function-actions.ts', 'project/project-tree-factory.ts',
    'workspace/element-definition/app/app-element-definition.ts',
  ]),
  reference('components', 'Components', [
    'model/declaration/components.ts', 'workspace/element-definition/declaration/components-element-definition.ts',
    'workspace/element-definition/component/component-element-definition.ts',
    'project/project-tree-factory.ts', 'workspace/element-definition/app/app-element-definition.ts',
  ]),
  reference('elements', 'Elements', [
    'model/component/elements.ts', 'workspace/element-definition/component/elements-element-definition.ts',
    'workspace/tree/context-menu/content-actions.ts',
    'workspace/element-definition/component/component-element-definition.ts',
    'runtime/render/ElementDispatcher.svelte',
  ]),
  reference('store', 'Store', [
    'model/variable/store.ts', 'workspace/element-definition/variable/store/store-element-definition.ts',
    'workspace/element-definition/app/app-element-definition.ts',
    'workspace/element-definition/component/component-element-definition.ts',
  ]),
  reference('states', 'States', [
    'model/variable/states.ts', 'model/variable/state-scope.ts',
    'workspace/element-definition/variable/store/states-element-definition.ts',
    'workspace/element-definition/variable/store/state-element-definition.ts',
    'runtime/runtime-state.ts',
  ]),
  reference('effects', 'Effects', [
    'model/variable/effects.ts', 'workspace/element-definition/variable/store/effects-element-definition.ts',
    'workspace/element-definition/variable/store/effect-element-definition.ts',
    'runtime/effect/EffectRunner.svelte',
  ]),
  reference('transition', 'Transition', [
    'model/variable/transition.ts', 'workspace/element-definition/variable/transition-element-definition.ts',
    'runtime/transition/transition-executor.ts', 'model/app/import/transition-import-catalog.ts',
    'model/project/launcher.ts',
  ]),
  reference('imports', 'Import', [
    'model/app/import/imports.ts', 'workspace/element-definition/app/import/imports-element-definition.ts',
    'model/app/import/transitions.ts', 'model/app/import/resource-imports.ts',
    'model/app/import/storage-imports.ts', 'workspace/element-definition/app/app-element-definition.ts',
  ]),
  reference('transitions', 'Transitions', [
    'model/app/import/transitions.ts', 'model/app/import/transition-import-catalog.ts',
    'workspace/element-definition/app/import/transitions-element-definition.ts',
    'workspace/element-definition/app/import/imports-element-definition.ts',
    'runtime/transition/transition-executor.ts',
  ]),
  reference('project', 'Project', [
    'model/project/project.ts', 'project/project-tree-factory.ts',
    'project/project-session-store.ts', 'project/project-file.ts',
    'workspace/element-definition/project/project-element-definition.ts',
  ]),
  reference('apps', 'Apps', [
    'model/project/apps.ts', 'project/project-tree-factory.ts',
    'workspace/element-definition/project/apps-element-definition.ts',
    'workspace/element-definition/app/app-element-definition.ts',
  ]),
  reference('launchers', 'Launchers', [
    'model/project/launchers.ts', 'project/project-tree-factory.ts',
    'workspace/element-definition/project/launchers-element-definition.ts',
    'workspace/element-definition/project/launcher-element-definition.ts',
  ]),
  reference('launcher', 'Launcher', [
    'model/project/launcher.ts', 'model/app/launch-argument-value-prop.ts',
    'workspace/element-definition/project/launcher-element-definition.ts',
    'model/component/component-reference.ts', 'project/release/release-bundle.ts',
    'runtime/preview/preview-controller.ts',
  ]),
  reference('launch-options', 'Launch Options', [
    'model/app/launch-options.ts', 'model/app/launch-arguments.ts',
    'workspace/element-definition/app/launch-options-element-definition.ts',
    'workspace/element-definition/app/launch-arguments-element-definition.ts',
  ]),
  reference('launch-arguments', 'Launch Arguments', [
    'model/app/launch-arguments.ts', 'model/app/launch-argument.ts',
    'workspace/element-definition/app/launch-arguments-element-definition.ts',
    'workspace/element-definition/app/launch-argument-element-definition.ts',
    'model/project/launcher.ts',
  ]),
  reference('launch-argument', 'Launch Argument', [
    'model/app/launch-argument.ts', 'model/app/launch-argument-value-prop.ts',
    'workspace/element-definition/app/launch-argument-element-definition.ts',
    'workspace/element-definition/schema/typed-default-value-schema.ts',
    'model/project/launcher.ts', 'model/component/component-reference.ts',
  ]),
  reference('common', 'Common', [
    'model/project/common.ts', 'project/project-tree-factory.ts',
    'workspace/element-definition/project/common-element-definition.ts',
    'model/declaration/declares.ts', 'model/resource/resources.ts',
    'model/storage/storage.ts', 'project/release/release-package.ts',
  ]),
  {
    kind: 'app', title: 'App', page: '/reference/elements/app/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/app/app.ts', 'model/app/app-id.ts',
      'workspace/element-definition/app/app-element-definition.ts',
      'workspace/element-definition/project/apps-element-definition.ts',
      'workspace/element-editor/schema/element-edit-schema.ts',
      'runtime/runtime-tree.ts', 'runtime/view/RuntimeView.svelte',
      'terminal/provider/app-provider.ts', 'terminal/catalog/run-catalog.ts',
    ].map(studio),
  },
  {
    kind: 'entry', title: 'Entry', page: '/reference/elements/entry/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/app/entry.ts', 'model/component/component-reference.ts',
      'workspace/element-definition/app/entry-element-definition.ts',
      'workspace/element-editor/component/ComponentBindingsEditor.svelte',
      'runtime/runtime-tree.ts', 'runtime/runtime-props.ts',
      'runtime/view/RuntimeView.svelte',
    ].map(studio),
  },
  {
    kind: 'component', title: 'Component', page: '/reference/elements/component/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/component/component.ts',
      'workspace/element-definition/component/component-element-definition.ts',
      'workspace/element-definition/declaration/components-element-definition.ts',
      'workspace/element-editor/schema/element-edit-schema.ts',
      'model/element/content-host.ts', 'runtime/runtime-state.ts',
      'runtime/render/RenderComponentUse.svelte', 'runtime/render/RenderComponentContent.svelte',
      'runtime/partial/runtime-partial-key.ts', 'runtime/partial/runtime-partial-registry.ts',
      'workspace/tree/transfer/tree-transfer-catalog.ts',
    ].map(studio),
  },
  {
    kind: 'state', title: 'State', page: '/reference/elements/state/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/variable/state.ts', 'model/variable/state-scope.ts',
      'model/code-analysis/code-member-identifier.ts',
      'workspace/element-editor/schema/element-edit-schema.ts',
      'workspace/element-definition/variable/store/state-element-definition.ts',
      'workspace/element-definition/variable/store/states-element-definition.ts',
      'workspace/element-editor/type-system/ValueTypeEditor.svelte',
      'ui/input/ValueSourceField.svelte', 'runtime/runtime-state.ts',
      'runtime/runtime-state.test.ts', 'runtime/state/state-view.ts',
      'runtime/retention/retention-resolver.ts',
    ].map(studio),
  },
  {
    kind: 'tag', title: 'Tag', page: '/reference/elements/tag/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/view/tag.ts', 'model/element/html-tag.ts', 'model/element/content-placement.ts',
      'model/view/tag-attribute-catalog.ts', 'model/view/tag-event-catalog.ts',
      'workspace/element-definition/view/tag-element-definition.ts',
      'workspace/element-editor/view/TagAttributesEditor.svelte',
      'runtime/render/RenderTag.svelte', 'runtime/ref/runtime-ref-key.ts',
      'runtime/render/ElementDispatcher.svelte',
      'runtime/ref/runtime-ref-registry.ts', 'runtime/partial/runtime-partial-key.ts',
      'runtime/partial/runtime-partial-registry.ts',
    ].map(studio),
  },
  {
    kind: 'text', title: 'Text', page: '/reference/elements/text/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/view/text.ts', 'model/element/content-placement.ts',
      'workspace/element-definition/view/text-element-definition.ts',
      'workspace/element-editor/view/TextSourceEditor.svelte',
      'ui/formula/CompactFormulaField.svelte', 'runtime/render/RenderText.svelte',
      'runtime/render/RenderContent.svelte', 'runtime/retention/retention-resolver.ts',
      'runtime/render/ElementDispatcher.svelte',
    ].map(studio),
  },
  reference('props', 'Props', [
    'model/component/props.ts', 'workspace/element-definition/component/props-element-definition.ts',
    'workspace/element-definition/component/component-element-definition.ts',
    'workspace/element-definition/component/slot-element-definition.ts', 'runtime/runtime-props.ts',
  ]),
  reference('value-prop', 'Value Prop', [
    'model/component/value-prop.ts', 'model/component/component-reference.ts',
    'workspace/element-definition/component/value-prop-element-definition.ts',
    'workspace/element-definition/schema/typed-default-value-schema.ts',
    'workspace/element-editor/component/ComponentBindingsEditor.svelte',
    'model/code-analysis/code-member-identifier.ts', 'runtime/runtime-props.ts',
    'runtime/runtime-props.test.ts',
  ]),
  reference('component-use', 'Component Use', [
    'model/component/component-use.ts',
    'workspace/element-definition/component/component-use-element-definition.ts',
    'workspace/tree/context-menu/content-actions.ts', 'workspace/tree/tree-store.ts',
    'runtime/render/RenderComponentUse.svelte', 'runtime/runtime-props.ts',
    'runtime/runtime-state.ts', 'runtime/render/RenderSlotUse.svelte',
  ]),
  reference('slots', 'Slots', [
    'model/component/slots.ts', 'workspace/element-definition/component/slots-element-definition.ts',
    'workspace/element-definition/component/component-element-definition.ts', 'model/component/component-use.ts',
  ]),
  reference('slot', 'Slot', [
    'model/component/slot.ts', 'workspace/element-definition/component/slot-element-definition.ts',
    'model/component/slot-use.ts', 'model/code-analysis/code-member-identifier.ts',
    'model/component/component-use.ts', 'runtime/render/RenderSlotUse.svelte',
  ]),
  reference('slot-use', 'Slot Use', [
    'model/component/slot-use.ts', 'workspace/element-definition/component/slot-use-element-definition.ts',
    'workspace/tree/context-menu/content-actions.ts', 'runtime/render/RenderSlotUse.svelte',
    'runtime/runtime-props.ts', 'runtime/render/ElementDispatcher.svelte', 'runtime/render/RenderTag.svelte',
  ]),
  reference('slot-contents', 'Slot Contents', [
    'model/component/slot-contents.ts', 'workspace/element-definition/component/slot-contents-element-definition.ts',
    'model/component/component-use.ts', 'runtime/render/RenderComponentUse.svelte',
  ]),
  reference('slot-content', 'Slot Content', [
    'model/component/slot-content.ts', 'workspace/element-definition/component/slot-content-element-definition.ts',
    'model/component/component-use.ts', 'model/element/content-host.ts',
    'runtime/render/RenderComponentUse.svelte', 'runtime/render/RenderSlotUse.svelte',
  ]),
  reference('retention', 'Retention', [
    'model/component/retention.ts', 'model/element/content-host.ts',
    'workspace/element-definition/component/retention-element-definition.ts',
    'workspace/tree/context-menu/retention-actions.ts',
    'workspace/element-definition/variable/variable-element-definition.ts',
    'runtime/retention/retention-resolver.ts', 'runtime/retention/retention-resolver.test.ts',
    'runtime/variable/variable-frame.ts', 'runtime/render/RenderContent.svelte',
    'model/component/component-use.ts',
  ]),
  reference('object-type', 'Object Type', [
    'model/type-system/object/object-type.ts', 'model/type-system/object/object-shape.ts',
    'model/type-system/object/object-inheritance.ts', 'model/type-system/type-expression.ts',
    'workspace/element-definition/type-system/object/object-type-element-definition.ts',
    'model/type-system/type-catalog.ts', 'model/type-system/type-default-expression.ts',
  ]),
  reference('union-type', 'Union Type', [
    'model/type-system/union/union-type.ts', 'model/type-system/union/union-definition.ts',
    'model/type-system/literal-union.ts',
    'workspace/element-definition/type-system/union/union-type-element-definition.ts',
    'model/type-system/type-catalog.ts', 'runtime/type-value.ts',
  ]),
  reference('signature-type', 'Signature Type', [
    'model/type-system/signature/signature-type.ts',
    'model/type-system/signature/signature-definition.ts',
    'workspace/element-definition/type-system/signature/signature-type-element-definition.ts',
    'workspace/element-definition/function/function-element-definition.ts',
    'model/type-system/type-catalog.ts', 'runtime/function/function-runner.ts',
  ]),
  reference('variable', 'Variable', [
    'model/variable/variable.ts', 'workspace/element-definition/variable/variable-element-definition.ts',
    'model/variable/sequential-variable-scope.ts', 'runtime/variable/variable-frame.ts',
    'runtime/retention/retention-resolver.ts', 'runtime/function/function-runner.ts',
  ]),
  reference('constant', 'Constant', [
    'model/declaration/constant.ts', 'model/declaration/constant-scope.ts',
    'workspace/element-definition/declaration/constant-element-definition.ts',
    'workspace/element-definition/declaration/constants-element-definition.ts',
    'runtime/runtime-constant.ts', 'model/code-analysis/mebaco-injection-source.ts',
  ]),
  reference('function', 'Function', [
    'model/function/function-definition.ts', 'model/function/function-scope.ts',
    'workspace/element-definition/function/function-element-definition.ts',
    'workspace/element-definition/function/function-procedure-element-definition.ts',
    'runtime/function/function-runner.ts', 'runtime/function/function-code-evaluator.ts',
    'runtime/script/script-policy.ts', 'model/type-system/signature/signature-definition.ts',
  ]),
  reference('action', 'Action', [
    'model/variable/action.ts', 'workspace/element-definition/variable/action-element-definition.ts',
    'runtime/action/action-evaluator.ts', 'runtime/script/script-policy.ts',
    'runtime/render/RenderTag.svelte', 'runtime/retention/retention-resolver.ts',
    'runtime/function/function-runner.ts',
  ]),
  reference('effect', 'Effect', [
    'model/variable/effect.ts', 'workspace/element-definition/variable/store/effect-element-definition.ts',
    'runtime/effect/EffectRunner.svelte', 'runtime/effect/effect-dependency-change.ts',
    'runtime/effect/effect-runtime-guard.ts', 'runtime/runtime-state-dependency.ts',
    'runtime/state/state-view.ts',
  ]),
  reference('conditional', 'Conditional', [
    'model/directive/conditional.ts', 'workspace/element-definition/directive/conditional-element-definition.ts',
    'runtime/conditional/conditional-resolver.ts', 'runtime/render/RenderConditional.svelte',
    'runtime/render/RenderContent.svelte', 'model/element/content-host.ts',
  ]),
  reference('control-conditional', 'Procedure Conditional', [
    'model/directive/control-conditional.ts', 'workspace/element-definition/directive/control-conditional-element-definition.ts',
    'workspace/tree/context-menu/function-actions.ts', 'runtime/function/function-runner.ts',
    'runtime/conditional/conditional-resolver.ts', 'model/function/function-scope.ts',
  ]),
  reference('if', 'If', [
    'model/directive/if.ts', 'workspace/element-definition/directive/if-element-definition.ts',
    'runtime/conditional/conditional-resolver.ts', 'runtime/render/RenderConditional.svelte',
    'runtime/function/function-runner.ts',
  ]),
  reference('else-if', 'Else If', [
    'model/directive/else-if.ts', 'workspace/element-definition/directive/else-if-element-definition.ts',
    'runtime/conditional/conditional-resolver.ts', 'workspace/element-definition/directive/conditional-element-definition.ts',
    'workspace/element-definition/directive/control-conditional-element-definition.ts',
  ]),
  reference('else', 'Else', [
    'model/directive/else.ts', 'workspace/element-definition/directive/else-element-definition.ts',
    'runtime/conditional/conditional-resolver.ts', 'workspace/element-definition/directive/conditional-element-definition.ts',
    'workspace/element-definition/directive/control-conditional-element-definition.ts',
  ]),
  reference('switch', 'Switch', [
    'model/directive/switch.ts', 'model/directive/switch-value-type.ts',
    'workspace/element-definition/directive/switch-element-definition.ts',
    'runtime/switch/switch-resolver.ts', 'runtime/render/RenderSwitch.svelte',
  ]),
  reference('control-switch', 'Procedure Switch', [
    'model/directive/control-switch.ts', 'workspace/element-definition/directive/control-switch-element-definition.ts',
    'workspace/tree/context-menu/function-actions.ts', 'runtime/function/function-runner.ts',
    'runtime/switch/switch-resolver.ts', 'model/type-system/union/union-definition.ts',
  ]),
  reference('case', 'Case', [
    'model/directive/case.ts', 'workspace/element-definition/directive/case-element-definition.ts',
    'runtime/switch/switch-resolver.ts', 'workspace/element-definition/directive/switch-element-definition.ts',
  ]),
  reference('default', 'Default', [
    'model/directive/default.ts', 'workspace/element-definition/directive/default-element-definition.ts',
    'runtime/switch/switch-resolver.ts', 'workspace/element-definition/directive/switch-element-definition.ts',
  ]),
  reference('loop', 'Loop', [
    'model/directive/loop.ts', 'workspace/element-definition/directive/loop-element-definition.ts',
    'runtime/loop/loop-resolver.ts', 'runtime/render/RenderLoop.svelte',
    'runtime/render/RenderLoopIteration.svelte', 'workspace/tree/context-menu/content-actions.ts',
  ]),
  reference('promise', 'Promise', [
    'model/promise/promise.ts', 'workspace/element-definition/promise/promise-element-definition.ts',
    'runtime/function/function-runner.ts', 'runtime/script/script-policy.ts',
    'model/function/function-scope.ts', 'model/type-system/value-type-definition.ts',
  ]),
  reference('promise-then', 'Promise Then', [
    'model/promise/promise-then.ts', 'workspace/element-definition/promise/promise-then-element-definition.ts',
    'runtime/function/function-runner.ts', 'model/function/function-scope.ts',
    'workspace/tree/context-menu/function-actions.ts',
  ]),
  reference('promise-catch', 'Promise Catch', [
    'model/promise/promise-catch.ts', 'workspace/element-definition/promise/promise-catch-element-definition.ts',
    'runtime/function/function-runner.ts', 'model/function/function-scope.ts',
    'workspace/tree/context-menu/function-actions.ts',
  ]),
  reference('function-procedure', 'Function Procedure', [
    'model/function/function-procedure.ts', 'workspace/element-definition/function/function-procedure-element-definition.ts',
    'workspace/tree/context-menu/function-actions.ts', 'runtime/function/function-runner.ts',
    'model/function/function-scope.ts',
  ]),
  reference('function-return', 'Function Return', [
    'model/function/function-return.ts', 'workspace/element-definition/function/function-return-element-definition.ts',
    'workspace/tree/context-menu/function-actions.ts', 'runtime/function/function-runner.ts',
    'model/function/function-definition.ts', 'model/function/function-scope.ts',
  ]),
  reference('block', 'Block', [
    'model/block/block.ts', 'workspace/tree/context-menu/function-actions.ts',
    'runtime/function/function-runner.ts', 'runtime/retention/retention-resolver.ts',
    'model/function/function-scope.ts',
  ]),
  reference('resources', 'Resources', [
    'model/resource/resources.ts', 'workspace/element-definition/resource/resources-element-definition.ts',
    'model/resource/resource-definition.ts', 'model/app/import/resource-import-catalog.ts',
    'runtime/resource/resource-runtime.ts', 'project/project-tree-factory.ts',
  ]),
  {
    kind: 'directory-resource', title: 'Directory Resource', page: '/reference/elements/directory-resource/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/resource/directory-resource.ts', 'model/resource/resource-definition.ts',
      'workspace/element-definition/resource/directory-resource-element-definition.ts',
      'runtime/resource/resource-runtime.ts', 'apps/studio/src-tauri/src/resource.rs',
    ].map((path) => path.startsWith('apps/') ? path : studio(path)),
  },
  {
    kind: 'text-resource', title: 'Text Resource', page: '/reference/elements/text-resource/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/resource/text-resource.ts', 'model/resource/resource-definition.ts',
      'workspace/element-definition/resource/text-resource-element-definition.ts',
      'runtime/resource/resource-runtime.ts', 'apps/studio/src-tauri/src/resource.rs',
    ].map((path) => path.startsWith('apps/') ? path : studio(path)),
  },
  {
    kind: 'sqlite-resource', title: 'SQLite Resource', page: '/reference/elements/sqlite-resource/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/resource/sqlite-resource.ts', 'model/resource/resource-definition.ts',
      'workspace/element-definition/resource/sqlite-resource-element-definition.ts',
      'runtime/resource/resource-runtime.ts', 'apps/studio/src-tauri/src/resource.rs',
    ].map((path) => path.startsWith('apps/') ? path : studio(path)),
  },
  reference('resource-imports', 'Resource Imports', [
    'model/app/import/resource-imports.ts', 'model/app/import/resource-import-catalog.ts',
    'workspace/element-definition/app/import/resource-imports-element-definition.ts',
    'runtime/view/RuntimeView.svelte', 'runtime/resource/resource-runtime.ts',
  ]),
  {
    kind: 'storage', title: 'Storage', page: '/reference/elements/storage/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/storage/storage.ts', 'workspace/element-definition/storage/storage-element-definition.ts',
      'model/storage/storage-type-catalog.ts', 'runtime/storage/storage-runtime.ts',
      'apps/studio/src-tauri/src/storage.rs', 'runtime/preview/preview-controller.ts',
    ].map((path) => path.startsWith('apps/') ? path : studio(path)),
  },
  {
    kind: 'key-value', title: 'Key Value', page: '/reference/elements/key-value/',
    reviewedAt: '2026-10-02', status: 'source-reviewed', introducedVersion: null,
    sources: [
      'model/storage/storage-item.ts', 'workspace/element-definition/storage/storage-item-element-definition.ts',
      'workspace/element-definition/variable/store/state-element-definition.ts',
      'model/storage/storage-type-catalog.ts', 'runtime/storage/storage-runtime.ts',
      'runtime/runtime-state.ts', 'apps/studio/src-tauri/src/storage.rs',
    ].map((path) => path.startsWith('apps/') ? path : studio(path)),
  },
  reference('storage-imports', 'Storage Imports', [
    'model/app/import/storage-imports.ts', 'model/app/import/storage-import-catalog.ts',
    'workspace/element-definition/app/import/storage-imports-element-definition.ts',
    'runtime/storage/storage-runtime.ts', 'runtime/view/RuntimeView.svelte',
  ]),
  reference('styles', 'Styles', [
    'model/declaration/styles.ts', 'workspace/element-definition/declaration/styles-element-definition.ts',
    'project/project-tree-factory.ts', 'workspace/element-definition/view/style/style-element-definition.ts',
  ]),
  reference('style', 'Style', [
    'model/view/style/style.ts', 'workspace/element-definition/view/style/style-element-definition.ts',
    'workspace/element-definition/view/tag-element-definition.ts',
    'model/view/style/style-parameter-catalog.ts', 'model/view/style/style-argument-contract.ts',
    'runtime/style/style-declaration-resolver.ts', 'runtime/render/RenderTag.svelte',
  ]),
  reference('style-params', 'Style Parameters', [
    'model/view/style/style-params.ts', 'workspace/element-definition/view/style/style-params-element-definition.ts',
    'workspace/element-definition/view/style/style-element-definition.ts',
  ]),
  reference('style-param', 'Style Parameter', [
    'model/view/style/style-param.ts', 'workspace/element-definition/view/style/style-param-element-definition.ts',
    'model/view/style/style-parameter-value.ts', 'model/view/style/style-parameter-catalog.ts',
    'workspace/element-definition/view/style/style-parameter-deletion.ts',
  ]),
  reference('style-locals', 'Style Locals', [
    'model/view/style/style-locals.ts', 'workspace/element-definition/view/style/style-locals-element-definition.ts',
    'model/view/style/style-local-scope.ts', 'runtime/style/style-declaration-resolver.ts',
  ]),
  reference('style-keyframes', 'Style Keyframes', [
    'model/view/style/style-keyframes.ts', 'workspace/element-definition/view/style/style-keyframes-element-definition.ts',
    'workspace/element-definition/view/style/style-element-definition.ts',
    'runtime/style/style-declaration-resolver.ts',
  ]),
  reference('debug', 'Debug', [
    'model/debug/debug.ts', 'workspace/element-definition/debug/debug-element-definition.ts',
    'project/project-tree-factory.ts', 'runtime/preview/preview-controller.ts',
  ]),
  reference('debug-configurations', 'Debug Configurations', [
    'model/debug/debug-configurations.ts', 'workspace/element-definition/debug/debug-configurations-element-definition.ts',
    'model/debug/debug-configuration.ts', 'runtime/resource/resource-runtime.ts',
  ]),
  reference('debug-configuration', 'Debug Configuration', [
    'model/debug/debug-configuration.ts', 'workspace/element-definition/debug/debug-configuration-element-definition.ts',
    'model/debug/debug-resource-bindings.ts', 'runtime/resource/resource-runtime.ts',
  ]),
  reference('debug-resource-bindings', 'Debug Resource Bindings', [
    'model/debug/debug-resource-bindings.ts', 'workspace/element-definition/debug/debug-resource-bindings-element-definition.ts',
    'model/debug/debug-resource-binding-sync.ts', 'runtime/resource/resource-runtime.ts',
  ]),
  reference('debug-launch-shortcuts', 'Debug Launch Shortcuts', [
    'model/debug/debug-launch-shortcuts.ts', 'workspace/element-definition/debug/debug-launch-shortcuts-element-definition.ts',
    'model/debug/debug-launch-shortcut-sync.ts', 'model/project/launcher.ts',
  ]),
  reference('debug-log', 'Debug Log', [
    'model/debug/debug-log.ts', 'workspace/element-definition/debug/debug-log-element-definition.ts',
    'runtime/log/runtime-log.ts', 'runtime/formula/formula-context.ts',
  ]),
  reference('release', 'Release', [
    'model/release/release.ts', 'workspace/element-definition/release/release-element-definition.ts',
    'project/project-tree-factory.ts', 'project/release/release-package.ts',
  ]),
  reference('bundles', 'Bundles', [
    'model/release/bundles.ts', 'workspace/element-definition/release/bundles-element-definition.ts',
    'workspace/element-definition/release/bundle-element-definition.ts', 'terminal/catalog/build-catalog.ts',
  ]),
  reference('bundle', 'Bundle', [
    'model/release/bundle.ts', 'workspace/element-definition/release/bundle-element-definition.ts',
    'project/release/release-bundle.ts', 'project/release/release-package.ts',
    'terminal/catalog/build-catalog.ts', 'terminal/catalog/release-catalog.ts',
    'client/client-package.ts', 'client/client-package-controller.ts',
  ]),
];

export const getElementReference = (kind) => elementReferences.find((entry) => entry.kind === kind);

export const requiredReferenceSections = [
  '概要', '配置場所と操作', '子要素', '設定項目', '参照とスコープ',
  '実行時の動作', '最小例', '制約と注意点', '関連項目', '実装照合・バージョン',
];
