import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, open, readFile, readdir, rm, stat, utimes, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PassThrough, Readable } from 'node:stream'
import { setImmediate as immediate, setTimeout as delay } from 'node:timers/promises'
import { ROLLOUT_TAIL_BYTES, STATUS_MAX_BYTES, actionOf, applyEvent, atomicStatus, findRollout, initialStatus, main,
  readRolloutTail, rolloutReader, rolloutTailFrom, runStatus as runStatusWithRollouts, shortAction, snapshotStatus, statusWriter, validName } from './codex-status.mjs'

const root = dirname(fileURLToPath(import.meta.url))
// Unit tests do not inspect the user's actual session history.
const runStatus = (name, options) => runStatusWithRollouts(name, { sessionsDirectory: join(root, 'fixtures', 'absent-sessions'), ...options })
const fixture = name => readFile(join(root, 'fixtures', name), 'utf8')
async function directory(t) {
  const path = await mkdtemp(join(root, '.status-test-'))
  t.after(async () => { assert.ok(path.startsWith(join(root, '.status-test-'))); await rm(path, { recursive: true, force: true }) })
  return path
}
const input = text => Readable.from([text])
const completed = usage => JSON.stringify({ type: 'turn.completed', usage }) + '\n'
const tokens = { input_tokens: 100, cached_input_tokens: 50, output_tokens: 20, reasoning_output_tokens: 5 }
const stream = (id, usage = tokens) => JSON.stringify({ type: 'thread.started', thread_id: id }) + '\n{"type":"turn.started"}\n' + completed(usage)

test('recorded real exec events end in the observed failed state', async t => {
  const status = await runStatus('recorded', { directory: await directory(t), input: input(await fixture('codex-exec-recorded.jsonl')), output: null })
  assert.equal(status.state, 'failed')
  assert.equal(status.action, 'workspace routing discovery failed')
  assert.equal(status.sessionId, '01a1d1b9-bc52-7212-857e-3858ca6aff50')
})

test('the documented success stream records completed turn usage', async t => {
  const status = await runStatus('success', { directory: await directory(t), model: 'gpt-6.1-sol', input: input(await fixture('codex-exec-success.jsonl')), output: null })
  assert.equal(status.state, 'done')
  assert.deepEqual(status.totalTokenUsage, { input_tokens: 24763, cached_input_tokens: 24448, output_tokens: 122, reasoning_output_tokens: 0 })
})

test('a missing reasoning count stays unknown', () => {
  const status = applyEvent(initialStatus(), { type: 'turn.completed', usage: { input_tokens: 10, cached_input_tokens: 0, output_tokens: 3 } })
  assert.equal(status.totalTokenUsage.reasoning_output_tokens, null)
})

test('a reconnect error does not prematurely finish a running process', () => {
  assert.equal(applyEvent(initialStatus(), { type: 'error', message: 'Reconnecting...' }).state, 'running')
})
test('a quiet running command keeps publishing fresh heartbeat snapshots', async t => {
  const dir = await directory(t), channel = new PassThrough()
  const running = runStatus('live', { directory: dir, input: channel, output: null, interval: 50 })
  channel.write('{"type":"thread.started","thread_id":"live-session"}\n{"type":"turn.started"}\n' +
    '{"type":"item.started","item":{"type":"command_execution","command":"running EditMode tests"}}\n')
  const snapshot = async () => { try { return JSON.parse(await readFile(join(dir, 'live.json'), 'utf8')) } catch { return null } }
  try {
    await delay(100)
    const first = await snapshot()
    assert.ok(first)
    assert.equal(first.action, 'running EditMode tests')
    await delay(150)
    const newer = await snapshot()
    assert.ok(newer.updatedAt > first.updatedAt)
    assert.equal(newer?.state, 'running')
  } finally { channel.end(completed(tokens)); await running }
})

