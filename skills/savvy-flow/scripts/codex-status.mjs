#!/usr/bin/env node
// Consume codex exec --json, pass its JSONL through, and publish a bounded snapshot.
import { mkdir, open, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { setTimeout as delay } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

export const STATUS_MAX_BYTES = 16 * 1024
export const ROLLOUT_TAIL_BYTES = 512 * 1024
export const validName = name => typeof name === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(name)
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0
export const shortAction = value => [...String(value ?? '').replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').replace(/[\x00-\x1f\x7f\s]+/g, ' ').trim()].slice(0, 60).join('')
const bounded = (value, length) => typeof value === 'string' ? [...value].slice(0, length).join('') : null
const zeroUsage = () => ({ input_tokens: 0, cached_input_tokens: 0, output_tokens: 0, reasoning_output_tokens: 0 })

export const initialStatus = model => ({ version: 1, sessionId: null, model: bounded(model, 120), state: 'running',
  action: 'starting Codex', turnStarted: false, totalTokenUsage: zeroUsage(), rateLimits: null, updatedAt: 0 })

export function tokenUsage(value) {
  if (!value || ![value.input_tokens, value.cached_input_tokens, value.output_tokens].every(finite) ||
      value.cached_input_tokens > value.input_tokens) return null
  return { input_tokens: value.input_tokens, cached_input_tokens: value.cached_input_tokens,
    output_tokens: value.output_tokens, reasoning_output_tokens: finite(value.reasoning_output_tokens) ? value.reasoning_output_tokens : null }
}

export function rateLimits(value) {
  const window = (w, minutes) => w && w.window_minutes === minutes && finite(w.used_percent) && finite(w.resets_at)
    ? { used_percent: w.used_percent, window_minutes: minutes, resets_at: w.resets_at } : null
  const primary = window(value?.primary, 300), secondary = window(value?.secondary, 10080)
  return primary || secondary ? { primary, secondary } : null
}

export function addUsage(a, b) {
  return { input_tokens: a.input_tokens + b.input_tokens, cached_input_tokens: a.cached_input_tokens + b.cached_input_tokens,
    output_tokens: a.output_tokens + b.output_tokens,
    reasoning_output_tokens: a.reasoning_output_tokens === null || b.reasoning_output_tokens === null
      ? null : a.reasoning_output_tokens + b.reasoning_output_tokens }
}

export function commandAction(command) {
  let inner = String(command ?? '').trim()
  // Display only: unwrap known shells without evaluating or tokenizing commands.
  for (let depth = 0; depth < 4; depth++) {
    const shell = /^(?:"([^"]+)"|'([^']+)'|([^\s]+))\s+([\s\S]+)$/.exec(inner)
    if (!shell) break
    const name = (shell[1] ?? shell[2] ?? shell[3]).replace(/\\/g, '/').split('/').pop().replace(/\.exe$/i, '').toLowerCase()
    const args = shell[4]
    const match = /^(?:pwsh|powershell)$/.test(name) ? /(?:^|\s)-(?:command|c)\s+([\s\S]+)$/i.exec(args)
      : name === 'cmd' ? /(?:^|\s)\/c\s+([\s\S]+)$/i.exec(args)
      : /^(?:bash|sh|zsh)$/.test(name) ? /(?:^|\s)-(?:lc|cl|c)\s+([\s\S]+)$/.exec(args) : null
    if (!match) break
    inner = match[1].trim()
    const quote = inner[0]
    if ((quote === '"' || quote === "'") && inner.endsWith(quote)) inner = inner.slice(1, -1)
  }
  return shortAction(inner)
}

export function rolloutTailFrom(text) {
  let model = null, limits = null
  for (const line of text.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line)
      if (event?.type === 'turn_context' && typeof event.payload?.model === 'string') model = bounded(event.payload.model, 120)
      if (event?.type === 'event_msg' && event.payload?.type === 'token_count') {
        limits = rateLimits(event.payload.rate_limits) ?? limits
      }
    } catch { /* A positioned tail can begin or end in the middle of a JSON line. */ }
  }
  return { model, rateLimits: limits }
}

