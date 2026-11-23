#!/usr/bin/env node
// Consume agy -p --output-format stream-json, pass its NDJSON through, and publish a bounded snapshot.
import { execFile } from 'node:child_process'
import { constants } from 'node:fs'
import { access, mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, delimiter, join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

export const STATUS_MAX_BYTES = 16 * 1024
export const USAGE_TIMEOUT_MS = 20_000
// The panel reads only this folder: it is never redirected by an environment variable.
export const STATUS_DIRECTORY = join(homedir(), '.gemini', 'savvy-status')
export const validName = name => typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(name)
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
export const shortAction = value => [...String(value ?? '').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/[\x00-\x1f\x7f\s]+/g, ' ').trim()].slice(0, 60).join('')
const bounded = (value, length) => typeof value === 'string' ? [...value].slice(0, length).join('') : null
const zeroUsage = () => ({ input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, thinking_tokens: 0, total_tokens: 0 })

export const initialStatus = model => ({ version: 1, sessionId: null, model: bounded(model, 120), state: 'running',
  action: 'starting Gemini', totalTokenUsage: zeroUsage(), rateLimits: null, updatedAt: 0 })

// agy reports cache reads apart from input; thinking and total may be absent and stay null then.
export function tokenUsage(value) {
  if (!value || ![value.input_tokens, value.output_tokens, value.cache_read_tokens].every(finite)) return null
  return { input_tokens: value.input_tokens, output_tokens: value.output_tokens, cache_read_tokens: value.cache_read_tokens,
    thinking_tokens: finite(value.thinking_tokens) ? value.thinking_tokens : null,
    total_tokens: finite(value.total_tokens) ? value.total_tokens : null }
}

export function addUsage(a, b) {
  const sum = key => a[key] === null || b[key] === null ? null : a[key] + b[key]
  return { input_tokens: a.input_tokens + b.input_tokens, output_tokens: a.output_tokens + b.output_tokens,
    cache_read_tokens: a.cache_read_tokens + b.cache_read_tokens, thinking_tokens: sum('thinking_tokens'),
    total_tokens: sum('total_tokens') }
}

// `/usage`'s command.data, kept as the panel parses it: group names and each bucket's window, fraction and reset.
export function usageData(value) {
  if (!value || !Array.isArray(value.groups)) return null
  const groups = value.groups.filter(g => g && typeof g.name === 'string' && Array.isArray(g.buckets)).slice(0, 8)
    .map(g => ({ name: bounded(g.name, 120), buckets: g.buckets.filter(b => b && typeof b === 'object').slice(0, 8)
      .map(b => ({ ...(typeof b.id === 'string' ? { id: bounded(b.id, 60) } : {}), window: bounded(b.window, 20),
        remaining_fraction: b.remaining_fraction, reset_time: bounded(b.reset_time, 40) })) }))
  return groups.length ? { groups } : null
}

export function usageFrom(text) {
  try { return usageData(JSON.parse(text)?.command?.data) } catch { return null }
}

export async function findAgy({ path = process.env.PATH ?? '', home = homedir(), check = file => access(file, constants.X_OK) } = {}) {
  const names = process.platform === 'win32' ? ['agy.exe', 'agy.cmd', 'agy'] : ['agy']
  for (const dir of [...path.split(delimiter).filter(Boolean), join(home, '.local', 'bin')]) {
    for (const name of names) {
      try { await check(join(dir, name)); return join(dir, name) } catch { /* Not here. */ }
    }
  }
  return null
}

// `agy -p /usage` calls no model. Signed out it waits for a browser sign-in, and with an API key it exits 2:
// a bounded run, and null on anything but a clean answer. It runs once, after the stream ends (agy has exited),
// so two agy processes never share the CLI's state at once.
export function usageReader({ locate = findAgy, run = execFile, timeout = USAGE_TIMEOUT_MS } = {}) {
  return async () => {
    const agy = await locate()
    if (!agy) return null
    return new Promise(done => {
      try {
        const child = run(agy, ['-p', '/usage', '--output-format', 'json'], { timeout, killSignal: 'SIGKILL', windowsHide: true,
          maxBuffer: 1024 * 1024 }, (error, stdout) => done(error ? null : usageFrom(String(stdout))))
        child?.stdin?.end()
      } catch { done(null) }
    })
  }
}

