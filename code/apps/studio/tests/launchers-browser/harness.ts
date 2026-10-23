import { mount } from 'svelte'
import { get } from 'svelte/store'
import '../../src/app.css'
import AppRoot from '../../src/system/AppRoot.svelte'
import TreeStore from '../../src/system/workspace/tree/state'
import ProjectSession from '../../src/system/project/project-session-store'
import { ProjectTreeFactory } from '../../src/system/project/tree-factory'
import { developScreenStore } from '../../src/system/workspace/develop-screen-store'
import { appAreaStore } from '../../src/system/application/navigation'
import ClientPackageStore from '../../src/system/client/client-package-store'
import ClientNavigation from '../../src/system/client/client-navigation-store'
import type ClientPackage from '../../src/system/client/client-package'
import PreviewController from '../../src/system/runtime/preview/preview-controller'
import RuntimeSessionStore from '../../src/system/runtime/runtime-session-store'
import type TreeNode from '../../src/system/model/tree/tree-node'
import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../../src/system/version'

let nextId = 100
const node = (element: TreeNode.Node['element'], children: TreeNode.Node[] = []): TreeNode.Node => ({
  id: nextId++, element, children, isOpen: true,
})
const fixture = () => {
  nextId = 100
  const root = ProjectTreeFactory.createRootNode()
  const app = node({ kind: 'app', appId: 'browser-app', id: 'daily-tool' }, [
    node({ kind: 'entry', componentId: 'browser-view', propBindings: [] }),
    node({ kind: 'launch-options' }, [node({ kind: 'launch-arguments' }, [
      node({ kind: 'launch-argument', propId: 'browser-arg', id: 'environment', valueType: { type: 'string' }, nullable: false }),
    ])]),
    node({ kind: 'component', componentId: 'browser-view', id: 'Main' }, [
      node({ kind: 'retention' }, [node({
        kind: 'style', styleId: 'browser-style', id: 'app-content', bases: [], rules: [
          { type: 'declaration', property: 'font-size', value: { type: 'literal', value: '16px' } },
          { type: 'declaration', property: 'padding', value: { type: 'literal', value: '24px' } },
        ],
      })]),
      node({ kind: 'elements' }, [node({
        kind: 'tag', tagName: 'div', comment: '', attributes: [],
        styles: [{ styleId: 'browser-style', referenceId: 'browser-reference', arguments: [] }],
      }, [node({ kind: 'text', source: { type: 'formula', source: '$launch.environment' } })])]),
    ]),
  ])
  const launcher = {
    kind: 'launcher' as const, launcherId: 'browser-launcher', id: 'daily', name: 'Daily tool', appId: 'browser-app',
    argumentBindings: [{ propId: 'browser-arg', kind: 'value' as const, source: { type: 'literal' as const, value: 'Current development code' } }],
  }
  root.children.find((child) => child.element.kind === 'apps')!.children.push(app)
  root.children.find((child) => child.element.kind === 'launchers')!.children.push(
    node(launcher),
    node({ kind: 'launcher', launcherId: 'browser-empty', id: 'unconfigured', appId: null, argumentBindings: [] }),
  )
  TreeStore.rootNode.set(root)
  TreeStore.selectedNodeId.set(app.id)
  ProjectSession.startNew(root)
  ProjectSession.markDirty()
  appAreaStore.set('develop')
  developScreenStore.set('workspace')

  const installed: ClientPackage.Installed = {
    installationId: 'browser-installation', sourceFileName: 'daily.mbcapp', displayName: 'Daily tools',
    installedAt: '2026-10-07T00:00:00Z', updatedAt: '2026-10-07T00:00:00Z',
    archiveBytes: new Uint8Array(), byteLength: 0, digest: 'browser', resourcePaths: {},
    manifest: {
      format: 'mebaco-app', formatVersion: 1, appVersion: APP_VERSION, schemaGen: SCHEMA_GEN, apiGen: API_GEN,
      createdAt: '2026-10-07T00:00:00Z', bundle: {
        bundleId: 'browser-bundle', id: 'daily-bundle', generation: 1, contentHash: '0'.repeat(64),
        builtAt: '2026-10-07T00:00:00Z', launcherCount: 1, appCount: 1, resourceCount: 0,
      },
    },
    module: {
      bundle: { bundleId: 'browser-bundle', id: 'daily-bundle', launcherIds: [launcher.launcherId] },
      apps: [structuredClone(app)], launchers: [{ ...launcher, argumentBindings: [
        { propId: 'browser-arg', kind: 'value', source: { type: 'literal', value: 'Installed client code' } },
      ] }], common: null, resources: [],
    },
  }
  ClientPackageStore.value.set({ packages: [installed], selectedId: installed.installationId })
  return { appNodeId: app.id }
}

mount(AppRoot, { target: document.getElementById('app')! })
Object.assign(window, { launcherHarness: {
  fixture,
  sessions: RuntimeSessionStore,
  openRetained: (title: string, color: string) => {
    const root = structuredClone(get(TreeStore.rootNode))
    const app = root.children.find((child) => child.element.kind === 'apps')!.children[0]!
    const component = app.children.find((child) => child.element.kind === 'component')!
    component.children.push(node({ kind: 'store' }, [node({ kind: 'states' }, [node({
      kind: 'state', id: 'count', valueType: { type: 'number' }, nullable: false,
      initial: { type: 'literal', value: '0' },
    })])]))
    const style = component.children.find((child) => child.element.kind === 'retention')!.children[0]!.element
    if (style.kind === 'style') style.rules.push({ type: 'declaration', property: 'color', value: { type: 'literal', value: color } })
    component.children.find((child) => child.element.kind === 'elements')!.children.push(node({
      kind: 'tag', tagName: 'button', comment: '', styles: [], attributes: [{
        type: 'event', name: 'click', preventDefault: false, stopPropagation: false,
        action: { type: 'script', source: '$state.count += 1;' },
      }],
    }, [node({ kind: 'text', source: { type: 'formula', source: '`Count: ${$state.count}`' } })]))
    PreviewController.open({
      projectNode: root, appDefinitionId: 'browser-app', launcherId: 'browser-launcher',
      presentation: { type: 'application', title }, retainExisting: true,
    })
    return get(RuntimeSessionStore.store)!.id
  },
  openClient: () => {
    appAreaStore.set('client')
    ClientNavigation.openLaunchSetup('browser-installation')
  },
  preview: () => PreviewController.open({ projectNode: get(TreeStore.rootNode), appDefinitionId: 'browser-app', launcherId: 'browser-launcher' }),
} })