test('a command action names the actual command', () => {
  assert.equal(actionOf({ type: 'command_execution', command: 'dotnet test CreatureProbe.csproj' }), 'dotnet test CreatureProbe.csproj')
})
test('a pwsh command action removes the quoted executable and Command wrapper', () => {
  assert.equal(actionOf({ type: 'command_execution', command: '"C:\\Program Files\\PowerShell\\7\\pwsh.exe" -NoProfile -Command \'Get-Content CreatureProbe.cs\'' }), 'Get-Content CreatureProbe.cs')
})
test('a powershell command action shows the inner command', () => {
  assert.equal(actionOf({ type: 'command_execution', command: 'powershell -Command "dotnet test CreatureProbe.csproj"' }), 'dotnet test CreatureProbe.csproj')
})
test('a cmd command action removes slash-c and its outer quotes', () => {
  assert.equal(actionOf({ type: 'command_execution', command: 'cmd.exe /d /s /c "dotnet test CreatureProbe.csproj"' }), 'dotnet test CreatureProbe.csproj')
})
test('a bash command action removes the login shell wrapper', () => {
  assert.equal(actionOf({ type: 'command_execution', command: '/bin/bash -lc \'npm run test -- CreatureProbe\'' }), 'npm run test -- CreatureProbe')
})
test('the inner command is shortened after its shell wrapper is removed', () => {
  const command = 'dotnet test ' + 'CreatureProbe'.repeat(10)
  assert.equal(actionOf({ type: 'command_execution', command: `pwsh -Command '${command}'` }), command.slice(0, 60))
})
test('an error item before turn.started does not replace the starting action', () => {
  assert.equal(applyEvent(initialStatus(), { type: 'item.completed', item: { type: 'error', message: 'MCP connection failed' } }).action, 'starting Codex')
})
test('a warning item before turn.started does not replace the starting action', () => {
  assert.equal(applyEvent(initialStatus(), { type: 'item.completed', item: { type: 'warning', message: 'MCP warning' } }).action, 'starting Codex')
})
test('a top-level warning before turn.started does not become an action', () => {
  assert.equal(applyEvent(initialStatus(), { type: 'warning', message: 'MCP warning' }).action, 'starting Codex')
})
test('a top-level error before turn.started does not become an action', () => {
  assert.equal(applyEvent(initialStatus(), { type: 'error', message: 'MCP error' }).action, 'starting Codex')
})
test('a patch action names the file', () => {
  assert.equal(actionOf({ type: 'file_change', changes: [{ path: 'CreatureProbe.cs' }] }), 'patching CreatureProbe.cs')
})
test('a tool action names its server and tool', () => {
  assert.equal(actionOf({ type: 'mcp_tool_call', server: 'unity', tool: 'run_tests' }), 'calling unity.run_tests')
})
test('a reasoning action keeps the short summary', () => {
  assert.equal(actionOf({ type: 'reasoning', text: 'Checking how the probe discovers colliders' }), 'Checking how the probe discovers colliders')
})
test('actions contain at most sixty Unicode characters on one line', () => {
  const action = shortAction('\x1b[31mreading\n' + '🐈'.repeat(100))
  assert.equal([...action].length, 60)
  assert.ok(!action.includes('\n'))
  assert.ok(!action.includes('\x1b'))
})

