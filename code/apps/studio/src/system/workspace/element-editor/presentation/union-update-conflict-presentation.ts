import { translate } from '@system/application/localization'
import type UnionDefinitionUpdatePolicy from '@system/model/type-system/union/union-definition-update-policy'

namespace UnionUpdateConflictPresentation {
  export type Value = Readonly<{
    title: string
    message: string[]
  }>

  const formatConflict = (
    conflict: UnionDefinitionUpdatePolicy.Conflict,
  ): string => (
    `node-${conflict.nodeId}: ${conflict.sourceLabel}${conflict.detail == null
      ? ''
      : ` = ${conflict.detail}`}`
  )

  export const create = (
    unionId: string,
    conflicts: readonly UnionDefinitionUpdatePolicy.Conflict[],
  ): Value => ({
    title: translate('workspace.elementUpdate.unionConflict.title'),
    message: [
      translate(
        conflicts.length === 1
          ? 'workspace.elementUpdate.unionConflict.summary.one'
          : 'workspace.elementUpdate.unionConflict.summary.many',
        { unionId, count: conflicts.length },
      ),
      ...conflicts.map(formatConflict),
      translate('workspace.elementUpdate.unionConflict.note'),
    ],
  })
}

export default UnionUpdateConflictPresentation
