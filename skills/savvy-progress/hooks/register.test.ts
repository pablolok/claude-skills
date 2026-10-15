import type { AgentInfo, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { AgentRun, Flow } from '../types'

const AGENTS = 'agents'
const FLOW = 'flow'

const run = (id: string, over: Partial<AgentRun> = {}): AgentRun => ({
  id,
  agentId: id,
  type: 'savvy-flow:savvy-careful',
  description: `task ${id}`,
  model: 'claude-opus-5-5',
  status: 'running',
  startedAt: 0,
  contextTokens: 0,
  contextMax: 1_000_000,
  tokens: 0,
  costUsd: 0,
  steps: 0,
  round: 1,
  ...over,
})

const flowOf = (over: Partial<Flow> = {}): Flow => ({
  title: 'Fix bug',
  total: 2,
  done: 0,
  running: 0,
  phase: 'delegate',
  isFinished: false,
  tasks: [],
  ...over,
})

// The plugin's state, held beneath it: seeded by the test and read back by it.
const store = (on: On) => {
  const values = new Map<string, { value: unknown; version: number }>()
  const versionOf = (key: string): number => values.get(key)?.version ?? 0
  on('state.get', ($, e) => ({ value: values.get(e.key) ?? { value: undefined, version: 0 } }))
  on('state.set', ($, e) => {
    const version = versionOf(e.key)
    if (e.ifVersion !== undefined && e.ifVersion !== version) return { value: { isSet: false, version } }
    values.set(e.key, { value: e.value, version: version + 1 })
    return { value: { isSet: true, version: version + 1 } }
  })
  return {
    seed: (key: string, value: unknown): void => void values.set(key, { value, version: versionOf(key) + 1 }),
    agents: (): AgentRun[] => (values.get(AGENTS)?.value ?? []) as AgentRun[],
    flow: (): Flow | null | undefined => values.get(FLOW)?.value as Flow | null | undefined,
  }
}

// The engine beneath the plugin: what its session.start and its hooks call on `$`.
const engine = (on: On, listed: { infos: AgentInfo[] }, now = 10_000) => {
  const clock = mock.clock(on, { now })
  const state = store(on)
  mock.env(on, {})
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('settings.read', () => ({ value: {} }))
  on('tool.register', ($, e) => ({ value: { tool: `mcp__savvy-progress__${e.name}` } }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  let asks = 0
  on('agent.list', () => {
    asks++
    return { value: listed.infos }
  })
  on('agent.spawn', ($, e) => ({ model: 'claude-opus-5-5', agentId: e.description }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.panes', () => ({ value: [] }))
  return { clock, state, asks: (): number => asks }
}

const info = (id: string, status: AgentInfo['status']): AgentInfo => ({ id, status, description: id, type: 'savvy-flow:savvy-careful' })

const start = ($: Engine) => $.session.start({ cwd: '/tmp/project', surface: 'terminal', isInteractive: true })

const report = ($: Engine) => $.tool.call({ tool: 'mcp__savvy-progress__progress', title: 'Fix bug', total: 2, phase: 'delegate' })

const spawn = ($: Engine, agentId: string, subagentType = 'savvy-flow:savvy-careful') =>
  $.agent.spawn({
    tool_use_id: `toolu_${agentId}`,
    prompt: 'Do the task.',
    description: agentId,
    subagentType,
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background: true,
    fork: false,
  })

const byId = (list: AgentRun[], id: string): AgentRun | undefined => list.find(a => a.id === id)

test('session.start settles runs the engine no longer runs, by its agents list', async ($, on) => {
  const listed = { infos: [info('killed', 'killed'), info('completed', 'completed'), info('idle', 'idle'), info('live', 'running')] }
  const { state } = engine(on, listed)
  state.seed(AGENTS, [
    run('ghost'),
    run('killed'),
    run('completed'),
    run('idle'),
    run('live'),
    run('no-id', { agentId: undefined }),
    run('old', { status: 'done', endedAt: 5 }),
  ])
  state.seed(FLOW, flowOf({ running: 5 }))

  await start($)

  const list = state.agents()
  expect(byId(list, 'ghost')).toMatchObject({ status: 'failed', endedAt: 10_000 })
  expect(byId(list, 'killed')).toMatchObject({ status: 'failed', endedAt: 10_000 })
  expect(byId(list, 'completed')).toMatchObject({ status: 'done', endedAt: 10_000 })
  expect(byId(list, 'idle')).toMatchObject({ status: 'done', endedAt: 10_000 })
  expect(byId(list, 'no-id')).toMatchObject({ status: 'failed', endedAt: 10_000 })
  expect(byId(list, 'live')?.status).toBe('running')
  expect(byId(list, 'live')?.endedAt).toBeUndefined()
  expect(byId(list, 'old')).toMatchObject({ status: 'done', endedAt: 5 })
  // The bar's running count is the runs that still run, not a counter that drifted.
  expect(state.flow()?.running).toBe(1)
})

test('session.start drops a finished flow and keeps its runs', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('old', { status: 'done', endedAt: 5 })])
  state.seed(FLOW, flowOf({ isFinished: true, phase: 'close', done: 2 }))

  await start($)

  expect(state.flow()).toBeNull()
  expect(state.agents()).toEqual([run('old', { status: 'done', endedAt: 5 })])
})

test('session.start keeps a flow still under way', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(FLOW, flowOf())

  await start($)

  expect(state.flow()).toEqual(flowOf())
})

test('a run started as the list is asked for is not judged by it', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('fresh', { startedAt: 10_000 })])

  await start($)

  expect(byId(state.agents(), 'fresh')?.status).toBe('running')
})

