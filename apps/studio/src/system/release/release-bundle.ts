import type TreeNode from '../tree/tree-node'
import type LauncherElement from '../element/kind/project/launcher-element'
import type AppElement from '../element/kind/app/app-element'
import ResourceImportCatalog from '../element/kind/app/import/resource-import-catalog'
import TransitionImportCatalog from '../element/kind/app/import/transition-import-catalog'
import RuntimeTree from '../runtime/runtime-tree'
import ComponentReference from '../element/kind/component/shared/component-reference'
import LaunchArgumentValueProp from '../element/kind/app/launch/launch-argument-value-prop'
import type ValuePropElement from '../element/kind/component/definition/value-prop-element'

namespace ReleaseBundle {
  export type LauncherNode = TreeNode.Node & { element: LauncherElement.Element }
  export type AppNode = TreeNode.Node & { element: AppElement.Element }
  export type ResourceNode = ResourceImportCatalog.ResourceNode

  export type Analysis = {
    launchers: readonly LauncherNode[]
    apps: readonly AppNode[]
    resources: readonly ResourceNode[]
    errors: readonly string[]
  }

  const collectNodes = (rootNode: TreeNode.Node): TreeNode.Node[] => {
    const result: TreeNode.Node[] = []
    const visit = (node: TreeNode.Node) => {
      result.push(node)
      node.children.forEach(visit)
    }
    visit(rootNode)
    return result
  }

  const getLaunchProps = (appNode: TreeNode.Node): ValuePropElement.Element[] => (
    appNode.children.find((child) => child.element.kind === 'launch-options')
      ?.children.find((child) => child.element.kind === 'launch-arguments')
      ?.children.flatMap((child) => (
        child.element.kind === 'launch-argument'
          ? [LaunchArgumentValueProp.convert(child.element)]
          : []
      )) ?? []
  )

  const getComponentProps = (componentNode: TreeNode.Node): ValuePropElement.Element[] => (
    componentNode.children.find((child) => child.element.kind === 'props')
      ?.children.flatMap((child) => (
        child.element.kind === 'value-prop' ? [child.element] : []
      )) ?? []
  )

  const collectOwnedComponentUses = (componentNode: TreeNode.Node): TreeNode.Node[] => {
    const result: TreeNode.Node[] = []
    const visit = (node: TreeNode.Node) => node.children.forEach((child) => {
      if (child.element.kind === 'component') return
      if (child.element.kind === 'component-use') result.push(child)
      visit(child)
    })
    visit(componentNode)
    return result
  }

  export const getResourceKindLabel = (
    resource: ResourceImportCatalog.ResourceElement,
  ): string => {
    switch (resource.kind) {
      case 'directory-resource': return 'Directory'
      case 'text-resource': return 'Text file'
      case 'sqlite-resource': return 'SQLite'
    }
  }

