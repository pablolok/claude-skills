import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PassThrough, Readable } from 'node:stream'
import { setTimeout as delay } from 'node:timers/promises'
import { STATUS_MAX_BYTES, actionOf, applyEvent, findAgy, initialStatus, main, runStatus as runStatusWithUsage,
  shortAction, snapshotStatus, tokenUsage, usageFrom, usageReader, validName } from './gemini-status.mjs'

const root = dirname(fileURLToPath(import.meta.url))
const fixture = name => readFile(join(root, 'fixtures', name), 'utf8')
// Unit tests never run agy: plan usage comes from the recorded /usage answer, or from nothing.
const noUsage = async () => null
const runStatus = (name, options) => runStatusWithUsage(name, { usage: noUsage, output: null, ...options })
async function directory(t) {
  const path = await mkdtemp(join(root, '.gemini-status-test-'))
  t.after(async () => { assert.ok(path.startsWith(join(root, '.gemini-status-test-'))); await rm(path, { recursive: true, force: true }) })
  return path
}
const input = text => Readable.from([text])
const line = value => JSON.stringify(value) + '\n'
const tokens = { input_tokens: 100, output_tokens: 20, thinking_tokens: 5, cache_read_tokens: 50, total_tokens: 120 }
const stream = (id, usage = tokens, status = 'SUCCESS') =>
  line({ event: 'init', conversation_id: id, init: { model: 'gemini-3.8-flash', cwd: '/work/repo', tools: [], permission_mode: 'request-review' } }) +
  line({ event: 'result', result: { conversation_id: id, status, response: 'ok', duration_seconds: 1, num_turns: 1, usage } })

test('the recorded implementation run ends done with the result usage', async t => {
  const status = await runStatus('success', { directory: await directory(t), input: input(await fixture('gemini-stream-success.jsonl')) })
  assert.equal(status.state, 'done')
  assert.equal(status.model, 'gemini-3.8-flash')
  assert.equal(status.sessionId, '00000000-0000-4000-8000-000000000001')
  assert.deepEqual(status.totalTokenUsage,
    { input_tokens: 13534, output_tokens: 460, cache_read_tokens: 9099, thinking_tokens: 276, total_tokens: 13994 })
  assert.equal(status.action, 'responding')
})

test('the recorded stream passes through to the relay log unchanged', async t => {
  const text = await fixture('gemini-stream-success.jsonl'), out = new PassThrough()
  let copied = ''
  out.on('data', chunk => { copied += chunk })
  await runStatus('tee', { directory: await directory(t), input: input(text), output: out })
  assert.equal(copied, text)
})

test('the finished steps give a running total that the result then replaces', async () => {
  const events = (await fixture('gemini-stream-success.jsonl')).trim().split('\n').map(l => JSON.parse(l))
  let status = initialStatus()
  for (const event of events.filter(e => e.event !== 'result')) status = applyEvent(status, event)
  assert.equal(status.state, 'running')
  assert.equal(status.totalTokenUsage.input_tokens, 11143 + 2391)
  status = applyEvent(status, events.at(-1))
  assert.equal(status.totalTokenUsage.input_tokens, 13534, 'the result is not added to its own steps')
})

test('a write refused by a deny rule still ends done, and the refusal is the last tool action', async t => {
  const dir = await directory(t), channel = new PassThrough()
  const events = (await fixture('gemini-stream-denied.jsonl')).trim().split('\n')
  const running = runStatus('denied', { directory: dir, input: channel, interval: 20 })
  for (const event of events.slice(0, events.findIndex(l => l.includes('"state":"ERROR"')) + 1)) channel.write(event + '\n')
  await delay(80)
  assert.equal(JSON.parse(await readFile(join(dir, 'denied.json'), 'utf8')).action, 'refused edit_file a.txt')
  channel.end(events.slice(events.findIndex(l => l.includes('"state":"ERROR"')) + 1).join('\n') + '\n')
  const status = await running
  assert.equal(status.state, 'done', 'agy reports SUCCESS: the relay reads the ERROR steps')
  assert.equal(events.filter(l => l.includes('"state":"ERROR"')).length, 3, 'edit, write and command all refused')
})

