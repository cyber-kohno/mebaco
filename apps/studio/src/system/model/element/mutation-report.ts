import { ExpressionVerificationImpact } from '@system/model/validation/expression/impact'

namespace ElementMutationReport {
  export type Value = {
    correctedNodeCount: number
    verificationImpact: ExpressionVerificationImpact.Value
  }

  export const empty = (): Value => ({
    correctedNodeCount: 0,
    verificationImpact: ExpressionVerificationImpact.none(),
  })

  export const merge = (
    ...reports: readonly Value[]
  ): Value => reports.reduce<Value>((result, report) => ({
    correctedNodeCount: result.correctedNodeCount + report.correctedNodeCount,
    verificationImpact: ExpressionVerificationImpact.merge(
      result.verificationImpact,
      report.verificationImpact,
    ),
  }), empty())
}

export default ElementMutationReport