test('optional synthetic rate_limits retain only the two plan windows', () => {
  const limits = { primary: { used_percent: 2, window_minutes: 300, resets_at: 100 }, secondary: { used_percent: 9, window_minutes: 10080, resets_at: 200 }, credits: 'ignored' }
  assert.deepEqual(applyEvent(initialStatus(), { type: 'turn.started', rate_limits: limits }).rateLimits, { primary: limits.primary, secondary: limits.secondary })
})
test('a stream without rate limits leaves them absent', async t => {
  const status = await runStatus('no-rates', { directory: await directory(t), input: input(await fixture('codex-exec-success.jsonl')), output: null })
  assert.equal(status.rateLimits, null)
})
test('EOF without completion records failure', async t => {
  const status = await runStatus('cut-off', { directory: await directory(t), input: input('{"type":"turn.started"}\n'), output: null })
  assert.equal(status.state, 'failed')
})
test('an empty upstream stream records failure', async t => {
  assert.equal((await runStatus('empty', { directory: await directory(t), input: input(''), output: null })).state, 'failed')
})
test('invalid JSON lines do not break subsequent valid events', async t => {
  const status = await runStatus('invalid', { directory: await directory(t), input: input('broken\n' + stream('session')), output: null })
  assert.equal(status.state, 'done')
})
test('the resolved model can be supplied by the relay', async t => {
  const status = await runStatus('model', { directory: await directory(t), model: 'gpt-6.1-sol', input: input(stream('session')), output: null })
  assert.equal(status.model, 'gpt-6.1-sol')
})
test('a repeated completed event does not count a turn twice', () => {
  const event = { type: 'turn.completed', usage: tokens }
  const status = applyEvent(initialStatus(), event)
  assert.deepEqual(applyEvent(status, event).totalTokenUsage, tokens)
})
test('two completed turns accumulate their usage', () => {
  let status = applyEvent(initialStatus(), { type: 'turn.completed', usage: tokens })
  status = applyEvent(status, { type: 'turn.started' })
  status = applyEvent(status, { type: 'turn.completed', usage: tokens })
  assert.equal(status.totalTokenUsage.input_tokens, 200)
})
test('two resumes inherit a session cumulative total once each', async t => {
  const dir = await directory(t)
  for (const name of ['first', 'resume-one', 'resume-two']) await runStatus(name, { directory: dir, input: input(stream('same-session')), output: null })
  const status = JSON.parse(await readFile(join(dir, 'resume-two.json'), 'utf8'))
  assert.equal(status.totalTokenUsage.input_tokens, 300)
  assert.equal(status.totalTokenUsage.output_tokens, 60)
})
test('a separate session does not inherit another session usage', async t => {
  const dir = await directory(t)
  await runStatus('first', { directory: dir, input: input(stream('one')), output: null })
  const status = await runStatus('second', { directory: dir, input: input(stream('two')), output: null })
  assert.deepEqual(status.totalTokenUsage, tokens)
})
test('status snapshots are replaced atomically without leaving temporary files', async t => {
  const dir = await directory(t), path = join(dir, 'atomic.json')
  await atomicStatus(path, initialStatus())
  await atomicStatus(path, { ...initialStatus(), action: 'running EditMode tests' })
  assert.equal(JSON.parse(await readFile(path, 'utf8')).action, 'running EditMode tests')
  assert.deepEqual(await readdir(dir), ['atomic.json'])
})
test('large tool output never grows the status snapshot', async t => {
  const dir = await directory(t)
  const text = stream('session').split('\n').slice(0, 2).join('\n') + '\n' + JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', command: 'dotnet test', aggregated_output: 'x'.repeat(5_000_000) } }) + '\n' + completed(tokens)
  await runStatus('bounded', { directory: dir, input: input(text), output: null })
  assert.ok((await stat(join(dir, 'bounded.json'))).size < STATUS_MAX_BYTES)
})
test('unsafe status names cannot escape the status directory', () => {
  for (const name of ['../outside', 'a/b', 'a\\b', '', 'a'.repeat(81)]) assert.equal(validName(name), false)
})
test('reusing a status name does not overwrite the existing run', async t => {
  const dir = await directory(t), path = join(dir, 'existing.json')
  await writeFile(path, 'existing')
  await assert.rejects(runStatus('existing', { directory: dir, input: input(''), output: null }), /unique status name/)
  assert.equal(await readFile(path, 'utf8'), 'existing')
})
test('busy event updates are coalesced to one write per second', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let at = 0
  const writes = [], writer = statusWriter(async status => { writes.push(status) }, 1000, () => at)
  writer.update(initialStatus())
  t.mock.timers.tick(0)
  await immediate()
  for (let n = 0; n < 10; n++) writer.update({ ...initialStatus(), action: `command ${n}` })
  at = 999; t.mock.timers.tick(999); await immediate()
  assert.equal(writes.length, 1)
  at = 1000; t.mock.timers.tick(1); await immediate()
  assert.equal(writes.length, 2)
  assert.equal(writes[1].action, 'command 9')
  await writer.close(initialStatus())
})
test('a failed intermediate write does not prevent the final snapshot', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let attempts = 0, saved
  const writer = statusWriter(async status => { if (++attempts === 1) throw new Error('busy'); saved = status }, 0)
  writer.update(initialStatus())
  t.mock.timers.tick(0)
  await writer.close({ ...initialStatus(), state: 'done' })
  assert.equal(attempts, 2)
  assert.equal(saved.state, 'done')
})

test('every savvy worker definition asks for concrete action notes', async () => {
  const agents = join(root, '..', 'agents')
  for (const name of (await readdir(agents)).filter(n => /^savvy-.*\.md$/.test(n))) {
    const text = await readFile(join(agents, name), 'utf8')
    assert.ok(text.includes('reading CreatureProbe.cs'), name)
    assert.ok(text.includes('running EditMode tests'), name)
    assert.ok(text.includes('never "working"'), name)
  }
})
test('all four relays declare a status name and pipe JSON through the writer', async () => {
  for (const family of ['luna', 'terra', 'sol', 'astra']) {
    const text = await readFile(join(root, '..', 'agents', `savvy-codex-${family}.md`), 'utf8')
    assert.ok(text.includes('codexStatus: <name>'), family)
    assert.ok(text.includes('| node <root>/scripts/codex-status.mjs'), family)
    assert.ok(text.includes('CLAUDE_PLUGIN_ROOT'), family)
    assert.ok(!text.includes('codexSession'), family)
    assert.ok(!text.includes('done: 1'), family)
  }
})