  export const analyze = (
    rootNode: TreeNode.Node,
    launcherIds: readonly string[],
  ): Analysis => {
    const nodes = collectNodes(rootNode)
    const launchersById = new Map(nodes.flatMap((node) => (
      node.element.kind === 'launcher'
        ? [[node.element.launcherId, node as LauncherNode] as const]
        : []
    )))
    const appsById = new Map(nodes.flatMap((node) => (
      node.element.kind === 'app'
        ? [[node.element.appId, node as AppNode] as const]
        : []
    )))
    const resourcesById = new Map(ResourceImportCatalog.collectResources(rootNode)
      .map((node) => [node.element.resourceId, node] as const))
    const errors: string[] = []
    const launchers: LauncherNode[] = []
    const apps: AppNode[] = []
    const resources: ResourceNode[] = []
    const visitedApps = new Set<string>()
    const visitedResources = new Set<string>()

    if (launcherIds.length === 0) errors.push('Bundle must contain at least one Launcher.')

    const visitApp = (appId: string, source: string) => {
      if (visitedApps.has(appId)) return
      visitedApps.add(appId)
      const appNode = appsById.get(appId)
      if (appNode == null) {
        errors.push(`${source} references a missing App (${appId}).`)
        return
      }
      apps.push(appNode)

      const configurationError = RuntimeTree.getEntryConfigurationError(
        RuntimeTree.createAppRuntime(appNode, rootNode),
      )
      if (configurationError != null) {
        errors.push(`App '${appNode.element.id}': ${configurationError}`)
      }

      ResourceImportCatalog.getResourceIds(appNode).forEach((resourceId) => {
        if (visitedResources.has(resourceId)) return
        visitedResources.add(resourceId)
        const resourceNode = resourcesById.get(resourceId)
        if (resourceNode == null) {
          errors.push(`App '${appNode.element.id}' imports a missing Resource (${resourceId}).`)
          return
        }
        resources.push(resourceNode)
      })

      TransitionImportCatalog.getTransitionIds(appNode).forEach((targetAppId) => {
        visitApp(targetAppId, `App '${appNode.element.id}'`)
      })
    }

    const seenLaunchers = new Set<string>()
    launcherIds.forEach((launcherId) => {
      if (seenLaunchers.has(launcherId)) return
      seenLaunchers.add(launcherId)
      const launcherNode = launchersById.get(launcherId)
      if (launcherNode == null) {
        errors.push(`Bundle references a missing Launcher (${launcherId}).`)
        return
      }
      launchers.push(launcherNode)
      if (launcherNode.element.appId == null) {
        errors.push(`Launcher '${launcherNode.element.id}' does not specify an App.`)
        return
      }
      visitApp(launcherNode.element.appId, `Launcher '${launcherNode.element.id}'`)

      const appNode = appsById.get(launcherNode.element.appId)
      if (appNode != null) {
        const bindingError = ComponentReference.validateBindings(
          ComponentReference.stringifyBindings(launcherNode.element.argumentBindings),
          {
            componentId: appNode.element.appId,
            label: appNode.element.id,
            props: getLaunchProps(appNode),
          },
        )
        if (bindingError != null) {
          errors.push(`Launcher '${launcherNode.element.id}': ${bindingError}`)
        }
      }
    })

    const commonNode = rootNode.children.find((node) => node.element.kind === 'common')
    apps.forEach((appNode) => {
      const importedAppIds = new Set(TransitionImportCatalog.getTransitionIds(appNode))
      collectNodes(appNode).forEach((transitionNode) => {
        if (transitionNode.element.kind !== 'transition') return
        const targetAppId = transitionNode.element.appId
        if (targetAppId == null) {
          errors.push(`App '${appNode.element.id}' contains an unconfigured Transition.`)
          return
        }
        if (!importedAppIds.has(targetAppId)) {
          errors.push(`App '${appNode.element.id}' uses a Transition target that is not imported (${targetAppId}).`)
          return
        }
        const targetApp = appsById.get(targetAppId)
        if (targetApp == null) return
        const bindingError = ComponentReference.validateBindings(
          ComponentReference.stringifyBindings(transitionNode.element.argumentBindings),
          {
            componentId: targetApp.element.appId,
            label: targetApp.element.id,
            props: getLaunchProps(targetApp),
          },
        )
        if (bindingError != null) {
          errors.push(`Transition from App '${appNode.element.id}' to '${targetApp.element.id}': ${bindingError}`)
        }
      })
    })

    const packagedNodes = collectNodes({
      id: -1,
      element: { kind: 'project' },
      isOpen: true,
      children: [...apps, ...(commonNode == null ? [] : [commonNode])],
    })
    const packagedComponents = packagedNodes.filter((node) => node.element.kind === 'component')
    const packagedComponentIds = new Set(packagedComponents.map((node) => (
      node.element.kind === 'component' ? node.element.componentId : ''
    )))
    const allComponentsById = new Map(nodes.flatMap((node) => (
      node.element.kind === 'component'
        ? [[node.element.componentId, node] as const]
        : []
    )))

    packagedComponents.forEach((componentNode) => {
      if (componentNode.element.kind !== 'component') return
      const componentName = componentNode.element.id
      collectOwnedComponentUses(componentNode).forEach((useNode) => {
        if (useNode.element.kind !== 'component-use') return
        if (useNode.element.componentId == null) {
          errors.push(`Component '${componentName}' contains an unconfigured Component reference.`)
          return
        }
        const target = allComponentsById.get(useNode.element.componentId)
        if (target == null || !packagedComponentIds.has(useNode.element.componentId)) {
          errors.push(`Component '${componentName}' references a Component that is not in the release package (${useNode.element.componentId}).`)
          return
        }
        const bindingError = ComponentReference.validateBindings(
          ComponentReference.stringifyBindings(useNode.element.propBindings),
          {
            componentId: useNode.element.componentId,
            label: target.element.kind === 'component' ? target.element.id : '',
            props: getComponentProps(target),
          },
        )
        if (bindingError != null) {
          errors.push(`Component '${componentName}': ${bindingError}`)
        }
      })
    })

    const reportedCycles = new Set<string>()
    const findCycle = (
      componentNode: TreeNode.Node,
      path: TreeNode.Node[],
    ) => {
      const cycleIndex = path.findIndex((node) => node.id === componentNode.id)
      if (cycleIndex >= 0) {
        const cycle = [...path.slice(cycleIndex), componentNode]
        const key = [...new Set(cycle.map((node) => node.id))].sort((a, b) => a - b).join(':')
        if (!reportedCycles.has(key)) {
          reportedCycles.add(key)
          errors.push(`Component cycle: ${cycle.map((node) => (
            node.element.kind === 'component' ? node.element.id : '?'
          )).join(' -> ')}.`)
        }
        return
      }
      collectOwnedComponentUses(componentNode).forEach((useNode) => {
        if (useNode.element.kind !== 'component-use' || useNode.element.componentId == null) return
        const target = allComponentsById.get(useNode.element.componentId)
        if (target != null && packagedComponentIds.has(useNode.element.componentId)) {
          findCycle(target, [...path, componentNode])
        }
      })
    }
    packagedComponents.forEach((componentNode) => findCycle(componentNode, []))

    return { launchers, apps, resources, errors: [...new Set(errors)] }
  }
}

export default ReleaseBundle
