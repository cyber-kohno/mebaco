import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { root } from './studio-mcp.mjs'

// No install, GUI launch, live session discovery, client settings or packaging.
const node = process.execPath
const studio = path.join(root, 'apps/studio')
const executable = path.join(
  root,
  'apps/mcp/target/debug',
  process.platform === 'win32' ? 'mebaco-mcp.exe' : 'mebaco-mcp',
)
const steps = [
  ['release metadata', node, ['release/check-studio-mcp.mjs']],
  ['release tests', node, ['--test', 'release/test-studio-mcp.mjs']],
  ...[
    'crates/mcp-protocol',
    'crates/mcp-transport',
    'apps/mcp',
    'apps/studio/src-tauri',
  ].map((dir) => [
    `${dir} format`,
    'cargo',
    ['fmt', '--manifest-path', `${dir}/Cargo.toml`, '--', '--check'],
  ]),
  ...[
    'crates/mcp-protocol',
    'crates/mcp-transport',
    'apps/mcp',
    'apps/studio/src-tauri',
  ].map((dir) => [
    `${dir} tests`,
    'cargo',
    [
      'test',
      '--offline',
      '--locked',
      '--manifest-path',
      `${dir}/Cargo.toml`,
      ...(dir.endsWith('src-tauri') ? ['--lib'] : []),
    ],
  ]),
  [
    'Studio Svelte check',
    node,
    [
      'node_modules/svelte-check/bin/svelte-check',
      '--tsconfig',
      './tsconfig.app.json',
    ],
    studio,
  ],
  [
    'Studio build config',
    node,
    ['node_modules/typescript/bin/tsc', '-p', 'tsconfig.node.json'],
    studio,
  ],
  ['Studio tests', node, ['node_modules/vitest/vitest.mjs', 'run'], studio],
  [
    'Studio Frontend build',
    node,
    ['node_modules/vite/bin/vite.js', 'build'],
    studio,
  ],
  [
    'Studio native check',
    'cargo',
    [
      'check',
      '--offline',
      '--locked',
      '--manifest-path',
      'apps/studio/src-tauri/Cargo.toml',
      '--lib',
    ],
  ],
  [
    'MCP executable',
    'cargo',
    [
      'build',
      '--offline',
      '--locked',
      '--manifest-path',
      'apps/mcp/Cargo.toml',
    ],
  ],
  ['MCP stdio smoke', node, ['apps/mcp/scripts/verify-stdio.mjs', executable]],
  [
    'Compatibility fixture host',
    'cargo',
    [
      'build',
      '--offline',
      '--locked',
      '--manifest-path',
      'apps/mcp/Cargo.toml',
      '--example',
      'compatibility_host',
    ],
  ],
  [
    'Isolated process compatibility',
    node,
    [
      'apps/mcp/scripts/test-compatibility.mjs',
      executable,
      path.join(
        root,
        'apps/mcp/target/debug/examples',
        process.platform === 'win32'
          ? 'compatibility_host.exe'
          : 'compatibility_host',
      ),
    ],
  ],
]
if (process.argv.includes('--browser')) {
  steps.push(
    [
      'MCP diagnostics browser',
      node,
      ['scripts/test-mcp-diagnostics.mjs'],
      studio,
    ],
    [
      'MCP runtime Preview browser',
      node,
      ['scripts/test-mcp-preview.mjs'],
      studio,
    ],
  )
}
const logs = path.join(root, 'apps/mcp/target/generation-checks')
mkdirSync(logs, { recursive: true })
for (let i = 0; i < steps.length; i++) {
  const [name, command, args, cwd = root] = steps[i]
  console.log(`[${i + 1}/${steps.length}] ${name}`)
  let output = ''
  const status = await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (s) => {
      output += s
    })
    child.stderr.on('data', (s) => {
      output += s
    })
    child.on('error', reject)
    child.on('exit', resolve)
  })
  writeFileSync(
    path.join(logs, `${String(i + 1).padStart(2, '0')}.log`),
    output,
  )
  if (status !== 0) {
    console.error(output)
    throw new Error(`${name} failed (${status})`)
  }
}
console.log(
  `Studio/MCP automated suite passed (${steps.length} steps). Logs: ${logs}`,
)