const tailLimits = { primary: { used_percent: 8, window_minutes: 300, resets_at: 1794536454 },
  secondary: { used_percent: 51, window_minutes: 10080, resets_at: 1795033876 } }

test('a rollout tail supplies its last complete model declaration', async () => {
  assert.equal(rolloutTailFrom(await fixture('codex-rollout-tail.jsonl')).model, 'gpt-6.1-sol')
})
test('a rollout tail supplies its last complete rate-limit windows', async () => {
  assert.deepEqual(rolloutTailFrom(await fixture('codex-rollout-tail.jsonl')).rateLimits, tailLimits)
})
test('a large rollout is read only with a positioned last-512-KiB read', async t => {
  const dir = await directory(t), path = join(dir, 'large.jsonl')
  const handle = await open(path, 'w')
  const size = 17 * 1024 * 1024
  try { await handle.truncate(size); await handle.write('\n' + await fixture('codex-rollout-tail.jsonl'), size) }
  finally { await handle.close() }
  const reads = []
  const result = await readRolloutTail(path, async (...args) => {
    const file = await open(...args)
    return { stat: () => file.stat(), close: () => file.close(), read: (...readArgs) => {
      reads.push({ length: readArgs[2], position: readArgs[3] })
      return file.read(...readArgs)
    } }
  })
  assert.deepEqual(reads, [{ length: ROLLOUT_TAIL_BYTES, position: (await stat(path)).size - ROLLOUT_TAIL_BYTES }])
  assert.equal(result.model, 'gpt-6.1-sol')
})
test('rollout discovery finds a session id in the dated filename', async t => {
  const dir = await directory(t), day = join(dir, '2026', '11', '12')
  await mkdir(day, { recursive: true })
  const path = join(day, 'rollout-2026-11-12-session-id.jsonl')
  await writeFile(path, '{}\n')
  assert.equal(await findRollout(dir, 'session-id'), path)
})
test('a missing rollout directory supplies no metadata', async t => {
  const reader = rolloutReader({ directory: join(await directory(t), 'missing') })
  assert.deepEqual(await reader('session'), {})
})
test('a rollout is not searched before the session id is known', async () => {
  let calls = 0
  const reader = rolloutReader({ locate: async () => { calls++; return null } })
  await reader(null)
  assert.equal(calls, 0)
})
test('rollout metadata reads are throttled to thirty seconds', async () => {
  let at = 0, reads = 0, searches = 0
  const reader = rolloutReader({ now: () => at, locate: async () => { searches++; return 'rollout' }, read: async () => { reads++; return {} } })
  await reader('session')
  at = 29_999; await reader('session')
  assert.equal(reads, 1)
  at = 30_000; await reader('session')
  assert.equal(reads, 2)
  assert.equal(searches, 1)
})
test('the final rollout read bypasses the thirty-second throttle', async () => {
  let reads = 0
  const reader = rolloutReader({ now: () => 0, locate: async () => 'rollout', read: async () => { reads++; return {} } })
  await reader('session')
  await reader('session', true)
  assert.equal(reads, 2)
})
test('throttled refreshes do not replay stale metadata over newer stream events', async () => {
  const reader = rolloutReader({ now: () => 0, locate: async () => 'rollout', read: async () => ({ model: 'gpt-6-sol' }) })
  await reader('session')
  assert.deepEqual(await reader('session'), {})
})
test('a rollout created after startup is found on the next metadata refresh', async () => {
  let at = 0, present = false
  const reader = rolloutReader({ now: () => at, locate: async () => present ? 'rollout' : null, read: async () => ({ model: 'gpt-6.1-sol' }) })
  await reader('session')
  present = true; at = 30_000
  assert.equal((await reader('session')).model, 'gpt-6.1-sol')
})
test('the final status file includes rollout model and rate limits', async t => {
  const dir = await directory(t), sessions = join(dir, 'sessions'), day = join(sessions, '2026', '11', '12')
  await mkdir(day, { recursive: true })
  await writeFile(join(day, 'rollout-2026-11-12-session.jsonl'), await fixture('codex-rollout-tail.jsonl'))
  await runStatus('enriched', { directory: dir, model: 'gpt-6-luna', sessionsDirectory: sessions, input: input(stream('session')), output: null })
  const status = JSON.parse(await readFile(join(dir, 'enriched.json'), 'utf8'))
  assert.equal(status.model, 'gpt-6.1-sol')
  assert.deepEqual(status.rateLimits, tailLimits)
})
test('run completion forces a fresh metadata read after initial discovery', async t => {
  const calls = []
  await runStatus('final', { directory: await directory(t), input: input(stream('session')), output: null,
    metadata: async (id, force) => { calls.push({ id, force }); return {} } })
  assert.deepEqual(calls, [{ id: 'session', force: false }, { id: 'session', force: true }])
})

