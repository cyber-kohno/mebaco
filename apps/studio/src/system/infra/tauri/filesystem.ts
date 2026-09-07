import { readFile, writeFile } from '@tauri-apps/plugin-fs'

namespace TauriFileSystem {
  export const readBinaryFile = (path: string): Promise<Uint8Array> => readFile(path)

  export const writeBinaryFile = (
    path: string,
    bytes: Uint8Array,
  ): Promise<void> => writeFile(path, bytes)
}

export default TauriFileSystem