test('a soft-denied command ends done and names the denied action', async t => {
  const status = await runStatus('soft', { directory: await directory(t), input: input(await fixture('gemini-stream-soft-denied.jsonl')) })
  assert.equal(status.state, 'done')
  assert.equal(status.action, 'denied command')
})

test('a print timeout ends failed with the error as its action', async t => {
  const status = await runStatus('timeout', { directory: await directory(t), input: input(await fixture('gemini-stream-timeout.jsonl')) })
  assert.equal(status.state, 'failed')
  assert.equal(status.action, shortAction('print timeout after 1s with the turn still in progress; the response is partial'))
})

test('EOF without a result records failure', async t => {
  const text = (await fixture('gemini-stream-success.jsonl')).split('\n').slice(0, 5).join('\n')
  const status = await runStatus('eof', { directory: await directory(t), input: input(text) })
  assert.equal(status.state, 'failed')
  assert.equal(status.action, 'agy exited without a result')
})

test('an empty upstream stream records failure', async t => {
  assert.equal((await runStatus('empty', { directory: await directory(t), input: input('') })).state, 'failed')
})

test('invalid JSON lines do not break subsequent valid events', async t => {
  const status = await runStatus('invalid', { directory: await directory(t), input: input('not json\n' + stream('s1')) })
  assert.equal(status.state, 'done')
})

test('the model passed by the relay holds until init declares one', async t => {
  const status = await runStatus('model', { directory: await directory(t), model: 'gemini-4-argon', input: input('') })
  assert.equal(status.model, 'gemini-4-argon')
})

test('a tool action names the tool and the file, or the command it runs', () => {
  assert.equal(actionOf({ step_type: 'tool', state: 'ACTIVE', tool_name: 'write_file', tool_info: { parameters: { Path: '/work/repo/src/hello.txt' } } }), 'write_file hello.txt')
  assert.equal(actionOf({ step_type: 'tool', state: 'DONE', tool_name: 'run_command', tool_info: { parameters: { CommandLine: 'npm test' } } }), 'run_command npm test')
  assert.equal(actionOf({ step_type: 'agent_response', state: 'ACTIVE', text_delta: 'Ho creato' }), 'responding')
  assert.equal(actionOf({ step_type: 'user_input', state: 'DONE' }), '')
})

test('actions contain at most sixty Unicode characters on one line', () => {
  const action = actionOf({ step_type: 'tool', state: 'DONE', tool_name: 'run_command', tool_info: { parameters: { CommandLine: 'echo 🙂\n'.repeat(30) } } })
  assert.ok([...action].length <= 60)
  assert.ok(!/[\n\r]/.test(action))
})

test('missing thinking and total counts stay unknown', () => {
  assert.deepEqual(tokenUsage({ input_tokens: 1, output_tokens: 2, cache_read_tokens: 3 }),
    { input_tokens: 1, output_tokens: 2, cache_read_tokens: 3, thinking_tokens: null, total_tokens: null })
  assert.equal(tokenUsage({ input_tokens: 1, output_tokens: -2, cache_read_tokens: 3 }), null)
})

test('cache reads may exceed input: agy counts them apart', () => {
  assert.equal(tokenUsage({ input_tokens: 2391, output_tokens: 189, cache_read_tokens: 9099 }).cache_read_tokens, 9099)
})

test('a follow-up result carries the whole conversation: it replaces the prior total, never adds to it', async t => {
  const dir = await directory(t), followUp = await fixture('gemini-stream-follow-up.jsonl')
  const id = JSON.parse(followUp.split('\n')[0]).conversation_id
  const earlier = { input_tokens: 19856, output_tokens: 6, cache_read_tokens: 15412, thinking_tokens: 0, total_tokens: 19862 }
  await runStatus('earlier', { directory: dir, input: input(stream(id, earlier)) })
  const status = await runStatus('later', { directory: dir, input: input(followUp) })
  assert.deepEqual(status.totalTokenUsage,
    { input_tokens: 38615, output_tokens: 9, cache_read_tokens: 15412, thinking_tokens: 0, total_tokens: 38624 })
})