async function snapshotFixture(t) {
  const dir = await directory(t), sessions = join(dir, 'sessions'), day = join(sessions, '2026', '11', '12')
  await mkdir(day, { recursive: true })
  const rollout = join(day, 'rollout-2026-11-12-session.jsonl')
  await writeFile(rollout, await fixture('codex-rollout-tail.jsonl'))
  return { dir, sessions, rollout }
}

test('snapshot mode writes only plan limits, model and observation time', async t => {
  const { dir, sessions } = await snapshotFixture(t)
  await snapshotStatus({ directory: dir, sessionsDirectory: sessions, now: () => 1234 })
  assert.deepEqual(JSON.parse(await readFile(join(dir, 'snapshot.json'), 'utf8')),
    { rateLimits: tailLimits, model: 'gpt-6.1-sol', updatedAt: 1234 })
})

test('snapshot mode discovers the newest rollout without a session id', async t => {
  const { dir, sessions, rollout } = await snapshotFixture(t)
  const newer = join(sessions, '2026', '11', '12', 'rollout-2026-11-12-new-session.jsonl')
  await writeFile(newer, (await fixture('codex-rollout-tail.jsonl')).replaceAll('gpt-6.1-sol', 'gpt-6.1-terra'))
  await utimes(rollout, 1000, 1000)
  await utimes(newer, 2000, 2000)
  assert.equal((await snapshotStatus({ directory: dir, sessionsDirectory: sessions })).model, 'gpt-6.1-terra')
})

test('snapshot mode uses the positioned last-512-KiB reader', async t => {
  const { dir, sessions, rollout } = await snapshotFixture(t)
  const handle = await open(rollout, 'w')
  const size = 17 * 1024 * 1024
  try { await handle.truncate(size); await handle.write('\n' + await fixture('codex-rollout-tail.jsonl'), size) }
  finally { await handle.close() }
  const reads = []
  await snapshotStatus({ directory: dir, sessionsDirectory: sessions, read: path => readRolloutTail(path, async (...args) => {
    const file = await open(...args)
    return { stat: () => file.stat(), close: () => file.close(), read: (...readArgs) => {
      reads.push({ length: readArgs[2], position: readArgs[3] })
      return file.read(...readArgs)
    } }
  }) })
  assert.deepEqual(reads, [{ length: ROLLOUT_TAIL_BYTES, position: (await stat(rollout)).size - ROLLOUT_TAIL_BYTES }])
})

test('snapshot mode can atomically refresh its previous snapshot', async t => {
  const { dir, sessions } = await snapshotFixture(t)
  await snapshotStatus({ directory: dir, sessionsDirectory: sessions, now: () => 1000 })
  await snapshotStatus({ directory: dir, sessionsDirectory: sessions, now: () => 2000 })
  assert.equal(JSON.parse(await readFile(join(dir, 'snapshot.json'), 'utf8')).updatedAt, 2000)
  assert.deepEqual((await readdir(dir)).filter(name => name !== 'sessions'), ['snapshot.json'])
})

test('snapshot mode preserves an existing reading when no rollout is available', async t => {
  const dir = await directory(t), target = join(dir, 'snapshot.json')
  await writeFile(target, 'previous reading')
  await assert.rejects(snapshotStatus({ directory: dir, sessionsDirectory: join(dir, 'missing') }), /no Codex rollout/)
  assert.equal(await readFile(target, 'utf8'), 'previous reading')
})

test('snapshot mode preserves an existing reading when the tail has no plan limits', async t => {
  const { dir, sessions, rollout } = await snapshotFixture(t)
  await writeFile(join(dir, 'snapshot.json'), 'previous reading')
  await writeFile(rollout, '{"type":"turn_context","payload":{"model":"gpt-6.1-sol"}}\n')
  await assert.rejects(snapshotStatus({ directory: dir, sessionsDirectory: sessions }), /no plan rate limits/)
  assert.equal(await readFile(join(dir, 'snapshot.json'), 'utf8'), 'previous reading')
})

test('the --snapshot entry point never accesses stdin', async t => {
  const { dir, sessions } = await snapshotFixture(t)
  await main(['--snapshot'], { directory: dir, sessionsDirectory: sessions,
    get input() { throw new Error('snapshot must not access stdin') } })
  assert.deepEqual(JSON.parse(await readFile(join(dir, 'snapshot.json'), 'utf8')).rateLimits, tailLimits)
})