export async function readRolloutTail(path, openFile = open) {
  const handle = await openFile(path, 'r')
  try {
    const { size } = await handle.stat()
    const position = Math.max(0, size - ROLLOUT_TAIL_BYTES)
    const buffer = Buffer.alloc(Math.min(size, ROLLOUT_TAIL_BYTES))
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, position)
    let text = buffer.toString('utf8', 0, bytesRead)
    if (position > 0) text = text.includes('\n') ? text.slice(text.indexOf('\n') + 1) : ''
    return rolloutTailFrom(text)
  } finally { await handle.close() }
}

export async function findRollout(directory, sessionId) {
  if (typeof sessionId !== 'string' || !/^[a-zA-Z0-9_-]{1,120}$/.test(sessionId)) return null
  let newest = null, mtime = -Infinity
  const walk = async (dir, depth) => {
    let entries
    try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const path = join(dir, entry.name)
      if (depth < 3 && entry.isDirectory() && (depth === 0 ? /^\d{4}$/ : /^\d{2}$/).test(entry.name)) await walk(path, depth + 1)
      else if (depth === 3 && entry.isFile() && entry.name.startsWith('rollout-') && entry.name.endsWith('.jsonl') && entry.name.includes(sessionId)) {
        try { const info = await stat(path); if (info.mtimeMs > mtime) { newest = path; mtime = info.mtimeMs } } catch { /* Rotated during discovery. */ }
      }
    }
  }
  await walk(directory, 0)
  return newest
}

export function rolloutReader({ directory = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'sessions'),
  interval = 30_000, now = Date.now, locate = findRollout, read = readRolloutTail } = {}) {
  let cache
  return (id, force = false) => {
    if (!id) return Promise.resolve({})
    if (cache?.id !== id) cache = { id, path: null, readAt: -Infinity, pending: Promise.resolve({}) }
    const current = cache
    // No new observation: do not replay old rollout metadata over newer stdout events.
    if (!force && now() - current.readAt < interval) return Promise.resolve({})
    current.readAt = now()
    current.pending = current.pending.catch(() => ({})).then(async () => {
      try {
        current.path ??= await locate(directory, id)
        return current.path ? await read(current.path) : {}
      } catch { current.path = null; return {} }
    })
    return current.pending
  }
}

export function actionOf(item) {
  if (!item) return ''
  switch (item.type) {
    case 'command_execution': return commandAction(item.command)
    case 'file_change': return shortAction(`patching ${item.changes?.[0]?.path ?? 'files'}`)
    case 'mcp_tool_call': return shortAction(`calling ${item.server ?? ''}.${item.tool ?? ''}`)
    case 'reasoning': return shortAction(item.text)
    case 'web_search': return shortAction(`searching ${item.query ?? ''}`)
    case 'error':
    case 'warning': return shortAction(item.message)
    default: return ''
  }
}

export function applyEvent(previous, event) {
  if (!event || typeof event !== 'object') return previous
  const next = { ...previous }
  if (typeof event.model === 'string') next.model = bounded(event.model, 120)
  // exec versions may omit rate_limits altogether. Never infer plan usage.
  const limits = rateLimits(event.rate_limits)
  if (limits) next.rateLimits = limits
  if (event.type === 'thread.started' && typeof event.thread_id === 'string') next.sessionId = bounded(event.thread_id, 120)
  if (event.type === 'turn.started') { next.state = 'running'; next.action = 'starting turn'; next.turnStarted = true }
  if (['item.started', 'item.updated', 'item.completed'].includes(event.type) &&
      (previous.turnStarted || !['error', 'warning'].includes(event.item?.type))) next.action = actionOf(event.item) || next.action
  if (['error', 'warning'].includes(event.type) && previous.turnStarted) next.action = shortAction(event.message) || next.action
  if (event.type === 'turn.completed' && previous.state === 'running') {
    const usage = tokenUsage(event.usage)
    if (usage) next.totalTokenUsage = addUsage(previous.totalTokenUsage, usage)
    next.state = 'done'
    next.turnStarted = false
  }
  if (event.type === 'turn.failed') { next.state = 'failed'; next.turnStarted = false; next.action = shortAction(event.error?.message) || 'Codex failed' }
  return next
}

