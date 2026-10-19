import { translate } from '@system/application/localization'
import type ElementUpdateTransaction from '../element-update-transaction'

namespace ElementUpdateResultPresentation {
  const formatCount = (
    count: number,
    type: 'added' | 'removed' | 'updated' | 'renamed',
  ): string | null => count === 0
    ? null
    : translate(`workspace.elementUpdate.result.count.${type}`, { count })

  const formatNotice = (
    notice: ElementUpdateTransaction.Notice,
  ): string => {
    switch (notice.type) {
      case 'signature-parameter-order-changed':
        return translate(
          'workspace.elementUpdate.result.signatureParameterOrderChanged',
        )
      case 'function-signature-changed':
        return translate(notice.referenced
          ? 'workspace.elementUpdate.result.referencedSignatureChanged'
          : 'workspace.elementUpdate.result.functionSignatureChanged')
      case 'object-members-changed': {
        const summary = [
          formatCount(notice.addedCount, 'added'),
          formatCount(notice.removedCount, 'removed'),
          formatCount(notice.updatedCount, 'updated'),
          formatCount(notice.renamedCount, 'renamed'),
        ].filter((value): value is string => value != null).join(' / ')
        return translate(
          'workspace.elementUpdate.result.objectMembersChanged',
          { summary },
        )
      }
      case 'object-members-renamed': {
        const labels = notice.renames.slice(0, 5).map((rename) => (
          `${notice.objectName}.${rename.previousPath} -> ${notice.objectName}.${rename.currentPath}`
        ))
        if (notice.renames.length > labels.length) {
          labels.push(translate(
            'workspace.elementUpdate.result.objectMembersRenamed.more',
            { count: notice.renames.length - labels.length },
          ))
        }
        return translate(
          'workspace.elementUpdate.result.objectMembersRenamed',
          { renames: labels.join(', ') },
        )
      }
      case 'object-base-selection-changed': {
        if (!notice.effectiveShapeChanged) {
          return translate(
            'workspace.elementUpdate.result.objectBaseSelectionChanged',
          )
        }
        const summary = [
          formatCount(notice.addedCount, 'added'),
          formatCount(notice.removedCount, 'removed'),
          formatCount(notice.updatedCount, 'updated'),
        ].filter((value): value is string => value != null).join(' / ')
        return translate(
          'workspace.elementUpdate.result.objectEffectiveShapeChanged',
          { summary },
        )
      }
    }
  }

  const formatReferenceUpdate = (
    elementCount: number,
    occurrenceCount: number,
  ): string => {
    const parameters = { elementCount, occurrenceCount }
    if (elementCount === 1 && occurrenceCount === 1) {
      return translate(
        'workspace.elementUpdate.result.referencesUpdated.oneOne',
        parameters,
      )
    }
    if (elementCount === 1) {
      return translate(
        'workspace.elementUpdate.result.referencesUpdated.oneMany',
        parameters,
      )
    }
    if (occurrenceCount === 1) {
      return translate(
        'workspace.elementUpdate.result.referencesUpdated.manyOne',
        parameters,
      )
    }
    return translate(
      'workspace.elementUpdate.result.referencesUpdated.manyMany',
      parameters,
    )
  }

  export const createMessages = (
    result: ElementUpdateTransaction.Result,
  ): string[] => {
    const messages = result.notices.map(formatNotice)
    if (result.updatedOccurrenceCount > 0) {
      messages.push(formatReferenceUpdate(
        result.updatedReferenceNodeIds.length,
        result.updatedOccurrenceCount,
      ))
    }
    if (result.verificationReset) {
      messages.push(translate(
        result.verificationImpact.type === 'all'
          ? 'workspace.elementUpdate.result.verificationReset.all'
          : 'workspace.elementUpdate.result.verificationReset.scope',
      ))
    }
    return messages
  }
}

export default ElementUpdateResultPresentation