test('a plugin-prefixed savvy worker counts as running, and the tick settles it once the engine killed it', async ($, on) => {
  const listed = { infos: [] as AgentInfo[] }
  const { clock, state } = engine(on, listed, 0)
  await start($)
  await report($)

  await spawn($, 'w1')
  listed.infos = [info('w1', 'running')]
  expect(byId(state.agents(), 'w1')?.status).toBe('running')
  expect(state.flow()?.running).toBe(1)

  // Still running at the next check: nothing changes.
  await clock.advance(5000)
  expect(byId(state.agents(), 'w1')?.status).toBe('running')
  expect(state.flow()?.running).toBe(1)

  listed.infos = [info('w1', 'killed')]
  await clock.advance(5000)
  expect(byId(state.agents(), 'w1')).toMatchObject({ status: 'failed', endedAt: 10_000 })
  expect(state.flow()?.running).toBe(0)
})

test('a completed worker the tick finds turns done', async ($, on) => {
  const listed = { infos: [] as AgentInfo[] }
  const { clock, state } = engine(on, listed, 0)
  await start($)
  await report($)
  await spawn($, 'w1')
  listed.infos = [info('w1', 'completed')]

  await clock.advance(5000)

  expect(byId(state.agents(), 'w1')).toMatchObject({ status: 'done', endedAt: 5000 })
  expect(state.flow()?.running).toBe(0)
})

test('the tick fails a run the engine no longer lists', async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0)
  await start($)
  await report($)
  await clock.advance(1000)
  await spawn($, 'w1')
  expect(state.flow()?.running).toBe(1)

  await clock.advance(4000)

  expect(byId(state.agents(), 'w1')).toMatchObject({ status: 'failed', endedAt: 5000 })
  expect(state.flow()?.running).toBe(0)
})

test('the tick asks for the list about every five seconds, not every second', async ($, on) => {
  const listed = { infos: [] as AgentInfo[] }
  const { clock, asks } = engine(on, listed, 0)
  await start($)
  await spawn($, 'w1')
  listed.infos = [info('w1', 'running')]
  const before = asks()

  await clock.advance(4000)
  expect(asks() - before).toBe(0)
  await clock.advance(1000)
  expect(asks() - before).toBe(1)
  await clock.advance(5000)
  expect(asks() - before).toBe(2)
})

test('a workflow agent is never failed for missing from the list', async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0)
  await start($)
  state.seed(AGENTS, [run('wf', { isWorkflow: true })])

  await clock.advance(6000)

  expect(byId(state.agents(), 'wf')?.status).toBe('running')
})

test('a non-savvy worker is listed but not counted on the bar', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  await report($)

  await spawn($, 'e1', 'Explore')

  expect(byId(state.agents(), 'e1')?.status).toBe('running')
  expect(state.flow()?.running).toBe(0)
})

test('an Agent call for a plugin-prefixed savvy type starts the flow', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  on('tool.call', { tool: 'Agent' }, () => ({ result: { status: 'async_launched' } }))
  await start($)

  await $.tool.call({ tool: 'Agent', description: 'w1', prompt: 'Do it.', subagent_type: 'savvy-flow:savvy-careful' })

  expect(state.flow()).toMatchObject({ title: 'savvy-flow', phase: 'delegate', running: 0 })
})