export function actionOf(step) {
  if (!step || typeof step !== 'object') return ''
  if (step.step_type === 'agent_response') return step.state === 'ERROR' ? 'response failed' : 'responding'
  if (step.step_type !== 'tool') return ''
  const tool = typeof step.tool_name === 'string' ? step.tool_name : step.tool_info?.name ?? 'tool'
  const parameters = step.tool_info?.parameters ?? {}
  const target = typeof parameters.CommandLine === 'string' ? parameters.CommandLine
    : typeof parameters.Path === 'string' ? basename(parameters.Path.replace(/\\/g, '/')) : ''
  return shortAction(`${step.state === 'ERROR' ? 'refused ' : ''}${tool}${target ? ` ${target}` : ''}`)
}

// In memory only: `base` is the conversation's usage before this invocation, `steps` this invocation's finished steps.
export function applyEvent(previous, event) {
  if (!event || typeof event !== 'object') return previous
  const next = { ...previous }
  if (typeof event.conversation_id === 'string' && event.conversation_id) next.sessionId = bounded(event.conversation_id, 120)
  if (event.event === 'init') {
    if (typeof event.init?.model === 'string') next.model = bounded(event.init.model, 120)
    next.state = 'running'
    next.action = 'starting Gemini'
  }
  if (event.event === 'step_update' && event.step_update && typeof event.step_update === 'object') {
    const step = event.step_update
    next.action = actionOf(step) || next.action
    const usage = step.state === 'DONE' ? tokenUsage(step.usage) : null
    if (usage && next.state === 'running') {
      next.steps = addUsage(previous.steps ?? zeroUsage(), usage)
      next.totalTokenUsage = addUsage(previous.base ?? zeroUsage(), next.steps)
    }
  }
  if (event.event === 'result' && event.result && typeof event.result === 'object') {
    const result = event.result
    if (typeof result.conversation_id === 'string' && result.conversation_id) next.sessionId = bounded(result.conversation_id, 120)
    // result.usage is the whole conversation's count, earlier --conversation turns included (measured):
    // it replaces the prior snapshot plus this invocation's running sum of steps.
    const usage = tokenUsage(result.usage)
    if (usage) next.totalTokenUsage = usage
    next.state = result.status === 'SUCCESS' ? 'done' : 'failed'
    const denied = Array.isArray(result.denied_actions)
      ? result.denied_actions.map(d => d?.action).filter(a => typeof a === 'string') : []
    if (next.state === 'failed') next.action = shortAction(result.error) || shortAction(`Gemini ${result.status ?? 'failed'}`)
    else if (denied.length) next.action = shortAction(`denied ${denied.join(', ')}`)
  }
  return next
}

// While a --conversation follow-up runs, its steps add to the largest prior snapshot of that conversation;
// its result then carries the conversation's whole count.
export async function previousSession(directory, sessionId, ownName) {
  let previous = null
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.json') || name === `${ownName}.json` || name === 'snapshot.json') continue
    try {
      const path = join(directory, name)
      if ((await stat(path)).size > STATUS_MAX_BYTES) continue
      const status = JSON.parse(await readFile(path, 'utf8'))
      const usage = tokenUsage(status.totalTokenUsage)
      if (status.version !== 1 || status.sessionId !== sessionId || !usage) continue
      const count = u => u.input_tokens + u.cache_read_tokens + u.output_tokens
      if (!previous || count(usage) > count(previous.totalTokenUsage) ||
          (count(usage) === count(previous.totalTokenUsage) && status.updatedAt > previous.updatedAt)) {
        previous = { totalTokenUsage: usage, model: bounded(status.model, 120), rateLimits: usageData(status.rateLimits),
          updatedAt: finite(status.updatedAt) ? status.updatedAt : 0 }
      }
    } catch { /* Another writer may still be creating its file. */ }
  }
  return previous
}

// Only the contract's fields reach the file; the running sums stay in memory.
export const published = ({ version, sessionId, model, state, action, totalTokenUsage, rateLimits, updatedAt }) =>
  ({ version, sessionId, model, state, action, totalTokenUsage, rateLimits, updatedAt })

export async function atomicStatus(path, status) {
  const text = JSON.stringify(status) + '\n'
  if (Buffer.byteLength(text) > STATUS_MAX_BYTES) throw new Error('status snapshot exceeds 16 KiB')
  const temporary = `${path}.${process.pid}.tmp`
  try {
    await writeFile(temporary, text, { mode: 0o600 })
    // Windows readers/virus scanners can briefly deny replacement. Keep the old
    // snapshot intact and retry the rename; never unlink it to make room.
    for (let attempt = 0; ; attempt++) {
      try { await rename(temporary, path); break }
      catch (error) {
        if (attempt >= 5 || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code)) throw error
        await delay(10 * (attempt + 1))
      }
    }
  }
  finally { await unlink(temporary).catch(() => {}) }
}

