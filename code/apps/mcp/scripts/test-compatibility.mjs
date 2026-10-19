// Isolated real processes: actual stdio MCP and actual Studio HTTP acceptance gate.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs'
import { createServer, request as httpRequest } from 'node:http'
import { randomBytes, randomUUID } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createInterface } from 'node:readline'
import { once } from 'node:events'
import { loadStudioMcpIdentity } from '../../../release/studio-mcp.mjs'
const identity = loadStudioMcpIdentity()
const executable =
  process.argv[2] ??
  fileURLToPath(new URL('../target/debug/mebaco-mcp.exe', import.meta.url))
const hostExecutable =
  process.argv[3] ??
  fileURLToPath(
    new URL('../target/debug/examples/compatibility_host.exe', import.meta.url),
  )
const temporary = mkdtempSync(
  path.join(tmpdir(), 'mebaco-process-compatibility-'),
)
if (process.platform === 'darwin')
  throw new Error('This fixture currently supports Windows/Linux data roots.')
const sessions = path.join(temporary, 'com.mebaco.studio/mcp/sessions')
mkdirSync(sessions, { recursive: true })
const children = []
let legacyPosts = 0
const token = randomBytes(32).toString('hex'),
  legacyId = randomUUID()
const legacy = createServer((req, res) => {
  if (req.method === 'POST') legacyPosts++
  const body = JSON.stringify({ ok: true, sessionId: legacyId })
  res.writeHead(200, { 'Content-Length': Buffer.byteLength(body) })
  res.end(body)
})
const launchHost = async (gen) => {
  const child = spawn(hostExecutable, [sessions, String(gen)], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  children.push(child)
  const lines = createInterface({ input: child.stdout })
  let stderr = ''
  child.stderr.on('data', (d) => {
    stderr += d
  })
  const ready = await Promise.race([
    once(lines, 'line').then(([s]) => JSON.parse(s)),
    new Promise((_, reject) => {
      child.once('error', reject)
      child.once('exit', () =>
        reject(new Error(`Fixture host exited: ${stderr}`)),
      )
      const t = setTimeout(
        () => reject(new Error('Fixture host startup timed out.')),
        10000,
      )
      t.unref()
    }),
  ])
  return ready.sessionId
}
let mcp,
  reader,
  pending = new Map(),
  nextId = 0
const send = (method, params, id) =>
  mcp.stdin.write(
    JSON.stringify({
      jsonrpc: '2.0',
      ...(id == null ? {} : { id }),
      method,
      params,
    }) + '\n',
  )
const call = (method, params) =>
  new Promise((resolve, reject) => {
    const id = ++nextId
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`MCP request timed out: ${method}`))
    }, 10000)
    pending.set(id, { resolve, reject, timer })
    send(method, params, id)
  })
const tool = async (name, args = {}) => {
  const result = await call('tools/call', { name, arguments: args })
  return {
    failed: result.isError === true,
    value: JSON.parse(result.content[0].text),
  }
}
try {
  const compatibleId = await launchHost(identity.bridgeProtocolGen),
    foreignId = await launchHost(identity.bridgeProtocolGen + 1)
  legacy.listen(0, '127.0.0.1')
  await once(legacy, 'listening')
  writeFileSync(
    path.join(sessions, `${legacyId}.json`),
    JSON.stringify({
      sessionId: legacyId,
      pid: process.pid,
      endpoint: `http://127.0.0.1:${legacy.address().port}`,
      token,
      projectDisplayName: 'legacy-fixture.mbc',
      dirty: false,
      createdAtEpochMs: 1,
    }),
  )
  mcp = spawn(executable, [], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, LOCALAPPDATA: temporary, XDG_DATA_HOME: temporary },
  })
  children.push(mcp)
  reader = createInterface({ input: mcp.stdout })
  mcp.stderr.resume()
  reader.on('line', (source) => {
    const result = JSON.parse(source),
      request = pending.get(result.id)
    if (!request) return
    clearTimeout(request.timer)
    pending.delete(result.id)
    result.error
      ? request.reject(new Error(JSON.stringify(result.error)))
      : request.resolve(result.result)
  })
  await call('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'isolated-compatibility-test', version: '1.0' },
  })
  send('notifications/initialized', {})
  const list = (await tool('list_development_sessions')).value
  const find = (id) => list.sessions.find((s) => s.sessionId === id)
  assert.equal(find(compatibleId).compatible, true)
  assert.equal(find(foreignId).status, 'incompatible')
  assert.equal(find(legacyId).status, 'legacy')
  assert.ok(!JSON.stringify(list).includes(token))
  assert.ok(list.sessions.every((s) => !('token' in s) && !('endpoint' in s)))
  assert.equal(
    (await tool('get_project_overview', { sessionId: compatibleId })).failed,
    false,
  )
  for (const sessionId of [foreignId, legacyId])
    assert.equal(
      (await tool('get_project_overview', { sessionId })).failed,
      true,
    )
  assert.equal(legacyPosts, 0)
  const descriptor = JSON.parse(
    readFileSync(path.join(sessions, `${compatibleId}.json`), 'utf8'),
  )
  for (const contract of [
    undefined,
    { bridgeProtocolGen: identity.bridgeProtocolGen + 1 },
  ]) {
    const body = JSON.stringify({
      method: 'applyChanges',
      sessionId: compatibleId,
      ...(contract ? { contract } : {}),
    })
    const response = await new Promise((resolve, reject) => {
      const req = httpRequest(
        `${descriptor.endpoint}/bridge`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${descriptor.token}`,
            'Content-Length': Buffer.byteLength(body),
          },
        },
        (res) => {
          let source = ''
          res.on('data', (d) => (source += d))
          res.on('end', () =>
            resolve({ status: res.statusCode, value: JSON.parse(source) }),
          )
        },
      )
      req.on('error', reject)
      req.end(body)
    })
    assert.equal(response.status, 409)
    assert.ok(response.value.error.code.startsWith('MCP_'))
    assert.ok(!JSON.stringify(response).includes(descriptor.token))
  }
  console.log(
    'Isolated real-process compatibility OK: same-generation/version difference, mixed sessions, legacy preflight, direct legacy/foreign refusal, secret-free results.',
  )
} finally {
  for (const request of pending.values()) {
    clearTimeout(request.timer)
    request.reject(new Error('Fixture test ended.'))
  }
  pending.clear()
  for (const child of children) child.stdin.end()
  await Promise.all(
    children.map((child) =>
      child.exitCode != null
        ? null
        : Promise.race([
            once(child, 'exit'),
            new Promise((resolve) => {
              const timer = setTimeout(() => {
                child.kill()
                resolve()
              }, 2000)
              timer.unref()
            }),
          ]),
    ),
  )
  reader?.close()
  await new Promise((resolve) => legacy.close(resolve))
  rmSync(temporary, { recursive: true, force: true })
}
