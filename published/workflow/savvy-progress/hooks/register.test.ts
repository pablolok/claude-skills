import type { AgentInfo, CommandRunInput, ConfigSetInput, On, UiFocusInput } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { AgentRun, Flow } from '../types'
import { costOf, fmtTokens, themeNamed, windowOf } from './register'
import { pixels } from './sprite'
import { DRESSES, FLURRY_MS, THEMES, THEME_CSS, easter, themeOf, themeOn } from './themes'

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
  const reads: string[] = []
  on('state.get', ($, e) => {
    reads.push(e.key)
    return { value: values.get(e.key) ?? { value: undefined, version: 0 } }
  })
  const written: string[] = []
  on('state.set', ($, e) => {
    written.push(e.key)
    const version = versionOf(e.key)
    if (e.ifVersion !== undefined && e.ifVersion !== version) return { value: { isSet: false, version } }
    values.set(e.key, { value: e.value, version: version + 1 })
    return { value: { isSet: true, version: version + 1 } }
  })
  return {
    seed: (key: string, value: unknown): void => void values.set(key, { value, version: versionOf(key) + 1 }),
    // Every key the plugin read, and wrote, in order.
    reads,
    written,
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
  // What the plugin saved in `/config` and told the model, in order.
  const saved: { key: string; value: unknown }[] = []
  const told: string[] = []
  on('config.set', ($, e) => {
    saved.push({ key: e.key, value: e.value })
    return { value: e.value }
  })
  on('session.append', ($, e, next) => {
    for (const block of e.message.content) if (block.type === 'text') told.push(String(block.text))
    return next(e)
  })
  return { clock, state, asks: (): number => asks, saved, told }
}

// The person typing `/savvy-theme <args>`, and picking `value` for the theme in /config.
const typed = (args: string): CommandRunInput =>
  ({ command: 'savvy-theme', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } })
const picked = (value: string): ConfigSetInput =>
  ({ key: 'savvy-progress.theme', value, previous: 'classic', provider: { plugin: 'savvy-progress', tier: 'user' }, origin: { kind: 'composer' } })

// The person clicking an element of the agents panel, which moves its focus ring there.
const clicked = (element: string): UiFocusInput =>
  ({ component: 'Pane', requestId: 'savvy-agents', plugin: 'savvy-progress', element, origin: { kind: 'person' } })

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

