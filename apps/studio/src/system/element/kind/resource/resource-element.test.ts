import { describe, expect, it } from 'vitest'
import type TreeNode from '../../../tree/tree-node'
import DirectoryResourceElement from './directory-resource-element'
import ResourcesElement from './resources-element'
import SqliteResourceElement from './sqlite-resource-element'
import TextResourceElement from './text-resource-element'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('Resource elements', () => {
  it('uses the requested action menu labels', () => {
    const resources = node(2, ResourcesElement.create())
    const project = node(1, { kind: 'project' }, [resources])
    const items = ResourcesElement.definition.getContextMenu({
      element: resources.element as ResourcesElement.Element,
      node: resources,
      parentNode: project,
      rootNode: project,
    })

    expect(items.map((item) => item.label)).toEqual([
      'Add directory',
      'Add text file',
      'Add sqlite',
    ])
  })

  it('stores directory operations separately from derived Resource policies', () => {
    const schema = DirectoryResourceElement.createSchema()
    const resource = schema.create({
      id: 'workspace',
      access: 'read-write',
      deleteFile: 'true',
      deriveText: 'true',
      textAccess: 'read',
      textPattern: '**/*.json',
      deriveSqlite: 'true',
      sqliteAccess: 'read-write',
      sqlitePattern: 'data/**/*.db',
      sqliteCreate: 'true',
    })

    expect(resource).toMatchObject({
      kind: 'directory-resource',
      id: 'workspace',
      permissions: {
        access: 'read-write',
        deleteFile: true,
        text: { access: 'read', pattern: '**/*.json' },
        sqlite: { access: 'read-write', pattern: 'data/**/*.db', create: true },
      },
    })
  })

  it('preserves stable Resource UUIDs while names and access change', () => {
    const text = TextResourceElement.create('config', 'text-resource-id')
    const sqlite = SqliteResourceElement.create('mainDb', 'sqlite-resource-id')

    expect(TextResourceElement.createSchema().update(text, {
      id: 'environment', access: 'read-write',
    })).toMatchObject({ resourceId: 'text-resource-id', id: 'environment', access: 'read-write' })
    expect(SqliteResourceElement.createSchema().update(sqlite, {
      id: 'manageDb', access: 'read-write', create: 'true',
    })).toMatchObject({ resourceId: 'sqlite-resource-id', id: 'manageDb', access: 'read-write', create: true })
  })

  it('disables SQLite creation for read-only Resources', () => {
    const sqlite = SqliteResourceElement.create('database', 'sqlite-id', 'read-write', true)
    expect(SqliteResourceElement.createSchema().update(sqlite, {
      id: 'database',
      access: 'read',
      create: 'true',
    })).toMatchObject({ access: 'read', create: false })

    const directory = DirectoryResourceElement.createSchema().create({
      id: 'workspace',
      access: 'read',
      deleteFile: 'false',
      deriveText: 'false',
      textAccess: 'read',
      textPattern: '**/*',
      deriveSqlite: 'true',
      sqliteAccess: 'read',
      sqlitePattern: '**/*.db',
      sqliteCreate: 'true',
    })
    expect(directory.permissions.sqlite).toMatchObject({ access: 'read', create: false })
  })
})