// Plan usage alone, before any relay runs: snapshot.json has no version key.
export async function snapshotStatus({ directory = STATUS_DIRECTORY, now = Date.now, usage = usageReader() } = {}) {
  const rateLimits = await usage()
  if (!rateLimits) throw new Error('agy /usage gave no plan usage (signed out, an API key set, or agy missing)')
  const status = { updatedAt: now(), model: null, rateLimits }
  await mkdir(directory, { recursive: true })
  const target = join(directory, 'snapshot.json')
  const lock = await open(`${target}.lock`, 'wx')
  try { await atomicStatus(target, status) }
  finally { await lock.close(); await unlink(`${target}.lock`).catch(() => {}) }
  return status
}

// Serialized writes coalesce busy event streams; an idle running process still
// publishes a heartbeat each second. EOF forces the final atomic snapshot.
export function statusWriter(write, interval = 1000, now = Date.now) {
  let pending, timer, chain = Promise.resolve(), last = -Infinity
  const flush = () => {
    if (!pending) return chain
    const snapshot = { ...published(pending), updatedAt: now() }
    pending = undefined
    last = now()
    chain = chain.catch(() => {}).then(() => write(snapshot))
    return chain
  }
  return {
    update(status) {
      pending = status
      if (!timer) timer = setTimeout(() => { timer = undefined; void flush().catch(() => {}) }, Math.max(0, interval - (now() - last)))
    },
    async close(status) { clearTimeout(timer); pending = status; await flush() },
  }
}

export async function runStatus(name, { directory = STATUS_DIRECTORY, model, input = process.stdin, output = process.stdout,
  interval = 1000, usage = usageReader() } = {}) {
  if (!validName(name)) throw new Error('status name must be 1–80 letters, digits, underscores or hyphens')
  await mkdir(directory, { recursive: true })
  const path = join(directory, `${name}.json`)
  const lock = await open(`${path}.lock`, 'wx')
  let heartbeat, interrupted = false, started = false, sawResult = false
  let status = initialStatus(model)
  const writer = statusWriter(snapshot => atomicStatus(path, snapshot), interval)
  const stop = () => { interrupted = true; input.destroy() }
  const readUsage = () => usage().then(limits => {
    if (limits) { status = { ...status, rateLimits: limits }; writer.update(status) }
  }).catch(() => {})
  try {
    try { await stat(path); throw new Error('pick a unique status name for every Gemini invocation') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
    started = true
    writer.update(status)
    heartbeat = setInterval(() => { if (status.state === 'running') writer.update(status) }, interval)
    process.once('SIGINT', stop); process.once('SIGTERM', stop)
    const lines = createInterface({ input, crlfDelay: Infinity })
    for await (const line of lines) {
      if (output && !output.write(line + '\n')) await new Promise(resolve => output.once('drain', resolve))
      let event
      try { event = JSON.parse(line) } catch { continue }
      const beforeId = status.sessionId
      if (event?.event === 'result') sawResult = true
      status = applyEvent(status, event)
      if (status.sessionId && status.sessionId !== beforeId && !status.base) {
        const previous = await previousSession(directory, status.sessionId, name)
        if (previous) {
          status = { ...status, base: previous.totalTokenUsage, rateLimits: status.rateLimits ?? previous.rateLimits,
            model: status.model ?? previous.model }
          status = { ...status, totalTokenUsage: addUsage(previous.totalTokenUsage, status.steps ?? zeroUsage()) }
        }
      }
      writer.update(status)
    }
  } finally {
    clearInterval(heartbeat)
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop)
    if (status.state === 'running') status = { ...status, state: 'failed',
      action: interrupted ? 'Gemini interrupted' : sawResult ? 'Gemini failed' : 'agy exited without a result' }
    try {
      if (started) { await readUsage(); await writer.close(status) }
    } finally { await lock.close(); await unlink(`${path}.lock`).catch(() => {}) }
  }
  return published(status)
}

export function main([name, model], options = {}) {
  return name === '--snapshot' ? snapshotStatus(options) : runStatus(name, { ...options, model: model ?? options.model })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(status => { if (status.state === 'failed') process.exitCode = 1 })
    .catch(error => { console.error(`gemini-status: ${error.message}`); process.exitCode = 1 })
}
