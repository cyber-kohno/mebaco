import { invoke } from '@tauri-apps/api/core'

namespace TauriResourceCommands {
  export type Arguments = { request: unknown }

  export const invokeCommand = <T>(
    command: string,
    args: Arguments,
  ): Promise<T> => invoke<T>(command, args)
}

export default TauriResourceCommands