test('the calendar picks the holiday first, then the period, then the season', () => {
  const on = (y: number, m: number, d: number): string => themeOn(new Date(y, m - 1, d, 12).getTime())
  // Winter and the Christmas season, its days on top.
  expect(on(2026, 12, 1)).toBe('winter')
  expect(on(2026, 12, 7)).toBe('winter')
  expect(on(2026, 12, 8)).toBe('immaculate')
  expect(on(2026, 12, 9)).toBe('christmas')
  expect(on(2026, 12, 24)).toBe('christmas-eve')
  expect(on(2026, 12, 25)).toBe('christmas-day')
  expect(on(2026, 12, 26)).toBe('st-stephen')
  expect(on(2026, 12, 27)).toBe('christmas')
  expect(on(2026, 12, 31)).toBe('new-years-eve')
  expect(on(2027, 1, 1)).toBe('new-year')
  expect(on(2027, 1, 2)).toBe('christmas')
  expect(on(2027, 1, 6)).toBe('befana')
  expect(on(2027, 1, 7)).toBe('winter-sales')
  expect(on(2027, 1, 20)).toBe('winter-sales')
  expect(on(2027, 1, 21)).toBe('winter')
  // Shrove Tuesday 2026 is February 17: the twelve days up to it, Valentine's Day on top.
  expect(on(2026, 2, 5)).toBe('winter')
  expect(on(2026, 2, 6)).toBe('carnival')
  expect(on(2026, 2, 14)).toBe('valentine')
  expect(on(2026, 2, 17)).toBe('carnival')
  expect(on(2026, 2, 18)).toBe('winter')
  expect(on(2024, 2, 29)).toBe('winter')
  expect(on(2026, 3, 1)).toBe('spring')
  expect(on(2026, 3, 8)).toBe('womens-day')
  expect(on(2026, 3, 19)).toBe('fathers-day')
  // Easter 2026 is April 5: the holidays from Holy Thursday to Easter Tuesday.
  expect(on(2026, 4, 1)).toBe('spring')
  expect(on(2026, 4, 2)).toBe('easter-holidays')
  expect(on(2026, 4, 5)).toBe('easter')
  expect(on(2026, 4, 6)).toBe('easter')
  expect(on(2026, 4, 7)).toBe('easter-holidays')
  expect(on(2026, 4, 8)).toBe('spring')
  // Easter Sunday 2038 is April 25: Easter wins over Liberation Day.
  expect(on(2038, 4, 25)).toBe('easter')
  expect(on(2026, 4, 25)).toBe('liberation')
  expect(on(2026, 5, 1)).toBe('labour-day')
  expect(on(2026, 5, 10)).toBe('mothers-day')
  expect(on(2026, 5, 17)).toBe('spring')
  expect(on(2026, 5, 31)).toBe('spring')
  expect(on(2026, 6, 1)).toBe('summer')
  expect(on(2026, 6, 2)).toBe('republic-day')
  expect(on(2026, 6, 30)).toBe('summer')
  // July 2026 starts on a Wednesday: the sales run from Saturday the 4th for two weeks.
  expect(on(2026, 7, 3)).toBe('summer-holidays')
  expect(on(2026, 7, 4)).toBe('summer-sales')
  expect(on(2026, 7, 17)).toBe('summer-sales')
  expect(on(2026, 7, 18)).toBe('summer-holidays')
  expect(on(2026, 8, 15)).toBe('ferragosto')
  expect(on(2026, 8, 31)).toBe('summer-holidays')
  expect(on(2026, 9, 1)).toBe('back-to-school')
  expect(on(2026, 9, 14)).toBe('back-to-school')
  expect(on(2026, 9, 15)).toBe('autumn')
  expect(on(2026, 10, 30)).toBe('autumn')
  expect(on(2026, 10, 31)).toBe('halloween')
  expect(on(2026, 11, 1)).toBe('all-saints')
  expect(on(2026, 11, 2)).toBe('all-souls')
  expect(on(2026, 11, 3)).toBe('autumn')
  // Black Friday follows the fourth Thursday: November 27 in 2026, the 29th (not the 22nd) in 2024.
  expect(on(2026, 11, 27)).toBe('black-friday')
  expect(on(2024, 11, 22)).toBe('autumn')
  expect(on(2024, 11, 29)).toBe('black-friday')
  expect(on(2026, 11, 30)).toBe('autumn')
})

