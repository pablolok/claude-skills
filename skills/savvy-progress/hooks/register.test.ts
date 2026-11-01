import type { AgentInfo, On } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { AgentRun, Flow } from '../types'
import { costOf, fmtTokens, windowOf } from './register'
import { easter, themeOf, themeOn } from './themes'

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

test('token counts show the unit they round to', () => {
  expect(fmtTokens(950)).toBe('950')
  expect(fmtTokens(999.6)).toBe('1k')
  expect(fmtTokens(999_499)).toBe('999k')
  expect(fmtTokens(999_500)).toBe('1.0M')
  expect(fmtTokens(1_250_000)).toBe('1.3M')
})

test('Haiku 5.5 is priced and sized as itself, not as Haiku 4.5', () => {
  const million = { input_tokens: 1e6, output_tokens: 1e6, cache_read_input_tokens: 1e6, cache_creation_input_tokens: 1e6 }
  expect(Math.round(costOf('claude-haiku-5-5', million) * 1000)).toBe(735)
  expect(Math.round(costOf('claude-haiku-4-5', million) * 1000)).toBe(7350)
  expect(windowOf('claude-haiku-5-5')).toBe(1_000_000)
  expect(windowOf('claude-haiku-4-5')).toBe(200_000)
  expect(windowOf('claude-opus-5-5')).toBe(1_000_000)
})

test('Easter falls where the calendar puts it', () => {
  expect(easter(2026)).toEqual([4, 5])
  expect(easter(2027)).toEqual([3, 28])
  expect(easter(2038)).toEqual([4, 25])
})

test('the calendar picks the holiday first, then the season', () => {
  const on = (y: number, m: number, d: number): string => themeOn(new Date(y, m - 1, d, 12).getTime())
  expect(on(2026, 12, 1)).toBe('christmas')
  expect(on(2026, 12, 25)).toBe('christmas')
  expect(on(2027, 1, 2)).toBe('christmas')
  expect(on(2027, 1, 3)).toBe('befana')
  expect(on(2027, 1, 6)).toBe('befana')
  expect(on(2027, 1, 7)).toBe('winter')
  // Shrove Tuesday 2026 is February 17: the twelve days up to it.
  expect(on(2026, 2, 5)).toBe('winter')
  expect(on(2026, 2, 6)).toBe('carnival')
  expect(on(2026, 2, 17)).toBe('carnival')
  expect(on(2026, 2, 18)).toBe('winter')
  // Easter 2026 is April 5: Palm Sunday to Easter Monday.
  expect(on(2026, 3, 28)).toBe('spring')
  expect(on(2026, 3, 29)).toBe('easter')
  expect(on(2026, 4, 6)).toBe('easter')
  expect(on(2026, 4, 7)).toBe('spring')
  expect(on(2026, 3, 20)).toBe('winter')
  expect(on(2026, 3, 21)).toBe('spring')
  expect(on(2026, 6, 21)).toBe('summer')
  expect(on(2026, 9, 22)).toBe('summer')
  expect(on(2026, 9, 23)).toBe('autumn')
  expect(on(2026, 10, 14)).toBe('autumn')
  expect(on(2026, 10, 15)).toBe('halloween')
  expect(on(2026, 11, 7)).toBe('halloween')
  expect(on(2026, 11, 8)).toBe('autumn')
  expect(on(2026, 12, 21)).toBe('christmas')
})

test('the option pins a theme; auto and an unknown value follow the calendar', () => {
  const halloween = new Date(2026, 9, 31, 12).getTime()
  const june = new Date(2026, 5, 1, 12).getTime()
  expect(themeOf('auto', halloween)).toBe('halloween')
  expect(themeOf('auto', june)).toBe('spring')
  expect(themeOf('nonsense', june)).toBe('spring')
  expect(themeOf('christmas', june)).toBe('christmas')
  expect(themeOf('classic', halloween)).toBe('classic')
})

const PANE = {
  plugin: 'savvy-progress',
  component: 'Pane',
  requestId: 'savvy-agents',
  props: { title: 'Agents', isFocused: false, bodyColumns: 60, placement: 'dock', scroll: { offset: 0, bodyRows: 40 }, view: {} },
} as const

// The panel's crabs on the desktop, one costume class per row, read off each row's drawing.
const drawn = async ($: Engine, state: ReturnType<typeof store>): Promise<Record<string, string>> => {
  state.seed(AGENTS, [run('w1'), run('w2', { type: 'savvy-flow:savvy-heavy', status: 'done', endedAt: 5 })])
  state.seed(FLOW, flowOf({ tasks: [{ title: 'later', tier: 'medium', after: [] }] }))
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  // A key never reaches the drawing: the rows come in order, after the header.
  const [header, running, finished, planned] = (await ui.findAll({ type: 'Svg' })).map(e => String(e.props.source))
  await ui.unmount()
  return { header: header ?? '', running: running ?? '', finished: finished ?? '', planned: planned ?? '' }
}

test('in Halloween every crab wears a costume and moves, running or not', { options: { theme: 'halloween' } }, async ($, on) => {
  const { state } = engine(on, { infos: [info('w1', 'running')] })
  await start($)

  const rows = await drawn($, state)

  expect(rows.running).toContain('class="c-hw-careful run"')
  expect(rows.finished).toContain('class="c-hw-heavy idle"')
  expect(rows.planned).toContain('class="c-hw-medium idle"')
  expect(rows.running).toContain('@keyframes drop')
  expect(rows.header).toContain('class="web"')
})

test('the classic theme keeps the crabs as they were', { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [info('w1', 'running')] })
  await start($)

  const rows = await drawn($, state)

  expect(rows.running).toContain('class="c-careful run"')
  expect(rows.finished).toContain('class="c-heavy"')
  expect(rows.planned).toContain('class="c-medium"')
  expect(Object.values(rows).join('')).not.toContain('hw-')
})

test('a season dresses each tier for its own job, in its color, and every figure moves', { options: { theme: 'winter' } }, async ($, on) => {
  const { state } = engine(on, { infos: [info('w1', 'running')] })
  await start($)

  const rows = await drawn($, state)

  expect(rows.running).toContain('class="c-wi-careful run"')
  expect(rows.finished).toContain('class="c-wi-heavy idle"')
  expect(rows.planned).toContain('class="c-wi-medium idle"')
  // Careful knits in its amber, Heavy wears its red fur hat; each its own costume.
  expect(rows.running).toContain('fill="#BA7517"')
  expect(rows.finished).toContain('fill="#D85A30"')
  expect(rows.header).toContain('class="orn o-flake"')
  expect(rows.running).toContain('class="ball"')
  expect(rows.finished).toContain('class="bob"')
})