test('while a follow-up runs, its finished steps add to the prior total of its conversation', async t => {
  const dir = await directory(t), channel = new PassThrough()
  await runStatus('first', { directory: dir, input: input(stream('c1')) })
  const running = runStatus('second', { directory: dir, input: channel, interval: 20 })
  channel.write(line({ event: 'init', conversation_id: 'c1', init: { model: 'gemini-3.8-flash' } }) +
    line({ event: 'step_update', step_update: { conversation_id: 'c1', step_index: 4, state: 'DONE', step_type: 'agent_response', usage: tokens } }))
  await delay(80)
  assert.equal(JSON.parse(await readFile(join(dir, 'second.json'), 'utf8')).totalTokenUsage.input_tokens, 200)
  channel.end(line({ event: 'result', result: { conversation_id: 'c1', status: 'SUCCESS', usage: { ...tokens, input_tokens: 200 } } }))
  assert.equal((await running).totalTokenUsage.input_tokens, 200)
})

test('a separate conversation does not inherit another one usage', async t => {
  const dir = await directory(t)
  await runStatus('one', { directory: dir, input: input(stream('c1')) })
  const other = await runStatus('two', { directory: dir, input: input(stream('c2')) })
  assert.equal(other.totalTokenUsage.input_tokens, 100)
})

test('plan usage from /usage is embedded as its command data, after the run', async t => {
  const recorded = usageFrom(await fixture('gemini-usage.json'))
  const dir = await directory(t)
  const status = await runStatus('usage', { directory: dir, input: input(stream('u1')), usage: async () => recorded })
  const gemini = status.rateLimits.groups.find(g => g.name === 'Gemini Models')
  assert.deepEqual(gemini.buckets.map(b => [b.window, b.reset_time]),
    [['weekly', '2026-11-30T21:24:13Z'], ['5h', '2026-11-24T02:24:13Z']])
  assert.equal(gemini.buckets[0].remaining_fraction, 0.9978731274604797)
  assert.ok(!('description' in gemini), 'descriptions are dropped to keep the file small')
  const saved = JSON.parse(await readFile(join(dir, 'usage.json'), 'utf8'))
  assert.deepEqual(saved.rateLimits, status.rateLimits)
})

test('a /usage that fails leaves plan usage null', async t => {
  const status = await runStatus('nousage', { directory: await directory(t), input: input(stream('n1')), usage: async () => { throw new Error('exit 2') } })
  assert.equal(status.rateLimits, null)
})

test('/usage runs bounded through the located CLI and fails closed', async () => {
  const calls = []
  const run = (file, args, options, callback) => { calls.push({ file, args, options }); setImmediate(() => callback(null, '{"command":{"data":{"groups":[]}}}')); return null }
  assert.equal(await usageReader({ locate: async () => '/opt/agy', run })(), null, 'no group: no reading')
  assert.deepEqual(calls[0].args, ['-p', '/usage', '--output-format', 'json'])
  assert.ok(calls[0].options.timeout > 0)
  assert.equal(await usageReader({ locate: async () => null, run })(), null)
  const failing = (file, args, options, callback) => { setImmediate(() => callback(Object.assign(new Error('exit 2'), { code: 2 }), '')); return null }
  assert.equal(await usageReader({ locate: async () => '/opt/agy', run: failing })(), null)
})

test('the CLI is found on the PATH, then in ~/.local/bin', async () => {
  const present = new Set([join('/home/u', '.local', 'bin', 'agy')])
  const check = async file => { if (!present.has(file)) throw new Error('absent') }
  assert.equal(await findAgy({ path: '/usr/bin', home: '/home/u', check }), join('/home/u', '.local', 'bin', 'agy'))
  present.add(join('/usr/bin', 'agy'))
  assert.equal(await findAgy({ path: '/usr/bin', home: '/home/u', check }), join('/usr/bin', 'agy'))
})

test('the snapshot holds plan usage alone, with no version key', async t => {
  const dir = await directory(t), recorded = usageFrom(await fixture('gemini-usage.json'))
  const status = await snapshotStatus({ directory: dir, now: () => 42, usage: async () => recorded })
  const saved = JSON.parse(await readFile(join(dir, 'snapshot.json'), 'utf8'))
  assert.deepEqual(saved, status)
  assert.ok(!('version' in saved))
  await assert.rejects(snapshotStatus({ directory: dir, usage: noUsage }))
})