test('the option pins a theme; auto and an unknown value follow the calendar', () => {
  const halloween = new Date(2026, 9, 31, 12).getTime()
  const june = new Date(2026, 5, 1, 12).getTime()
  expect(themeOf('auto', halloween)).toBe('halloween')
  expect(themeOf('auto', june)).toBe('summer')
  expect(themeOf('nonsense', june)).toBe('summer')
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

test('every theme dresses all seven figures, each its own, and gives every prop a motion', () => {
  const FIGURES = ['fable', 'heavy', 'careful', 'medium', 'light', 'explore', 'other']
  // The body and its legs, and the spider's thread, which hangs still.
  const BODY = new Set(['bd', 'la', 'lb', 'thr'])
  const dresses = Object.entries(DRESSES)
  expect(dresses.map(([theme]) => theme).sort()).toEqual(THEMES.filter(t => t !== 'classic').sort())
  expect(new Set(dresses.map(([, d]) => d.prefix)).size).toBe(dresses.length)
  const faults: string[] = []
  for (const [theme, dress] of dresses) {
    const css = THEME_CSS + dress.css
    const drawn = (figure: string): Map<string, string[]> => {
      const { f, groups } = pixels()
      dress.costumes[figure]?.(f, '#888780')
      return groups
    }
    const other = JSON.stringify([...drawn('other')])
    for (const figure of FIGURES) {
      const groups = drawn(figure)
      const props = [...groups.keys()].flatMap(cls => cls.split(' ')).filter(cls => !BODY.has(cls))
      if ((groups.get('bd') ?? []).length === 0) faults.push(`${theme} ${figure}: draws nothing`)
      if (figure !== 'other' && JSON.stringify([...groups]) === other) faults.push(`${theme} ${figure}: wears other's costume`)
      // A prop in a group of its own moves: some rule of the theme names its class.
      for (const cls of props) if (!css.includes(`.${cls.replace(/^fx\d$/, 'fx')}`)) faults.push(`${theme} ${figure}: .${cls} has no motion`)
      // With no prop, nor particles, the figure moves by a rule of its own.
      if (props.length === 0 && !css.includes(`.c-${dress.prefix}-${figure}`)) faults.push(`${theme} ${figure}: stands still`)
    }
  }
  expect(faults).toEqual([])
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

test('in winter, now and then, snow falls over the header, beneath its title and tiles', { options: { theme: 'winter' } }, async ($, on) => {
  const { state } = engine(on, { infos: [info('w1', 'running')] })
  await start($)

  const rows = await drawn($, state)
  const header = rows.header ?? ''

  expect(header).toContain('class="fl fl0"')
  // Drawn first, so the title, the ornament and the tiles paint over the flakes.
  expect(header.indexOf('class="fl fl0"')).toBeLessThan(header.indexOf('<text'))
  expect(header.indexOf('class="fl fl0"')).toBeLessThan(header.indexOf('class="tile"'))
  expect(header).toContain('.fl{opacity:0;animation:flurry 30s')
  // Reduced motion stops it, and a stopped flake stays unseen.
  expect(header).toContain('.fl{animation:none!important}')
  // Only the header snows: the rows keep their own figures.
  expect(rows.running).not.toContain('class="fl ')
})

test('the flurry goes on where it was when the header is redrawn a second later', () => {
  const at = (ms: number): string => DRESSES.winter.weather?.(40, 300, ms) ?? ''

  expect(at(1000)).toContain('.fl.fl0{animation-delay:-1000ms}')
  expect(at(2000)).toContain('.fl.fl0{animation-delay:-2000ms}')
  expect(at(2000)).toContain('.fl.fl1{animation-delay:-600ms}')
  expect(at(FLURRY_MS + 1000)).toBe(at(1000))
})

test('the flurry keeps to the free band, and a band too narrow stays clear', () => {
  // Each flake's left edge and the scale it is drawn at, three pixels wide at most.
  const flakes = (from: number, to: number): number[][] =>
    [...(DRESSES.winter.weather?.(from, to, 0) ?? '').matchAll(/translate\((\d+),-6\) scale\((\d)\)/g)].map(m => [Number(m[1]), Number(m[2])])

  expect(flakes(100, 120)).toEqual([])
  const drawn = flakes(100, 300)
  expect(drawn.length).toBe(7)
  expect(Math.min(...drawn.map(([x]) => x ?? 0))).toBeGreaterThanOrEqual(100)
  expect(Math.max(...drawn.map(([x, k]) => (x ?? 0) + 3 * (k ?? 1)))).toBeLessThanOrEqual(300)
})

test('no other theme snows over the header, nor winter without a flow title', { options: { theme: 'winter' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(FLOW, null)

  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const [header] = (await ui.findAll({ type: 'Svg' })).map(e => String(e.props.source))
  await ui.unmount()

  expect(header ?? '').not.toContain('class="fl ')
  expect(Object.entries(DRESSES).filter(([, d]) => d?.weather).map(([k]) => k)).toEqual(['winter'])
})

// The crabs' costume classes in the mounted panel, read off its rows' drawings.
const costumes = async (ui: { findAll: (q: { type: string }) => Promise<{ props: Record<string, unknown> }[]> }): Promise<string> =>
  (await ui.findAll({ type: 'Svg' })).map(e => String(e.props.source)).join('')

test('a theme is named by its id or its Italian name, any case, spaces or accents', () => {
  expect(themeNamed('carnival')).toBe('carnival')
  expect(themeNamed('  AUTO ')).toBe('auto')
  expect(themeNamed('Festa del Papà')).toBe('fathers-day')
  expect(themeNamed('Vigilia di Natale')).toBe('christmas-eve')
  expect(themeNamed('natale')).toBe('christmas-day')
  expect(themeNamed('periodo natalizio')).toBe('christmas')
  expect(themeNamed("women's day")).toBe('womens-day')
  expect(themeNamed('easter_holidays')).toBe('easter-holidays')
  expect(themeNamed('nonsense')).toBeUndefined()
})

test('/savvy-theme redraws the panel at once and keeps the pick in the option', { options: { theme: 'classic' } }, async ($, on) => {
  const { state, saved, told } = engine(on, { infos: [info('w1', 'running')] })
  await start($)
  state.seed(AGENTS, [run('w1')])
  state.seed(FLOW, flowOf())
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await costumes(ui)).toContain('class="c-careful run"')

  const { text } = await $.command.run(typed('Carnevale'))

  expect(text).toContain('Carnival')
  expect(await costumes(ui)).toContain('class="c-cv-careful run"')
  expect(saved).toEqual([{ key: 'savvy-progress.theme', value: 'carnival' }])
  // The model saw the command and its answer: nothing more to tell it.
  expect(told).toEqual([])
  await ui.unmount()
})

test('/savvy-theme with no name lists every theme; an unknown name changes nothing', { options: { theme: 'classic' } }, async ($, on) => {
  const { saved } = engine(on, { infos: [] })
  await start($)

  const listed = await $.command.run(typed(''))
  const unknown = await $.command.run(typed('midsummer'))

  expect(listed.text).toContain('Theme: Classic')
  expect(listed.text).toContain('auto — ')
  expect(listed.text).toContain('black-friday — Black Friday')
  expect(listed.text).toContain('st-stephen — ')
  expect(unknown.text).toContain('No theme named "midsummer"')
  expect(saved).toEqual([])
})

test("the panel's picker lists every theme and a pick redraws it at once", { options: { theme: 'auto' } }, async ($, on) => {
  const { state, saved, told } = engine(on, { infos: [info('w1', 'running')] })
  await start($)
  state.seed(AGENTS, [run('w1')])
  state.seed(FLOW, flowOf())
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const [picker] = await ui.findAll({ type: 'Select' })
  const options = (picker?.props.options ?? []) as { value: string; label?: string }[]
  expect(picker?.props.value).toBe('auto')
  expect(options.map(o => o.value)).toContain('ferragosto')
  expect(options).toHaveLength(33)
  expect(options[0]?.label).toContain('Auto, by the calendar')

  await ui.select({ key: 'theme', value: 'halloween' })

  expect(await costumes(ui)).toContain('class="c-hw-careful run"')
  expect(saved).toEqual([{ key: 'savvy-progress.theme', value: 'halloween' }])
  // A pick the model did not see is told to it, so the chat can follow.
  expect(told.join('')).toContain('the theme is now Halloween')
  await ui.unmount()
})

// What the agents panel shows now: a fresh drawing beside the mounted one, as the
// kit's state, beneath the plugin, redraws nothing by itself. Handlers get new
// handles on every drawing; what is shown is what counts.
const panelNow = async ($: Engine): Promise<string> => {
  const again = await $.ui.mount({ ...PANE, surface: 'vscode' })
  const tree = JSON.stringify(await again.drawn()).replace(/"handle":\d+/g, '')
  await again.unmount()
  return tree
}

test('the panel draws a copy the tick refreshes, never the live values', { options: { theme: 'auto' } }, async ($, on) => {
  const { clock, state } = engine(on, { infos: [info('w1', 'running')] })
  await start($)
  state.seed(AGENTS, [run('w1', { startedAt: 10_000 })])
  await clock.advance(1000)
  const before = await panelNow($)

  state.seed(AGENTS, [run('w1', { startedAt: 10_000, tokens: 90_000 })])
  expect(await panelNow($)).toBe(before)
  await clock.advance(1000)
  expect(await panelNow($)).toContain('90k')
})

test('the theme picker taking the focus holds the panel still, writing only what no drawing reads, so the open list stays put', { options: { theme: 'auto' } }, async ($, on) => {
  const { clock, state } = engine(on, { infos: [info('w1', 'running')] })
  // The surface: the ring moves where it is asked.
  on('ui.focus', () => ({}))
  await start($)
  state.seed(AGENTS, [run('w1', { startedAt: 10_000 })])
  state.seed(FLOW, flowOf())
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await clock.advance(1000)
  const before = await panelNow($)

  // A drawing redraws when what it read changes, and a redraw sends the open list
  // back: the hold is written where no drawing reads.
  const reads = state.reads.length
  await panelNow($)
  expect(state.reads.slice(reads)).not.toContain('picking')
  const writes = state.written.length
  await $.ui.focus(clicked('theme'))
  expect(state.written.slice(writes)).toEqual(['picking'])
  state.seed(AGENTS, [run('w1', { startedAt: 10_000, tokens: 90_000 })])
  await clock.advance(3000)
  expect(state.written.slice(writes)).not.toContain('shown')
  expect(await panelNow($)).toBe(before)

  // The focus moving on lets the panel catch up at once.
  await $.ui.focus(clicked('compact'))
  expect(await panelNow($)).toContain('90k')
  await ui.unmount()
})

test('a pick redraws the held panel in the new theme, and the hold outlives the reload the pick causes', { options: { theme: 'auto' } }, async ($, on) => {
  const { clock, state } = engine(on, { infos: [info('w1', 'running')] })
  on('ui.focus', () => ({}))
  await start($)
  state.seed(AGENTS, [run('w1', { startedAt: 10_000 })])
  state.seed(FLOW, flowOf())
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await clock.advance(1000)

  await $.ui.focus(clicked('theme'))
  await ui.select({ key: 'theme', value: 'halloween' })
  expect(await costumes(ui)).toContain('class="c-hw-careful run"')

  // The option's change restarts the plugin; the focus is still on the picker, so
  // the panel stays held, a minute later too.
  await start($)
  state.seed(AGENTS, [run('w1', { startedAt: 10_000, tokens: 90_000 })])
  await clock.advance(61_000)
  expect(await panelNow($)).not.toContain('90k')
  await ui.unmount()
})

test('a focus that never comes back lets the panel go after five minutes', { options: { theme: 'auto' } }, async ($, on) => {
  const { clock, state } = engine(on, { infos: [info('w1', 'running')] })
  on('ui.focus', () => ({}))
  await start($)
  state.seed(AGENTS, [run('w1', { startedAt: 10_000 })])
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await clock.advance(1000)

  await $.ui.focus(clicked('theme'))
  state.seed(AGENTS, [run('w1', { startedAt: 10_000, tokens: 90_000 })])
  await clock.advance(4 * 60_000)
  expect(await panelNow($)).not.toContain('90k')
  await clock.advance(60_000)
  expect(await panelNow($)).toContain('90k')
  await ui.unmount()
})

test('a pick in /config redraws the panel too', { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [info('w1', 'running')] })
  await start($)
  state.seed(AGENTS, [run('w1')])
  state.seed(FLOW, flowOf())
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })

  await $.config.set(picked('winter'))

  expect(await costumes(ui)).toContain('class="c-wi-careful run"')
  await ui.unmount()
})

