export const elementCatalog = [
  { title: 'ProjectとApp', page: '/reference/project-files/', kinds: ['project', 'common', 'apps', 'app', 'entry', 'launch-options', 'launch-arguments', 'launch-argument', 'launcher', 'launchers'] },
  { title: 'Component', page: '/concepts/component/', kinds: ['components', 'component', 'component-use', 'props', 'value-prop', 'slots', 'slot', 'slot-use', 'slot-content', 'slot-contents', 'retention', 'elements'] },
  { title: 'View', page: '/guides/build-ui/', kinds: ['tag', 'text'] },
  { title: '制御構造', page: '/reference/elements/', kinds: ['conditional', 'control-conditional', 'if', 'else-if', 'else', 'loop', 'switch', 'control-switch', 'case', 'default'] },
  { title: 'Stateと振る舞い', page: '/guides/state-and-actions/', kinds: ['store', 'state', 'states', 'effects', 'effect', 'variable', 'action', 'transition', 'block', 'function', 'functions', 'function-procedure', 'function-return', 'promise', 'promise-then', 'promise-catch'] },
  { title: '宣言と型', page: '/reference/types/', kinds: ['declares', 'constants', 'constant', 'types', 'object-type', 'union-type', 'signature-type'] },
  { title: 'Style', page: '/guides/style-app/', kinds: ['styles', 'style', 'style-params', 'style-param', 'style-locals', 'style-keyframes'] },
  { title: 'ImportとCapability', page: '/reference/elements/', kinds: ['imports', 'transitions', 'resource-imports', 'storage-imports', 'resources', 'directory-resource', 'text-resource', 'sqlite-resource', 'storage', 'key-value'] },
  { title: 'Debugと配布', page: '/guides/distribute/', kinds: ['debug', 'debug-configurations', 'debug-configuration', 'debug-resource-bindings', 'debug-log', 'debug-launch-shortcuts', 'release', 'bundles', 'bundle'] },
];

export const allElementKinds = elementCatalog.flatMap((group) => group.kinds);
