import TauriResourceCommands from './resource-commands'

namespace TauriResourcePathValidation {
  export type ExpectedKind = 'file' | 'directory'

  export type Request = {
    path: string
    expectedKind: ExpectedKind
    allowMissingFile: boolean
  }

  export type Status =
    | 'valid'
    | 'creatable'
    | 'not-absolute'
    | 'not-found'
    | 'expected-file'
    | 'expected-directory'
    | 'parent-not-directory'
    | 'unsupported-kind'
    | 'unavailable'

  export type Result = {
    status: Status
    detail?: string
  }

  export const validate = (
    request: Request,
  ): Promise<Result> => TauriResourceCommands.invokeCommand<Result>(
    'resource_validate_path',
    { request },
  )
}

export default TauriResourcePathValidation
