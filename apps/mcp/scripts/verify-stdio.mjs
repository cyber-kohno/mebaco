// Read-only smoke test: initialize and inspect tool schemas without touching Studio.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'

const executable = process.argv[2] ?? fileURLToPath(new URL('../target/next-release/release/mebaco-mcp.exe', import.meta.url))
const child = spawn(executable, [], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
const pending = new Map()
let nextId = 0
let stderr = ''
child.stderr.on('data', (data) => { stderr += data })
const lines = createInterface({ input: child.stdout })
lines.on('line', (line) => {
  try {
    const response = JSON.parse(line)
    const request = pending.get(response.id)
    if (request == null) return
    pending.delete(response.id)
    clearTimeout(request.timeout)
    if (response.error) request.reject(new Error(JSON.stringify(response.error)))
    else request.resolve(response.result)
  } catch (error) { failPending(error) }
})
function failPending(error) {
  for (const request of pending.values()) { clearTimeout(request.timeout); request.reject(error) }
  pending.clear()
}
child.on('error', failPending)
child.on('exit', (code) => failPending(new Error(`MCP exited (${code}): ${stderr}`)))
const send = (method, params, id) => child.stdin.write(JSON.stringify({ jsonrpc: '2.0', ...(id == null ? {} : { id }), method, params }) + '\n')
const call = (method, params) => new Promise((resolve, reject) => {
  const id = ++nextId
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)) }, 10000)
  pending.set(id, { resolve, reject, timeout })
  send(method, params, id)
})

try {
  await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'mebaco-schema-smoke', version: '1.0' } })
  send('notifications/initialized', {})
  const { tools } = await call('tools/list', {})
  assert.equal(tools.length, 29)
  for (const name of ['checkin_edit_session', 'cancel_edit_session']) {
    const tool = tools.find((tool) => tool.name === name)
    for (const field of ['sessionId', 'checkoutId', 'expectedRevision']) assert(tool?.inputSchema.required.includes(field), `${name}: ${field} must be required`)
  }
  const updates = ['create_application', 'apply_changes', 'set_node_disabled', 'update_node_property', 'delete_node', 'insert_node', 'move_node', 'update_node_attribute']
  for (const name of updates) {
    const tool = tools.find((tool) => tool.name === name)
    assert(tool?.inputSchema.required.includes('checkoutId'), `${name}: checkoutId must be required`)
    assert(tool.inputSchema.required.includes('expectedRevision'), `${name}: expectedRevision must be required`)
  }
  for (const name of ['get_project_summary', 'get_project_overview', 'get_app_analysis_context', 'get_node_details', 'select_node', 'start_preview', 'inspect_preview', 'interact_preview', 'close_preview']) {
    const tool = tools.find((tool) => tool.name === name)
    assert(tool != null && tool.inputSchema.properties.checkoutId == null, `${name}: checkout must not be required`)
  }
  console.log(`stdio initialize/tools/list OK: ${tools.length} tools, all ${updates.length} content updates require checkoutId; reads/selection/Preview do not.`)
} finally {
  // Close only the subprocess created by this test, never an existing MCP/Studio process.
  child.stdin.end()
  const cleanup = setTimeout(() => { if (child.exitCode == null) child.kill() }, 2000)
  cleanup.unref()
}