test('only the contract fields reach the status file', async t => {
  const dir = await directory(t)
  await runStatus('fields', { directory: dir, input: input(await fixture('gemini-stream-success.jsonl')) })
  const saved = JSON.parse(await readFile(join(dir, 'fields.json'), 'utf8'))
  assert.deepEqual(Object.keys(saved).sort(), ['action', 'model', 'rateLimits', 'sessionId', 'state', 'totalTokenUsage', 'updatedAt', 'version'])
  assert.equal(saved.version, 1)
  assert.ok(Number.isFinite(saved.updatedAt) && saved.updatedAt > 0)
})

test('a quiet running tool keeps publishing fresh heartbeat snapshots', async t => {
  const dir = await directory(t), channel = new PassThrough()
  const running = runStatus('live', { directory: dir, input: channel, interval: 50 })
  channel.write(line({ event: 'init', conversation_id: 'live', init: { model: 'gemini-3.8-flash' } }) +
    line({ event: 'step_update', step_update: { conversation_id: 'live', step_index: 3, state: 'ACTIVE', step_type: 'tool', tool_name: 'run_command', tool_info: { parameters: { CommandLine: 'npm test' } } } }))
  const snapshot = async () => { try { return JSON.parse(await readFile(join(dir, 'live.json'), 'utf8')) } catch { return null } }
  try {
    await delay(100)
    const first = await snapshot()
    assert.equal(first.action, 'run_command npm test')
    await delay(150)
    const newer = await snapshot()
    assert.ok(newer.updatedAt > first.updatedAt)
    assert.equal(newer.state, 'running')
  } finally { channel.end(line({ event: 'result', result: { conversation_id: 'live', status: 'SUCCESS', usage: tokens } })); await running }
})

test('status snapshots are replaced atomically without leaving temporary or lock files', async t => {
  const dir = await directory(t)
  await runStatus('atomic', { directory: dir, input: input(await fixture('gemini-stream-success.jsonl')) })
  assert.deepEqual(await readdir(dir), ['atomic.json'])
})

test('large tool output never grows the status snapshot', async t => {
  const dir = await directory(t), huge = 'x'.repeat(200_000)
  await runStatus('large', { directory: dir, input: input(line({ event: 'step_update', step_update: { conversation_id: 'l', step_index: 1, state: 'DONE', step_type: 'tool', tool_name: 'run_command', tool_info: { parameters: { CommandLine: huge }, output: huge } } }) + stream('l')) })
  assert.ok((await readFile(join(dir, 'large.json'))).length < STATUS_MAX_BYTES)
})

test('unsafe status names cannot escape the status directory', () => {
  for (const name of ['../x', 'a/b', '', '-x', 'a'.repeat(81), 'a b']) assert.equal(validName(name), false, name)
  assert.equal(validName('3f2a-9c'), true)
})

test('reusing a status name does not overwrite the existing run', async t => {
  const dir = await directory(t)
  await writeFile(join(dir, 'taken.json'), '{"keep":true}')
  await assert.rejects(main(['taken'], { directory: dir, input: input(stream('t')), output: null, usage: noUsage }), /unique status name/)
  assert.equal(await readFile(join(dir, 'taken.json'), 'utf8'), '{"keep":true}')
})

test('all four relays declare a status name and pipe stream-json through the writer', async () => {
  for (const family of ['flash', 'argon', 'hydrogen', 'carbon']) {
    const text = await readFile(join(root, '..', 'agents', `savvy-gemini-${family}.md`), 'utf8')
    assert.ok(text.includes('geminiStatus: <name>'), family)
    assert.ok(text.includes('| node <root>/scripts/gemini-status.mjs <name> <model> > <log>'), family)
    assert.ok(text.includes('--output-format stream-json'), family)
    assert.ok(text.includes('CLAUDE_PLUGIN_ROOT'), family)
    assert.ok(!text.includes('done: 1'), family)
  }
})