// A resume's exec usage is per turn. Start with the largest prior session snapshot,
// then add this invocation's turns. The panel counts that cumulative session once.
export async function previousSession(directory, sessionId, ownName) {
  let previous = null
  for (const name of await readdir(directory)) {
    if (!name.endsWith('.json') || name === `${ownName}.json`) continue
    try {
      const path = join(directory, name)
      if ((await stat(path)).size > STATUS_MAX_BYTES) continue
      const status = JSON.parse(await readFile(path, 'utf8'))
      if (status.version !== 1 || status.sessionId !== sessionId || !tokenUsage(status.totalTokenUsage)) continue
      const count = u => u.input_tokens + u.output_tokens
      if (!previous || count(status.totalTokenUsage) > count(previous.totalTokenUsage) ||
          (count(status.totalTokenUsage) === count(previous.totalTokenUsage) && status.updatedAt > previous.updatedAt)) {
        previous = { totalTokenUsage: tokenUsage(status.totalTokenUsage), model: bounded(status.model, 120),
          rateLimits: rateLimits(status.rateLimits), updatedAt: finite(status.updatedAt) ? status.updatedAt : 0 }
      }
    } catch { /* Another writer may still be creating its file. */ }
  }
  return previous
}

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

// Serialized writes coalesce busy event streams; an idle running process still
// publishes a heartbeat each second. EOF forces the final atomic snapshot.
export function statusWriter(write, interval = 1000, now = Date.now) {
  let pending, timer, chain = Promise.resolve(), last = -Infinity
  const flush = () => {
    if (!pending) return chain
    const snapshot = { ...pending, updatedAt: now() }
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

export async function runStatus(name, { directory = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'savvy-status'), model,
  input = process.stdin, output = process.stdout, interval = 1000, sessionsDirectory,
  metadata = rolloutReader({ directory: sessionsDirectory }) } = {}) {
  if (!validName(name)) throw new Error('status name must be 1–80 letters, digits, underscores or hyphens')
  await mkdir(directory, { recursive: true })
  const path = join(directory, `${name}.json`)
  const lock = await open(`${path}.lock`, 'wx')
  let heartbeat, interrupted = false, started = false
  let status = initialStatus(model)
  const writer = statusWriter(snapshot => atomicStatus(path, snapshot), interval)
  const stop = () => { interrupted = true; input.destroy() }
  const enrich = async (force = false) => {
    const id = status.sessionId
    if (!id) return
    const info = await metadata(id, force)
    if (status.sessionId === id) status = { ...status,
      ...(info.model ? { model: info.model } : {}), ...(info.rateLimits ? { rateLimits: info.rateLimits } : {}) }
  }
  try {
    try { await stat(path); throw new Error('pick a unique status name for every Codex invocation') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
    started = true
    writer.update(status)
    heartbeat = setInterval(() => {
      if (status.state === 'running') { writer.update(status); void enrich().catch(() => {}) }
    }, interval)
    process.once('SIGINT', stop); process.once('SIGTERM', stop)
    const lines = createInterface({ input, crlfDelay: Infinity })
    for await (const line of lines) {
      if (output && !output.write(line + '\n')) await new Promise(resolve => output.once('drain', resolve))
      let event
      try { event = JSON.parse(line) } catch { continue }
      const beforeId = status.sessionId
      status = applyEvent(status, event)
      if (status.sessionId && status.sessionId !== beforeId) {
        const previous = await previousSession(directory, status.sessionId, name)
        if (previous) status = { ...status, totalTokenUsage: previous.totalTokenUsage,
          rateLimits: status.rateLimits ?? previous.rateLimits, model: status.model ?? previous.model }
        void enrich().catch(() => {})
      }
      writer.update(status)
    }
  } finally {
    clearInterval(heartbeat)
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop)
    if (status.state === 'running') status = { ...status, state: 'failed', action: interrupted ? 'Codex interrupted' : 'Codex stream ended before completion' }
    try {
      if (started) { await enrich(true).catch(() => {}); await writer.close(status) }
    } finally { await lock.close(); await unlink(`${path}.lock`).catch(() => {}) }
  }
  return status
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runStatus(process.argv[2], { model: process.argv[3] }).then(status => { if (status.state === 'failed') process.exitCode = 1 })
    .catch(error => { console.error(`codex-status: ${error.message}`); process.exitCode = 1 })
}
