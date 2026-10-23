import { afterEach, describe, expect, it, vi } from 'vitest'
import { get } from 'svelte/store'
import type TreeNode from '@system/model/tree/tree-node'
import PreviewController from './preview/preview-controller'
import RuntimeSessionStore from './runtime-session-store'
import ResourceRuntime from './resource/resource-runtime'

const node = (id: number, element: TreeNode.Node['element'], children: TreeNode.Node[] = []): TreeNode.Node => ({
  id, element, children, isOpen: true,
})
const project = () => node(1, { kind: 'project', projectId: 'project' }, [
  node(2, { kind: 'app', appId: 'app', id: 'App' }, [
    node(3, { kind: 'entry', componentId: 'view', propBindings: [] }),
    node(4, { kind: 'component', componentId: 'view', id: 'Main' }),
  ]),
])
const launch = (root = project(), retainExisting = true, application = true) => {
  expect(PreviewController.open({
    projectNode: root, appDefinitionId: 'app', retainExisting,
    presentation: application ? { type: 'application', title: 'App' } : undefined,
  })).toBe(true)
  return get(RuntimeSessionStore.store)!
}

afterEach(() => {
  for (const session of get(RuntimeSessionStore.sessions)) RuntimeSessionStore.close(session.id)
})

describe('Runtime session lifecycle', () => {
  it('can register a session separately from selecting its operation screen', () => {
    const first = launch()
    const id = RuntimeSessionStore.create({
      ...first,
      resourceSession: ResourceRuntime.create(first.projectNode),
    }, { activate: false })
    expect(RuntimeSessionStore.find(id)).not.toBeNull()
    expect(get(RuntimeSessionStore.store)).toBe(first)
    expect(RuntimeSessionStore.activate(id)).toBe(true)
    expect(get(RuntimeSessionStore.store)?.id).toBe(id)
  })
  it('retains independent sessions and resources across activation and leaving the screen', () => {
    const first = launch()
    const dispose = vi.spyOn(first.resourceSession, 'dispose')
    const second = launch()
    expect(first.id).not.toBe(second.id)
    expect(first.resourceSession).not.toBe(second.resourceSession)
    expect(first.storageSession).not.toBe(second.storageSession)
    expect(first.logSession).not.toBe(second.logSession)
    expect(get(RuntimeSessionStore.sessions)).toEqual([first, second])
    expect(RuntimeSessionStore.activate(first.id)).toBe(true)
    expect(get(RuntimeSessionStore.store)).toBe(first)
    RuntimeSessionStore.deactivate()
    expect(get(RuntimeSessionStore.store)).toBeNull()
    expect(get(RuntimeSessionStore.sessions)).toEqual([first, second])
    expect(dispose).not.toHaveBeenCalled()
    expect(RuntimeSessionStore.activate(second.id)).toBe(true)
    expect(get(RuntimeSessionStore.store)).toBe(second)
    expect(RuntimeSessionStore.activate('missing')).toBe(false)
    expect(get(RuntimeSessionStore.store)).toBe(second)
  })

  it('transitions only the source session, even when another session uses the same project', () => {
    const root = project()
    const first = launch(root)
    const second = launch(root)
    const dispose = vi.spyOn(first.resourceSession, 'dispose')
    expect(PreviewController.transition(root, 'app', { value: 42 }, first.id)).toBe(true)
    const updated = RuntimeSessionStore.find(first.id)!
    expect(updated.id).toBe(first.id)
    expect(updated.launchValues).toEqual({ value: 42 })
    expect(updated.resourceSession).toBe(first.resourceSession)
    expect(updated.storageSession).toBe(first.storageSession)
    expect(dispose).not.toHaveBeenCalled()
    expect(RuntimeSessionStore.find(second.id)).toBe(second)
    expect(get(RuntimeSessionStore.store)).toBe(second)
    PreviewController.close(first.id)
    expect(dispose).toHaveBeenCalledOnce()
    expect(get(RuntimeSessionStore.store)).toBe(second)
    expect(PreviewController.transition(root, 'app', {}, first.id)).toBe(false)
    expect(RuntimeSessionStore.find(second.id)).toBe(second)
    PreviewController.close(first.id)
    expect(dispose).toHaveBeenCalledOnce()
  })

  it('closes only the selected target and leaves remaining sessions available', () => {
    const first = launch()
    const second = launch()
    const firstDispose = vi.spyOn(first.resourceSession, 'dispose')
    const secondDispose = vi.spyOn(second.resourceSession, 'dispose')
    PreviewController.close()
    expect(secondDispose).toHaveBeenCalledOnce()
    expect(firstDispose).not.toHaveBeenCalled()
    expect(get(RuntimeSessionStore.store)).toBeNull()
    expect(RuntimeSessionStore.activate(first.id)).toBe(true)
    expect(get(RuntimeSessionStore.store)).toBe(first)
  })

  it('keeps legacy launch replacement and close behavior', () => {
    const first = launch(project(), false)
    const dispose = vi.spyOn(first.resourceSession, 'dispose')
    const next = launch(project(), false)
    expect(next.id).not.toBe(first.id)
    expect(dispose).toHaveBeenCalledOnce()
    expect(get(RuntimeSessionStore.sessions)).toEqual([next])
    PreviewController.close()
    expect(get(RuntimeSessionStore.store)).toBeNull()
    expect(get(RuntimeSessionStore.sessions)).toEqual([])
  })

  it('keeps only one development preview alongside retained application sessions', () => {
    const app = launch()
    const first = launch(project(), true, false)
    const dispose = vi.spyOn(first.resourceSession, 'dispose')
    const next = launch(project(), true, false)
    expect(next.kind).toBe('preview')
    expect(app.kind).toBe('application')
    expect(dispose).toHaveBeenCalledOnce()
    expect(get(RuntimeSessionStore.sessions)).toEqual([app, next])
  })
})