// The bar above the prompt on the desktop, as its drawing's alt reads it: `title: label, percent`.
const bar = async ($: Engine): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'savvy-progress', component: 'AbovePrompt', surface: 'desktop', props: { bodyColumns: 100, hasSurvey: false } })
  const [row] = await ui.findAll({ type: 'Svg' })
  await ui.unmount()
  return String(row?.props.alt)
}

test('the bar says an agent outside the plan is running, as the panel does, and never 100% while it runs', async ($, on) => {
  const listed = { infos: [] as AgentInfo[] }
  const { clock, state } = engine(on, listed, 0)
  await start($)
  const progress = (input: Record<string, unknown>) => $.tool.call({ tool: 'mcp__savvy-progress__progress', title: 'About', ...input })
  await progress({ total: 1, tasks: [{ title: 'Foundations', tier: 'careful' }], phase: 'delegate' })
  await spawn($, 'Foundations')
  listed.infos = [info('Foundations', 'completed')]
  await clock.advance(5000)
  await progress({ done: 1, total: 1, tasks: [], phase: 'review' })
  expect(await bar($)).toBe('About: Review 1/1, 100%')

  // A review of the diff: an agent of no tier, not a task of the plan.
  await spawn($, 'Review of the diff', 'code-reviewer')
  listed.infos = [info('Foundations', 'completed'), info('Review of the diff', 'running')]
  expect(await bar($)).toBe('About: Review 1/1 · 1 running, 99%')
  expect((await progress({ phase: 'review' })).result).toBe('ok: Review 1/1 · 1 running')
  // The faint layer still counts the plan's workers alone.
  expect(state.flow()?.running).toBe(0)

  listed.infos = [info('Foundations', 'completed'), info('Review of the diff', 'completed')]
  await clock.advance(5000)
  expect(await bar($)).toBe('About: Review 1/1, 100%')
  await progress({ finished: true })
  expect(await bar($)).toBe('About: Done, 100%')
})

test("the bar's running count is every run the panel lists as running, the plan's workers too", async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  await report($)
  await spawn($, 'w1')
  await spawn($, 'e1', 'Explore')

  expect(state.flow()?.running).toBe(1)
  expect(await bar($)).toBe('Fix bug: Tasks 0/2 · 2 running, 0%')
})
