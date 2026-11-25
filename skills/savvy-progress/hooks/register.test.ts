import type { AgentInfo, CommandRunInput, ConfigSetInput, EngineInterface, On, SessionRateLimit, UiFocusInput } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'

import type { AgentRun, Flow, PlanUsage, UsageReadings } from '../types'
import { budgetGate, budgetSummary, fitGate, planGate, clearFinished, decideBudget, projectPlanWindow, recordPlanUsage, tierEstimates, topTierGate } from './register'
import { activityOf, textWidth, planTile, formatPlanReset, claudePlanUsage, codexCostOf, codexPlanFrom, codexRun, codexStatusFrom, codexModelName, codexModelsFrom, costOf, figureSvg, fmtTokens, learnClaudeModels, plannedModel, planUsageText, progressOf, runModel, themeNamed, totals, windowOf } from './register'
import { geminiLimitsFrom, geminiModelName, geminiPlanFrom, geminiRun, geminiStatusFrom, geminiUsageFrom } from './register'
import { codexBody, crabBody, geminiBody, pixels, withBody } from './sprite'
import { DRESSES, FLURRY_MS, THEMES, THEME_CSS, easter, themeOf, themeOn } from './themes'

const AGENTS = 'agents'
const FLOW = 'flow'
type ToolRegisterInput = Parameters<EngineInterface['tool']['register']>[0]

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
    usage: (): UsageReadings => (values.get('usage')?.value ?? { statuses: {} }) as UsageReadings,
    flow: (): Flow | null | undefined => values.get(FLOW)?.value as Flow | null | undefined,
  }
}

const NO_AGENT_ID = 'Start, answering no agentId.'

// The engine beneath the plugin: what its session.start and its hooks call on `$`.
const engine =(on: On, listed: { infos: AgentInfo[] }, now = 10_000, env: Record<string, string> = {}) => {
  const clock = mock.clock(on, { now })
  const state = store(on)
  mock.env(on, env)
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('settings.read', () => ({ value: {} }))
  const registered: ToolRegisterInput[] = []
  on('tool.register', ($, e) => {
    registered.push(e)
    return { value: { tool: `mcp__savvy-progress__${e.name}` } }
  })
  const commands: { name: string; description: string; argumentHint?: string }[] = []
  on('command.register', ($, e) => {
    commands.push({ name: e.name, description: e.description, argumentHint: e.argumentHint })
    return { value: { command: e.name } }
  })
  let asks = 0
  on('agent.list', () => {
    asks++
    return { value: listed.infos }
  })
  // A spawn given NO_AGENT_ID's prompt answers no agentId: a simulation of what
  // upstream issue #57 reports for named subagents (the host types say core sets it).
  on('agent.spawn', ($, e) => (e.prompt === NO_AGENT_ID ? { model: 'claude-opus-5-5' } : { model: 'claude-opus-5-5', agentId: e.resume?.agentId ?? e.description }))
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
  return { clock, state, asks: (): number => asks, saved, told, registered, commands }
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

// The Codex figures, each with the Claude tier whose costume it wears.
const CODEX: [string, string][] = [['codex-astra', 'fable'], ['codex-sol', 'careful'], ['codex-terra', 'medium'], ['codex-luna', 'light']]
// The `>_` face: the chevron's first pixel and the underscore, wherever their group or color.
const PROMPT = ['<rect x="11" y="12" width="1" height="1"', '<rect x="14" y="14" width="5" height="1"']

test("every theme, and the classic set, draws all four Codex figures in their tier's costume, with the badge and the >_ face", () => {
  const faults: string[] = []
  for (const [theme, dress] of [['classic', null] as const, ...Object.entries(DRESSES)]) {
    for (const [figure, wears] of CODEX) {
      let drawn = ''
      try {
        drawn = figureSvg(figure, dress)
      } catch (err) {
        faults.push(`${theme} ${figure}: throws ${String(err)}`)
        continue
      }
      const cls = dress ? `c-${dress.prefix}-${wears}` : `c-${wears}`
      if (!drawn.includes(`class="${cls}`)) faults.push(`${theme} ${figure}: not dressed as ${wears}`)
      if (!/<g class="badge"><rect/.test(drawn)) faults.push(`${theme} ${figure}: no badge`)
      // The face stands where the crab's eyes do: a costume that hides them (asleep) hides it too.
      const hasEyes = figureSvg(wears, dress).includes('<rect x="9" y="12" width="2" height="2"')
      for (const px of PROMPT) if (drawn.includes(px) !== hasEyes) faults.push(`${theme} ${figure}: >_ face ${hasEyes ? 'missing' : 'shown with eyes hidden'}`)
    }
  }
  expect(faults).toEqual([])
})

test('each Codex intensity has a badge of its own, in its own color', () => {
  const badge = (figure: string): string => /<g class="badge">(.*?)<\/g>/.exec(figureSvg(figure, null))?.[1] ?? ''
  const shapes = CODEX.map(([figure]) => badge(figure).replace(/fill="[^"]*"/g, ''))
  expect(new Set(shapes).size).toBe(4)
  expect(badge('codex-luna')).toContain('fill="#8FA3BF"')
  expect(badge('codex-terra')).toContain('fill="#6E9B4A"')
  expect(badge('codex-sol')).toContain('fill="#E0A526"')
  expect(badge('codex-astra')).toContain('fill="#9B7BE0"')
})

test('a Codex figure leaves the crab as it was, even when its drawing throws', () => {
  const crab = figureSvg('careful', DRESSES.winter)
  figureSvg('codex-sol', DRESSES.winter)
  expect(figureSvg('careful', DRESSES.winter)).toBe(crab)
  expect(() =>
    withBody(codexBody, () => {
      throw new Error('torn costume')
    }),
  ).toThrow('torn costume')
  const { f, groups } = pixels()
  crabBody(f)
  expect(groups.get('bd')?.[0]).toBe('<rect x="7" y="10" width="16" height="12" fill="#D97757"/>')
  expect(figureSvg('careful', DRESSES.winter)).toBe(crab)
})

const CODEX_SEEN: [string, string, string][] = [
  ['codex-astra', '#9B7BE0', 'Astra'],
  ['codex-sol', '#E0A526', 'Sol'],
  ['codex-terra', '#6E9B4A', 'Terra'],
  ['codex-luna', '#8FA3BF', 'Luna'],
]

test("a Codex run shows its intensity, not the relay's model, plugin-prefixed or bare", { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  const types = CODEX_SEEN.flatMap(([tier]) => [`savvy-flow:savvy-${tier}`, `savvy-${tier}`])
  state.seed(AGENTS, types.map((type, i) => run(`w${i}`, { type, model: 'claude-sonnet-5-5', effort: 'low', costUsd: 0.42, status: 'done', endedAt: 5 })))
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const rows = (await ui.findAll({ type: 'Svg' })).slice(1).map(e => ({ svg: String(e.props.source), alt: String(e.props.alt) }))
  await ui.unmount()
  expect(rows.length).toBe(types.length)
  const faults: string[] = []
  for (const { svg, alt } of rows) {
    const seen = CODEX_SEEN.find(([tier, color]) => svg.includes(`<tspan fill="${color}">${tier}</tspan>`))
    if (!seen) faults.push(`no codex tier in ${alt}`)
    else {
      const [tier, , label] = seen
      if (!svg.includes(label) || !alt.includes(label)) faults.push(`${tier}: no ${label}`)
      if (/Sonnet/.test(svg) || /Sonnet/.test(alt)) faults.push(`${tier}: shows the relay's model`)
      if (svg.includes('≈—')) faults.push(`${tier}: missing session shows a cost placeholder`)
      if (!svg.includes('class="badge"')) faults.push(`${tier}: no badge`)
    }
  }
  expect(faults).toEqual([])
})

test('a planned Codex task, named with or without savvy-, waits as its intensity', { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  await $.tool.call({ tool: 'mcp__savvy-progress__progress', title: 'Fix bug', total: 2, phase: 'delegate', tasks: [
    { title: 'second opinion', tier: 'savvy-codex-terra' },
    { title: 'quick fix', tier: 'codex-luna' },
  ] })
  expect(state.flow()?.tasks.map(t => t.tier)).toEqual(['codex-terra', 'codex-luna'])
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const [, terra, luna] = (await ui.findAll({ type: 'Svg' })).map(e => String(e.props.source))
  await ui.unmount()
  expect(terra).toContain('<tspan fill="#6E9B4A">codex-terra</tspan>')
  expect(terra).toContain('Terra')
  expect(terra).toContain('class="c-medium"')
  expect(luna).toContain('Luna')
  expect(luna).toContain('class="c-light"')
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
  // The flow finds the theme's row by its id, so the note carries it.
  expect(told.join('')).toContain('(`halloween`)')
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

// A respawned session starts from an empty store: its copy can predate the plan and the
// runs that follow, as long as nothing refreshes it.
const respawned = async ($: Engine, on: On) => {
  const { clock } = engine(on, { infos: [] }, 0)
  answering(on)
  await start($)
  await clock.advance(1000)
  await $.tool.call({ tool: 'mcp__savvy-progress__progress', total: 2, done: 1, phase: 'delegate',
    tasks: [{ title: 'first', tier: 'careful' }, { title: 'second', tier: 'careful' }] })
  await spawn($, 'second')
  await stepOf($, 'second', 0)
}

test('a run the live list holds as running is drawn even when the panel copy predates it', { options: { theme: 'classic' } }, async ($, on) => {
  await respawned($, on)

  const { terminal } = await panelOf($)

  expect(terminal).not.toContain('No subagents yet.')
  expect(terminal).toContain('"second"')
  expect(terminal).toContain(`$${costOf('claude-opus-5-5', USAGE).toFixed(2)}`)
})

test('a run that starts while the theme picker holds the panel is drawn all the same', { options: { theme: 'classic' } }, async ($, on) => {
  // The surface: the ring moves where it is asked.
  on('ui.focus', () => ({}))
  const { clock, state } = engine(on, { infos: [] }, 0)
  await start($)
  await clock.advance(1000)
  await $.ui.focus(clicked('theme'))
  const writes = state.written.length

  // Not a savvy worker: its start opens no panel, which would end the hold.
  await spawn($, 'w1', 'Explore')
  await clock.advance(3000)

  // The copy still waits; the drawing does not.
  expect(state.written.slice(writes)).not.toContain('shown')
  expect(await panelNow($)).toContain('"w1"')
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

// The slot above the prompt as the engine hands it to the bar: 100 columns wide, no survey in the way.
const ABOVE_PROMPT = { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} }

// The bar above the prompt on the desktop, as its drawing's alt reads it: `title: label, percent`.
const bar = async ($: Engine): Promise<string> => {
  const ui = await $.ui.mount({ plugin: 'savvy-progress', component: 'AbovePrompt', surface: 'desktop', props: ABOVE_PROMPT })
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
  expect((await progress({ phase: 'review' })).result).toMatch(/^ok: Review 1\/1 · 1 running\nbudget: /)
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

test('on the desktop the bar sizes itself to the slot, so the count and the dismiss stay on screen', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  state.seed(FLOW, flowOf())

  const ui = await $.ui.mount({ plugin: 'savvy-progress', component: 'AbovePrompt', surface: 'desktop', props: ABOVE_PROMPT })
  const [svg] = await ui.findAll({ type: 'Svg' })
  const boxes = await ui.findAll({ type: 'Box' })
  const count = await ui.findAll({ type: 'Button', text: '×' })
  const dismiss = await ui.findAll({ type: 'Button', text: '✕' })
  const tree = JSON.stringify(await ui.drawn())
  await ui.unmount()

  // No size of its own: the box takes the drawing's width up to the slot, and the viewBox scales it.
  expect(svg?.props.width).toBeUndefined()
  expect(svg?.props.height).toBeUndefined()
  expect(String(svg?.props.source)).toContain('viewBox="0 0 ')
  // Its box grows and shrinks, down to nothing, beside the count and the dismiss.
  expect(boxes.some(b => b.props.flexGrow === 1 && b.props.flexShrink === 1 && b.props.minWidth === 0)).toBe(true)
  expect(count).toHaveLength(1)
  expect(dismiss).toHaveLength(1)
  // The growing box holds the Svg, and the count and the dismiss come after it.
  const [grow, drawing, crew, close] = ['"minWidth":0', '"Svg"', '×', '✕'].map(s => tree.indexOf(s))
  expect([grow, drawing, crew, close].every(i => (i ?? -1) >= 0)).toBe(true)
  expect(grow).toBeLessThan(drawing ?? -1)
  expect(drawing).toBeLessThan(crew ?? -1)
  expect(crew).toBeLessThan(close ?? -1)
})

// One model request of a worker's loop, answered beneath the plugin with `usage`.
const USAGE = { input_tokens: 1000, output_tokens: 200, cache_read_input_tokens: 50_000, cache_creation_input_tokens: 300, model: 'claude-opus-5-5' }
const answering = (on: On) =>
  on('turn.step', async function* ($, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: USAGE }
  })
const stepOf = async ($: Engine, agentId: string, index: number) => {
  const stream = $.turn.step({ turnId: 't1', index, model: 'claude-opus-5-5', messageCount: 1, agentId })
  for await (const chunk of stream) void chunk
  return stream.result
}

test('a run counts its input, output and cache writes, not the same context re-read on every step', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  answering(on)
  await start($)
  await spawn($, 'w1')

  await stepOf($, 'w1', 0)
  await stepOf($, 'w1', 1)

  const w1 = byId(state.agents(), 'w1')
  expect(w1?.tokens).toBe(2 * (1000 + 200 + 300))
  // The context still holds the cache read, and the cost still prices it.
  expect(w1?.contextTokens).toBe(1000 + 200 + 50_000 + 300)
  expect(w1?.costUsd).toBe(2 * costOf('claude-opus-5-5', USAGE))
  expect(w1?.steps).toBe(2)
})

test("a run whose steps went unseen takes the turn's sum, cache reads left out", async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await spawn($, 'w1')

  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', agentId: 'w1', reason: 'answer', usage: USAGE })

  expect(byId(state.agents(), 'w1')).toMatchObject({ status: 'done', tokens: 1000 + 200 + 300, costUsd: costOf('claude-opus-5-5', USAGE) })
})

test('a subagent cannot report the flow: it changes nothing, nor wipes the finished runs', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  await report($)
  state.seed(AGENTS, [run('old', { status: 'done', endedAt: 5 })])

  const hijack = await $.tool.call({ tool: 'mcp__savvy-progress__progress', agentId: 'w1', title: 'Hijacked', total: 9, done: 9, finished: true })

  expect(hijack.result).toBe('ignored: only the main session reports the flow')
  expect(state.flow()).toMatchObject({ title: 'Fix bug', total: 2, done: 0, isFinished: false })
  expect(byId(state.agents(), 'old')).toMatchObject({ status: 'done' })
  // The main session still can.
  expect((await $.tool.call({ tool: 'mcp__savvy-progress__progress', done: 1 })).result).toMatch(/^ok: Tasks 1\/2\nbudget: /)
})

test('a step with no panel row for its agent says so, instead of ok', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  await spawn($, 'w1')

  const known = await $.tool.call({ tool: 'mcp__savvy-progress__step', agentId: 'w1', done: 1, total: 3 })
  const unknown = await $.tool.call({ tool: 'mcp__savvy-progress__step', agentId: 'stranger', done: 1, total: 3 })

  expect(known.result).toBe('ok')
  expect(unknown.result).toBe('ignored: no panel row for agent stranger')
  expect(byId(state.agents(), 'w1')).toMatchObject({ stepDone: 1, stepTotal: 3 })
})

// A named spawn the engine beneath answers with no agentId (NO_AGENT_ID).
const spawnNamed = ($: Engine, name: string, subagentType: string, background: boolean) =>
  $.agent.spawn({
    tool_use_id: `toolu_${name}`,
    prompt: NO_AGENT_ID,
    description: name,
    name,
    subagentType,
    provider: { plugin: 'engine', tier: 'core' },
    parentModel: 'claude-opus-5-5',
    background,
    fork: false,
  })

test('a run whose spawn answered no agentId takes it from its Agent call, so its steps and its end reach it', async ($, on) => {
  const listed = { infos: [] as AgentInfo[] }
  const { clock, state } = engine(on, listed, 0)
  answering(on)
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', { tool: 'Agent' }, () => ({
    result: { status: 'teammate_spawned', agentId: 'a-77', agent_id: 'a-77', teammate_id: 'scout@team', name: 'scout', prompt: 'Do it.' },
  }))
  await start($)
  await report($)
  await spawnNamed($, 'scout', 'savvy-flow:savvy-careful', true)
  expect(byId(state.agents(), 'toolu_scout')?.agentId).toBeUndefined()

  await $.tool.call({ tool: 'Agent', tool_use_id: 'toolu_scout', description: 'scout', prompt: 'Do it.', subagent_type: 'savvy-flow:savvy-careful', name: 'scout' })
  expect(byId(state.agents(), 'toolu_scout')).toMatchObject({ agentId: 'a-77', status: 'running' })

  // The reconcile finds it by that id and leaves it running.
  listed.infos = [info('a-77', 'running')]
  await clock.advance(5000)
  expect(byId(state.agents(), 'toolu_scout')?.status).toBe('running')

  await stepOf($, 'a-77', 0)
  expect(byId(state.agents(), 'toolu_scout')).toMatchObject({ steps: 1, tokens: 1500 })
  listed.infos = [info('a-77', 'completed')]
  await $.turn.complete({ answer: 'done', durationMs: 1, isAborted: false, turnId: 't1', agentId: 'a-77', reason: 'answer' })
  expect(byId(state.agents(), 'toolu_scout')?.status).toBe('done')
})

test("an Agent call's record of a run already over settles the row it names", async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0)
  on('tool.call', { tool: 'Agent' }, () => ({ result: { status: 'completed', agentId: 'a-9', prompt: 'Do it.', content: [] } }))
  await start($)
  await spawnNamed($, 'fg', 'Explore', false)
  // A foreground run outlasts a reconcile, which fails a row with no agentId.
  await clock.advance(5000)
  expect(byId(state.agents(), 'toolu_fg')?.status).toBe('failed')

  await $.tool.call({ tool: 'Agent', tool_use_id: 'toolu_fg', description: 'fg', prompt: 'Do it.', subagent_type: 'Explore', name: 'fg' })

  expect(byId(state.agents(), 'toolu_fg')).toMatchObject({ agentId: 'a-9', status: 'done', endedAt: 5000 })
})

// The plan as the orchestrator reports it, each task with whatever it declares.
const plan = ($: Engine, tasks: Record<string, unknown>[]) =>
  $.tool.call({ tool: 'mcp__savvy-progress__progress', title: 'Fix bug', total: tasks.length, phase: 'delegate', tasks })

// The panel's rows beneath its header on the desktop, and the whole panel as the terminal draws it.
const panelOf = async ($: Engine): Promise<{ header: string; rows: string[]; terminal: string }> => {
  const desktop = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const drawings = (await desktop.findAll({ type: 'Svg' })).map(e => String(e.props.source))
  const [header = '', ...rows] = drawings
  await desktop.unmount()
  const text = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const terminal = JSON.stringify(await text.drawn())
  await text.unmount()
  return { header, rows, terminal }
}

test("a planned task waits at the effort and the model the plan declares, at its tier's otherwise", { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)

  await plan($, [
    { title: 'review', tier: 'fable', effort: 'xhigh' },
    { title: 'audit', tier: 'careful', model: 'fable', effort: 'max', after: [1] },
    { title: 'plain', tier: 'fable' },
  ])

  expect(state.flow()?.tasks).toEqual([
    { title: 'review', tier: 'fable', after: [], effort: 'xhigh' },
    { title: 'audit', tier: 'careful', after: [1], model: 'fable', effort: 'max' },
    { title: 'plain', tier: 'fable', after: [] },
  ])
  // A task that declares nothing is stored as it always was.
  expect(Object.keys(state.flow()?.tasks[2] ?? {}).sort()).toEqual(['after', 'tier', 'title'])
  const { rows, terminal } = await panelOf($)
  const [review = '', audit = '', plain = ''] = rows
  expect(review).toContain('Fable · xhigh')
  expect(review).not.toContain('Fable · high')
  expect(audit).toContain('<tspan fill="#BA7517">careful</tspan>')
  expect(audit).toContain('Fable · max  ·  after 1')
  expect(audit).not.toContain('Opus')
  expect(plain).toContain('Fable · high')
  expect(terminal).toContain('Fable · xhigh')
  expect(terminal).toContain('Fable · max')
  expect(terminal).toContain('Fable · high')
  expect(terminal).not.toContain('Opus')
})

test("an effort or a model the Agent tool does not take is dropped, and the task waits at its tier's", { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)

  await plan($, [{ title: 'refactor', tier: 'careful', effort: 'extreme', model: 'gpt', agent: '  ' }, { title: 'rename', tier: 'light', effort: ' XHigh ', model: 'Opus' }])

  expect(Object.keys(state.flow()?.tasks[0] ?? {}).sort()).toEqual(['after', 'tier', 'title'])
  expect(state.flow()?.tasks[1]).toEqual({ title: 'rename', tier: 'light', after: [], effort: 'xhigh', model: 'opus' })
  const { rows, terminal } = await panelOf($)
  expect(rows[0]).toContain('Opus · high')
  expect(rows[1]).toContain('Opus · xhigh')
  expect(terminal).toContain('Opus · high')
})

test('a Codex task waits as its intensity, whatever effort the plan declares', { options: { theme: 'classic' } }, async ($, on) => {
  engine(on, { infos: [] })
  await start($)

  await plan($, [{ title: 'second opinion', tier: 'codex-sol', effort: 'max', model: 'fable' }])

  const { rows } = await panelOf($)
  expect(rows[0]).toContain('Sol')
  expect(rows[0]).not.toContain('max')
  expect(rows[0]).not.toContain('Fable')
})

test("an agent of the project that is no savvy worker waits under its own type, at what the plan declares, until it runs", { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)

  await plan($, [
    { title: 'Review of the diff', tier: 'other', agent: 'code-reviewer', model: 'fable', effort: 'xhigh' },
    { title: 'Audit of the diff', tier: 'other', agent: 'security-auditor', after: [1] },
  ])

  expect(state.flow()?.tasks[0]).toEqual({ title: 'Review of the diff', tier: 'other', after: [], agent: 'code-reviewer', model: 'fable', effort: 'xhigh' })
  const waiting = await panelOf($)
  expect(waiting.rows).toHaveLength(2)
  expect(waiting.rows[0]).toContain('<tspan fill="#888780">code-reviewer</tspan>')
  expect(waiting.rows[0]).toContain('Fable · xhigh')
  // With nothing declared the row names the agent and what it waits for, no model of a tier.
  expect(waiting.rows[1]).toContain('<tspan fill="#888780">security-auditor</tspan><tspan class="m">  after 1</tspan>')
  expect(waiting.terminal).toContain('code-reviewer · Fable · xhigh')
  expect(waiting.terminal).toContain('security-auditor · after 1')

  await spawn($, 'Review of the diff', 'code-reviewer')

  const running = await panelOf($)
  // The run took its task's place: one row for it, one still planned.
  expect(running.rows).toHaveLength(2)
  expect(running.rows.filter(r => r.includes('Review of the diff'))).toHaveLength(1)
  expect(running.rows.find(r => r.includes('Review of the diff'))).not.toContain('ctx 0%')
  // A task of the plan, so the faint layer counts it as it counts a savvy worker.
  expect(state.flow()?.running).toBe(1)
  expect(await bar($)).toBe('Fix bug: Tasks 0/2 · 1 running, 0%')
})

// An Agent call as the engine answers it: the spawn happens inside the call.
const launching = ($: Engine, on: On) =>
  on('tool.call', { tool: 'Agent' }, async (_, e) => {
    const call = e as unknown as { tool_use_id: string; description: string; subagent_type: string }
    await $.agent.spawn({
      tool_use_id: call.tool_use_id,
      prompt: 'Do the task.',
      description: call.description,
      subagentType: call.subagent_type,
      provider: { plugin: 'engine', tier: 'core' },
      parentModel: 'claude-opus-5-5',
      background: true,
      fork: false,
    })
    return { result: { status: 'async_launched', agentId: call.description, prompt: 'Do the task.' } }
  })

// The user's recorded yes to Fable for the whole session: tests that launch it by default hold one.
const FABLE_YES: UsageReadings = { statuses: {}, topTiers: { fable: { at: 0, words: 'yes, a plan', uses: 'session' } } }

const launch = ($: Engine, description: string, over: Record<string, unknown> = {}) =>
  $.tool.call({ tool: 'Agent', tool_use_id: `toolu_${description}`, description, prompt: 'Do the task.', subagent_type: 'savvy-flow:savvy-fable', ...over })

test("a run started at another effort than its tier's leaves Planned and shows the effort it runs at", { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  launching($, on)
  on('turn.step', async function* ($, e) {
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const, usage: { ...USAGE, model: 'claude-fable-5-2' } }
  })
  await start($)
  state.seed('usage', FABLE_YES)
  await plan($, [{ title: 'review', tier: 'fable', effort: 'xhigh' }, { title: 'plain', tier: 'fable' }])

  await launch($, 'review', { effort: 'xhigh' })
  await launch($, 'plain')

  // From its first frame, before any model request: what its Agent call asked for.
  expect(byId(state.agents(), 'review')?.effort).toBe('xhigh')
  expect(byId(state.agents(), 'plain')?.effort).toBeUndefined()
  const started = await panelOf($)
  expect(started.rows).toHaveLength(2)
  expect(started.terminal).not.toContain('◷')
  expect(started.rows.find(r => r.includes('>review<'))).toContain('· xhigh')
  expect(started.rows.join('')).not.toContain('· high')

  // Then what the engine says each request ran at.
  const step = $.turn.step({ turnId: 't1', index: 0, model: 'claude-fable-5-2', effort: 'xhigh', messageCount: 1, agentId: 'review' })
  for await (const chunk of step) void chunk
  const other = $.turn.step({ turnId: 't2', index: 0, model: 'claude-fable-5-2', effort: 'high', messageCount: 1, agentId: 'plain' })
  for await (const chunk of other) void chunk

  const stepped = await panelOf($)
  expect(stepped.rows.find(r => r.includes('>review<'))).toContain('Fable 5.2 · xhigh')
  expect(stepped.rows.find(r => r.includes('>plain<'))).toContain('Fable 5.2 · high')
  expect(stepped.terminal).toContain('Fable 5.2 · xhigh')
})

test("the engine's word on a run's effort replaces what its Agent call asked for", async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  launching($, on)
  answering(on)
  await start($)
  state.seed('usage', FABLE_YES)

  await launch($, 'review', { effort: 'xhigh' })
  const step = $.turn.step({ turnId: 't1', index: 0, model: 'claude-opus-5-5', effort: 'high', messageCount: 1, agentId: 'review' })
  for await (const chunk of step) void chunk

  expect(byId(state.agents(), 'review')?.effort).toBe('high')
})

const stepped = ($: Engine, agentId: string, input: Record<string, unknown>) => $.tool.call({ tool: 'mcp__savvy-progress__step', agentId, ...input })

test('a Codex slug names its family and version', () => {
  expect(codexModelName('gpt-6.1-sol')).toBe('Sol 6.1')
})

test('an unknown Codex slug is shown as given', () => {
  expect(codexModelName('custom-model-v7')).toBe('custom-model-v7')
})

const MODELS_CACHE = { models: [
  { slug: 'gpt-6-sol', visibility: 'list', priority: 8 },
  { slug: 'gpt-6.1-sol', visibility: 'list', priority: 2 },
  { slug: 'gpt-7-sol', visibility: 'hide', priority: 0 },
  { slug: 'gpt-6.1-terra', visibility: 'list', priority: 1 },
] }
const taskOf = (tier: string) => ({ title: 'task', tier, after: [] })

test('Codex prediction picks the newest visible model of the requested family', () => {
  const codex = codexModelsFrom(MODELS_CACHE)
  expect(plannedModel(taskOf('codex-sol'), { codex, claude: {} })).toBe('Sol 6.1')
})

test('a planned Codex task names no effort: the user\'s is in its brief, the plan\'s moves only the relay', () => {
  const codex = codexModelsFrom(MODELS_CACHE)
  expect(plannedModel({ ...taskOf('codex-sol'), effort: 'max' }, { codex, claude: {} })).toBe('Sol 6.1')
})

test('a Codex run awaiting declaration predicts each intensity\'s own effort', () => {
  for (const [family, effort] of [['luna', 'low'], ['terra', 'medium'], ['sol', 'high'], ['astra', 'high']] as const) {
    expect(runModel(run('w1', { type: `savvy-codex-${family}` }), true, { codex: { [family]: `gpt-6.1-${family}` }, claude: {} }))
      .toBe(`${codexModelName(`gpt-6.1-${family}`)} · ${effort}`)
  }
})

test('an absent cache leaves the bare Codex intensity', () => {
  expect(plannedModel(taskOf('codex-sol'), { codex: codexModelsFrom(undefined), claude: {} })).toBe('Sol')
})

test('a cache with no matching family leaves the bare Codex intensity', () => {
  expect(plannedModel(taskOf('codex-astra'), { codex: codexModelsFrom(MODELS_CACHE), claude: {} })).toBe('Astra')
})

test('a run\'s declared Codex model and effort win over prediction', () => {
  const worker = run('w1', { type: 'savvy-flow:savvy-codex-sol', codexModel: 'gpt-6.1-sol', codexEffort: 'xhigh' })
  expect(runModel(worker, true, { codex: { sol: 'gpt-6-sol' }, claude: {} })).toBe('Sol 6.1 · xhigh')
})

test('a Codex run awaiting declaration shows prediction with Codex\'s effort', () => {
  const worker = run('w1', { type: 'savvy-codex-sol', effort: 'low' })
  expect(runModel(worker, true, { codex: codexModelsFrom(MODELS_CACHE), claude: {} })).toBe('Sol 6.1 · high')
})

test('a Claude planned task shows the alias version learned from a resolved run', () => {
  const claude = learnClaudeModels({}, ['claude-opus-5-5'])
  expect(plannedModel(taskOf('heavy'), { codex: {}, claude })).toBe('Opus 5.5 · xhigh')
})

test('a Claude planned task keeps its bare alias until a resolved run teaches it', () => {
  expect(plannedModel(taskOf('heavy'), { codex: {}, claude: learnClaudeModels({}, ['opus']) })).toBe('Opus · xhigh')
})

test('the newest resolved Claude model names its family\'s planned version, whatever order the runs came in', () => {
  expect(learnClaudeModels({ opus: 'Opus 5.5' }, ['claude-opus-6-0'])).toEqual({ opus: 'Opus 6.0' })
  expect(learnClaudeModels({}, ['claude-opus-4-7', 'claude-opus-5-5', 'claude-opus-4-1-20250805'])).toEqual({ opus: 'Opus 5.5' })
  expect(learnClaudeModels({}, ['claude-sonnet-4-5-20250929', 'claude-sonnet-5'])).toEqual({ sonnet: 'Sonnet 5' })
})

test('a planned explicit Claude alias uses its learned version', () => {
  const claude = learnClaudeModels({}, ['claude-sonnet-5-5', 'claude-fable-5-2', 'claude-haiku-5-5'])
  expect(plannedModel({ ...taskOf('light'), model: 'fable' }, { codex: {}, claude })).toBe('Fable 5.2 · low')
})

test('the step schema declares optional model and effort strings', async ($, on) => {
  const { registered } = engine(on, { infos: [] })
  await start($)
  expect(registered.find(t => t.name === 'step')?.inputSchema).toMatchObject({ properties: { model: { type: 'string' }, effort: { type: 'string' } }, required: [] })
})

test('the step tool accepts a Codex model and effort and preserves them through later relay usage', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  answering(on)
  await start($)
  await spawn($, 'w1', 'savvy-flow:savvy-codex-sol')
  expect(await stepped($, 'w1', { done: 1, model: 'gpt-6.1-sol', effort: 'high' })).toMatchObject({ result: 'ok' })
  await stepOf($, 'w1', 0)
  await stepped($, 'w1', { done: 2 })
  expect(byId(state.agents(), 'w1')).toMatchObject({ model: 'claude-opus-5-5', codexModel: 'gpt-6.1-sol', codexEffort: 'high' })
  const { rows, terminal } = await panelOf($)
  expect(rows[0]).toContain('Sol 6.1 · high')
  expect(terminal).toContain('Sol 6.1 · high')
})

test('the step tool rejects a non-string model', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  await spawn($, 'w1', 'savvy-codex-sol')
  expect(await stepped($, 'w1', { done: 1, model: 42 })).toMatchObject({ deny: 'model and effort must be strings' })
  expect(byId(state.agents(), 'w1')?.codexModel).toBeUndefined()
})

test('the step tool rejects a non-string effort', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  await spawn($, 'w1', 'savvy-codex-sol')
  expect(await stepped($, 'w1', { done: 1, effort: false })).toMatchObject({ deny: 'model and effort must be strings' })
  expect(byId(state.agents(), 'w1')?.codexEffort).toBeUndefined()
})

test('the panel predicts Codex versions for planned tasks and undeclared runs from the home cache', async ($, on) => {
  engine(on, { infos: [] }, 0, { HOME: 'C:/Users/worker' })
  on('fs.read', ($, e) => {
    // A drive path is absolute only on Windows: elsewhere the engine resolves it under the working folder.
    expect(e.path.replace(/\\/g, '/')).toMatch(/(^|\/)C:\/Users\/worker\/\.codex\/models_cache\.json$/)
    return { value: JSON.stringify(MODELS_CACHE) }
  })
  await start($)
  await plan($, [{ title: 'planned', tier: 'codex-terra' }])
  await spawn($, 'running', 'savvy-codex-sol')
  const { rows, terminal } = await panelOf($)
  expect(rows[0]).toContain('Sol 6.1 · high')
  expect(rows[1]).toContain('Terra 6.1')
  expect(rows[1]).not.toContain('Terra 6.1 · medium')
  expect(terminal).toContain('Sol 6.1 · high')
  expect(terminal).toContain('Terra 6.1')
})

test('Codex cache reads happen at most once a minute and refresh after it', async ($, on) => {
  const { clock } = engine(on, { infos: [] }, 0, { USERPROFILE: 'C:\\Users\\worker' })
  let reads = 0
  on('fs.read', ($, e) => {
    // A drive path is absolute only on Windows: elsewhere the engine resolves it under the working folder.
    expect(e.path.replace(/\\/g, '/')).toMatch(/(^|\/)C:\/Users\/worker\/\.codex\/models_cache\.json$/)
    reads++
    return { value: JSON.stringify({ models: [{ slug: reads === 1 ? 'gpt-6-sol' : 'gpt-6.1-sol', visibility: 'list', priority: 1 }] }) }
  })
  await start($)
  await plan($, [{ title: 'planned', tier: 'codex-sol' }])
  await clock.advance(59_000)
  expect(reads).toBe(1)
  expect((await panelOf($)).terminal).toContain('Sol 6')
  expect((await panelOf($)).terminal).not.toContain('Sol 6.1')
  await clock.advance(1_000)
  expect(reads).toBe(2)
  expect((await panelOf($)).terminal).toContain('Sol 6.1')
})

test('a cache re-read that finds the same models leaves the idle panel as it is', async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  let reads = 0
  on('fs.read', () => {
    reads++
    return { value: JSON.stringify(MODELS_CACHE) }
  })
  await start($)
  await plan($, [{ title: 'planned', tier: 'codex-sol' }])
  await clock.advance(2_000)
  const writes = state.written.length
  await clock.advance(60_000)
  expect(reads).toBe(2)
  expect(state.written.slice(writes)).not.toContain('shown')
})

test('an unreadable Codex cache falls back and is retried only after a minute', async ($, on) => {
  const { clock } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  let reads = 0
  on('fs.read', () => { reads++; throw new Error('unreadable') })
  await start($)
  await plan($, [{ title: 'planned', tier: 'codex-sol' }])
  await clock.advance(59_000)
  expect(reads).toBe(1)
  expect((await panelOf($)).terminal).toContain('Sol')
  expect((await panelOf($)).terminal).not.toContain('Sol 6')
  await clock.advance(1_000)
  expect(reads).toBe(2)
})

test('the panel learns a Claude planned alias from a run', async ($, on) => {
  engine(on, { infos: [] })
  await start($)
  await plan($, [{ title: 'planned', tier: 'heavy' }])
  expect((await panelOf($)).terminal).toContain('Opus · xhigh')
  await spawn($, 'running')
  const { rows, terminal } = await panelOf($)
  expect(rows[1]).toContain('Opus 5.5 · xhigh')
  expect(terminal).toContain('Opus 5.5 · xhigh')
})

test('a worker that closes its count with steps skipped shows how many, beside the count', { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  await spawn($, 'w1')
  await spawn($, 'w2')

  await stepped($, 'w1', { done: 6, total: 6, skipped: 1, note: 'report' })
  await stepped($, 'w2', { done: 6, total: 6 })

  expect(byId(state.agents(), 'w1')).toMatchObject({ stepDone: 6, stepTotal: 6, stepSkipped: 1 })
  // A worker that skipped nothing keeps the row it always had.
  expect('stepSkipped' in (byId(state.agents(), 'w2') ?? {})).toBe(false)
  const { rows, terminal } = await panelOf($)
  expect(rows.find(r => r.includes('>w1<'))).toContain('>6/6 · 1 skipped · report<')
  expect(rows.find(r => r.includes('>w2<'))).toContain('>6/6<')
  expect(rows.find(r => r.includes('>w2<'))).not.toContain('skipped')
  expect(terminal).toContain('6/6 · 1 skipped · report · ')
})

test('the skipped count holds until the worker says otherwise, and never exceeds its steps', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  await spawn($, 'w1')

  await stepped($, 'w1', { done: 2, total: 4, skipped: 9 })
  expect(byId(state.agents(), 'w1')?.stepSkipped).toBe(4)
  await stepped($, 'w1', { done: 3 })
  expect(byId(state.agents(), 'w1')?.stepSkipped).toBe(4)
  await stepped($, 'w1', { done: 4, skipped: 0 })
  expect('stepSkipped' in (byId(state.agents(), 'w1') ?? {})).toBe(false)
})

test('with the language option on it, the bar and the panel speak Italian', { options: { theme: 'classic', language: 'it' } }, async ($, on) => {
  engine(on, { infos: [] }, 0)
  await start($)
  await plan($, [{ title: 'w1', tier: 'careful' }, { title: 'later', tier: 'fable', effort: 'xhigh', after: [1] }])
  await spawn($, 'w1')
  await spawn($, 'w2')
  await stepped($, 'w1', { done: 6, total: 6, skipped: 1 })
  await stepped($, 'w2', { done: 6, total: 6, skipped: 2 })

  expect(await bar($)).toBe('Fix bug: Compiti 0/2 · 2 in corso, 0%')
  const { rows, terminal } = await panelOf($)
  expect(rows.find(r => r.includes('>w1<'))).toContain('>6/6 · 1 saltato<')
  expect(rows.find(r => r.includes('>w2<'))).toContain('>6/6 · 2 saltati<')
  expect(rows.find(r => r.includes('later'))).toContain('Fable · xhigh  ·  dopo 1')
  expect(terminal).toContain('"In corso"')
  expect(terminal).toContain('"Pianificati"')
  expect(terminal).not.toContain('"Running"')
  expect(terminal).toContain('dopo 1')

  // The theme picker and what it lists.
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const [themes] = await ui.findAll({ type: 'Select' })
  await ui.unmount()
  const labels = ((themes?.props.options ?? []) as { label?: string }[]).map(o => o.label ?? '')
  expect(themes?.props.label).toBe('Tema')
  expect(labels[0]).toContain('Automatico, secondo il calendario')
  expect(labels).toContain('Carnevale — i 12 giorni fino al martedì grasso')
  expect(labels.join('|')).not.toContain('Carnival')

  expect((await $.command.run({ ...typed(''), command: 'agents-info' })).text).toMatch(/^Pannello degli agenti (aperto|chiuso)\.$/)
  const listed = (await $.command.run(typed(''))).text ?? ''
  expect(listed).toContain('Tema: ')
  expect(listed).toContain('  winter — Inverno — 1 dic – fine febbraio')
  expect((await $.command.run(typed('nope'))).text).toBe('Nessun tema chiamato "nope". /savvy-theme senza nome li elenca.')
})

test('on auto an Italian system reads Italian', { options: { theme: 'classic' } }, async ($, on) => {
  engine(on, { infos: [] }, 0, { LANG: 'it_IT.UTF-8' })
  await start($)
  await report($)
  await spawn($, 'w1')

  expect(await bar($)).toBe('Fix bug: Compiti 0/2 · 1 in corso, 0%')
})

test('on auto any other system, a Russian one included, reads English', { options: { theme: 'classic', language: 'auto' } }, async ($, on) => {
  engine(on, { infos: [] }, 0, { LANG: 'ru_RU.UTF-8' })
  await start($)
  await report($)
  expect(await bar($)).toBe('Fix bug: Tasks 0/2, 0%')
})

test('with the language on it, the plan tiles, the budget command, the gate and the command list speak Italian', { options: { theme: 'classic', language: 'it' } }, async ($, on) => {
  const { state, registered, commands } = budgetEngine(on)
  launching($, on)
  await start($)
  state.seed('usage', askUsage({ claudeReadAt: BUDGET_AT }))
  const header = (await headerOf($)).source
  expect(header).toContain('Claude · piano · entro')
  expect(header).toContain('7g  20%')
  expect(header).toContain('0 min fa')
  expect(header).not.toContain(' plan ')
  expect(header).not.toContain('ago')
  expect(await budgetCommand($)).toMatchObject({ text: 'Budget: Claude entro · Codex entro · Gemini ritmo.' })
  expect(await budgetCommand($, 'claude sempre')).toMatchObject({ text: 'Uso: /savvy-budget <claude|codex|gemini> <entro|pieno|ritmo|una-volta>' })
  const refused = (await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny ?? ''
  expect(refused).toContain('Blocco del budget')
  expect(refused).toContain('/savvy-budget claude una-volta')
  expect(refused).not.toContain('Ask the user')
  expect((await budgetCommand($, 'codex pieno')).text).toBe('Budget: Claude entro · Codex pieno · Gemini ritmo.')
  expect((await budgetCommand($, 'claude una-volta')).text).toMatch(/^Budget: Claude entro · Codex pieno · Gemini ritmo\. Claude: via libera fino a /)
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeUndefined()
  expect(commands.find(c => c.name === 'savvy-budget')?.description).toContain('Imposta il budget')
  expect(commands.find(c => c.name === 'agents-info')?.description).toContain('Mostra o nasconde')
  expect(commands.find(c => c.name === 'savvy-theme')?.argumentHint).toBe('[tema|auto]')
  expect(registered.some(tool => tool.name === 'decide')).toBe(true)
})

test("the panel's language picker lists every language, and a pick redraws at once and is kept in the option", { options: { theme: 'classic' } }, async ($, on) => {
  const { state, saved } = engine(on, { infos: [info('w1', 'running')] })
  await start($)
  state.seed(AGENTS, [run('w1')])
  state.seed(FLOW, flowOf())
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const [themes, languages] = await ui.findAll({ type: 'Select' })
  expect(themes?.props.label).toBe('Theme')
  expect(languages?.props.label).toBe('Language')
  expect(languages?.props.value).toBe('auto')
  expect((languages?.props.options as { value: string; label?: string }[]).map(o => [o.value, o.label])).toEqual([
    ['auto', 'Auto, by the settings'],
    ['en', 'English'],
    ['it', 'Italiano'],
  ])

  await ui.select({ key: 'language', value: 'it' })
  await ui.unmount()

  expect(saved).toEqual([{ key: 'savvy-progress.language', value: 'it' }])
  expect(await bar($)).toBe('Fix bug: Compiti 0/2 · 1 in corso, 0%')
  const again = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const [, picked] = await again.findAll({ type: 'Select' })
  await again.unmount()
  expect(picked?.props.label).toBe('Lingua')
  expect(picked?.props.value).toBe('it')
})

test('the language picker taking the focus holds the panel still, as the theme picker does', { options: { theme: 'auto' } }, async ($, on) => {
  const { clock, state } = engine(on, { infos: [info('w1', 'running')] })
  on('ui.focus', () => ({}))
  await start($)
  state.seed(AGENTS, [run('w1', { startedAt: 10_000 })])
  state.seed(FLOW, flowOf())
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  await clock.advance(1000)
  const before = await panelNow($)

  await $.ui.focus(clicked('language'))
  state.seed(AGENTS, [run('w1', { startedAt: 10_000, tokens: 90_000 })])
  await clock.advance(3000)
  expect(await panelNow($)).toBe(before)

  await $.ui.focus(clicked('compact'))
  expect(await panelNow($)).toContain('90k')
  await ui.unmount()
})


const CODEX_USAGE = { input_tokens: 1_000_000, cached_input_tokens: 800_000, output_tokens: 100_000, reasoning_output_tokens: 20_000 }
const CODEX_LIMITS = {
  primary: { used_percent: 2, window_minutes: 300, resets_at: 1_794_536_454 },
  secondary: { used_percent: 9, window_minutes: 10080, resets_at: 1_795_033_876 },
}
const STATUS_ONE = { version: 1, sessionId: 'session-one', model: 'gpt-6.1-sol', state: 'done',
  action: 'running EditMode tests', totalTokenUsage: CODEX_USAGE, rateLimits: CODEX_LIMITS, updatedAt: 100 }
const CLAUDE_LIMITS = [
  { kind: 'five_hour', percentUsed: 41, resetsAt: '2026-11-13T01:00:00Z' },
  { kind: 'seven_day', percentUsed: 94, resetsAt: '2026-11-18T01:00:00Z' },
]
const READINGS: UsageReadings = { claude: claudePlanUsage(CLAUDE_LIMITS), codex: codexStatusFrom(JSON.stringify(STATUS_ONE))!.rateLimits,
  statuses: { 'run-one': codexStatusFrom(JSON.stringify(STATUS_ONE))! } }

// A flat directory of bounded snapshots; asking for a rollout is a test failure.
const statusFiles = (on: On, initial = STATUS_ONE) => {
  const files: Record<string, { text: string; mtimeMs: number; size?: number }> = {
    'run-one': { text: JSON.stringify(initial), mtimeMs: 200 },
    older: { text: JSON.stringify({ ...STATUS_ONE, rateLimits: null, updatedAt: 50 }), mtimeMs: 100 },
  }
  const reads: string[] = [], faults = { missing: false, unreadable: false }
  on('fs.list', ($, e) => {
    // The Gemini status directory, listed beside this one, is empty here.
    if (e.path?.replace(/\\/g, '/').endsWith('/.gemini/savvy-status')) return { value: [] }
    expect(e.path?.replace(/\\/g, '/')).toMatch(/\/\.codex\/savvy-status$/)
    if (faults.missing) throw new Error('ENOENT')
    return { value: Object.entries(files).map(([name, f]) => ({ name: name + '.json', kind: 'file', size: f.size ?? f.text.length, mtimeMs: f.mtimeMs, isLink: false })) }
  })
  on('fs.read', ($, e) => {
    if (e.path.endsWith('models_cache.json')) return { value: '{}' }
    expect(e.path.replace(/\\/g, '/')).toMatch(/\/\.codex\/savvy-status\/[\w-]+\.json$/)
    const name = e.path.replace(/\\/g, '/').split('/').pop()!.slice(0, -5)
    reads.push(name)
    if (faults.unreadable || !files[name]) throw new Error('unreadable')
    return { value: files[name].text }
  })
  return { files, reads, faults }
}

const relay = (over: Partial<AgentRun> = {}) => run('relay', { type: 'savvy-codex-sol', codexStatus: 'run-one', status: 'done', endedAt: 0, ...over })

test('a bounded status snapshot parses both rate-limit windows', () => {
  expect(codexStatusFrom(JSON.stringify(STATUS_ONE))?.rateLimits).toEqual({
    fiveHour: { percentUsed: 2, resetsAt: new Date(CODEX_LIMITS.primary.resets_at * 1000).toISOString() },
    week: { percentUsed: 9, resetsAt: new Date(CODEX_LIMITS.secondary.resets_at * 1000).toISOString() },
  })
})
test('invalid status JSON supplies no reading', () => {
  expect(codexStatusFrom('broken')).toBeUndefined()
})
test('an invalid status token count supplies no reading', () => {
  expect(codexStatusFrom(JSON.stringify({ ...STATUS_ONE, totalTokenUsage: { ...CODEX_USAGE, input_tokens: '100' } }))).toBeUndefined()
})
test('an absent status directory leaves no Codex usage header', async ($, on) => {
  engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on); files.faults.missing = true
  await start($)
  expect((await panelOf($)).header).not.toContain('Codex · plan')
})
test('an unreadable status file leaves no Codex usage header', async ($, on) => {
  engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on); files.faults.unreadable = true
  await start($)
  expect((await panelOf($)).header).not.toContain('Codex · plan')
})
test('a status without rate limits produces no plan usage', () => {
  expect(codexStatusFrom(JSON.stringify({ ...STATUS_ONE, rateLimits: null }))?.rateLimits).toBeUndefined()
})
test('a missing reasoning count remains unknown in the status snapshot', () => {
  expect(codexStatusFrom(JSON.stringify({ ...STATUS_ONE, totalTokenUsage: { ...CODEX_USAGE, reasoning_output_tokens: null } }))?.totalTokenUsage.reasoning_output_tokens).toBeNull()
})
test('the Codex row reads only its declared status file', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on)
  state.seed(AGENTS, [relay()])
  await start($)
  expect(files.reads).toEqual(['run-one'])
  expect((await panelOf($)).terminal).toContain('1.1M ≈$1.48')
})
test('oversized status files are skipped before fs.read', async ($, on) => {
  engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on)
  files.files['run-one']!.size = 17_000_000
  await start($)
  expect(files.reads).not.toContain('run-one')
})
test('running status files refresh at most once every three seconds', async ($, on) => {
  const { clock } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on, { ...STATUS_ONE, state: 'running' })
  await start($)
  await clock.advance(2000)
  expect(files.reads).toEqual(['run-one'])
  await clock.advance(1000)
  expect(files.reads).toEqual(['run-one', 'run-one'])
})
test('unchanged finished status files are not reread', async ($, on) => {
  const { clock } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on)
  await start($)
  await clock.advance(6000)
  expect(files.reads).toEqual(['run-one'])
})
test('a newer status without plan limits preserves the last reading', async ($, on) => {
  const { clock } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on)
  await start($)
  expect((await panelOf($)).header).toContain('Codex · plan')
  files.files.newest = { text: JSON.stringify({ ...STATUS_ONE, rateLimits: null, updatedAt: 300 }), mtimeMs: 300 }
  await clock.advance(3000)
  expect((await panelOf($)).header).toContain('7d  9%')
})

const SAVED_CODEX: UsageReadings = { statuses: {}, codex: READINGS.codex, codexReadAt: 0, codexUpdatedAt: 100 }
const SNAPSHOT = { rateLimits: CODEX_LIMITS, model: 'gpt-6.1-sol', updatedAt: 200 }

test('a plan-only snapshot parses without run accounting fields', () => {
  expect(codexPlanFrom(JSON.stringify(SNAPSHOT))).toEqual({ rateLimits: READINGS.codex, updatedAt: 200 })
})

test('a plan-only snapshot cannot become an agent run status', () => {
  expect(codexStatusFrom(JSON.stringify(SNAPSHOT))).toBeUndefined()
})

test('a plan snapshot with an invalid timestamp is ignored', () => {
  expect(codexPlanFrom(JSON.stringify({ ...SNAPSHOT, updatedAt: 'yesterday' }))).toBeUndefined()
})

test('oversized plan snapshots are ignored', () => {
  expect(codexPlanFrom(JSON.stringify({ ...SNAPSHOT, output: 'x'.repeat(17_000) }))).toBeUndefined()
})

test('a plan parser does not accept a malformed full run status', () => {
  expect(codexPlanFrom(JSON.stringify({ ...STATUS_ONE, totalTokenUsage: null }))).toBeUndefined()
})

test('a successful Codex reading persists the time it was read', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 10_000, { HOME: '/home/worker' })
  statusFiles(on)
  await start($)
  expect(state.usage()).toMatchObject({ codex: READINGS.codex, codexReadAt: 10_000, codexUpdatedAt: 100 })
})

test('an unchanged status never refreshes the saved reading age', async ($, on) => {
  const { state, clock } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  statusFiles(on)
  await start($)
  await clock.advance(6000)
  expect(state.usage().codexReadAt).toBe(0)
})

test('Codex usage survives a restart with no status directory or relays', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 7_200_000, { HOME: '/home/worker' })
  const files = statusFiles(on); files.faults.missing = true
  state.seed('usage', SAVED_CODEX)
  await start($)
  expect((await panelOf($)).header).toContain('7d  9%')
})

test('a gap in status files retains the last Codex reading', async ($, on) => {
  const { state, clock } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on)
  await start($)
  for (const name of Object.keys(files.files)) delete files.files[name]
  await clock.advance(3000)
  expect(state.usage().codex).toEqual(READINGS.codex)
})

test('an unreadable replacement retains the last Codex reading', async ($, on) => {
  const { state, clock } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on, { ...STATUS_ONE, state: 'running' })
  await start($)
  files.faults.unreadable = true
  await clock.advance(3000)
  expect(state.usage().codex).toEqual(READINGS.codex)
})

test('an older observation cannot replace a newer persisted reading', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 10_000, { HOME: '/home/worker' })
  statusFiles(on, { ...STATUS_ONE, updatedAt: 50, rateLimits: { ...CODEX_LIMITS, primary: { ...CODEX_LIMITS.primary, used_percent: 99 } } })
  state.seed('usage', SAVED_CODEX)
  await start($)
  expect(state.usage().codex).toEqual(READINGS.codex)
})

test('a newer plan snapshot replaces the persisted reading', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 10_000, { HOME: '/home/worker' })
  const files = statusFiles(on)
  files.files.snapshot = { text: JSON.stringify({ ...SNAPSHOT, rateLimits: { ...CODEX_LIMITS, primary: { ...CODEX_LIMITS.primary, used_percent: 57 } } }), mtimeMs: 300 }
  state.seed('usage', SAVED_CODEX)
  await start($)
  expect(state.usage()).toMatchObject({ codex: { fiveHour: { percentUsed: 57 } }, codexReadAt: 10_000, codexUpdatedAt: 200 })
})

test('a plan-only snapshot supplies usage before any relay runs', async ($, on) => {
  engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on)
  for (const name of Object.keys(files.files)) delete files.files[name]
  files.files.snapshot = { text: JSON.stringify(SNAPSHOT), mtimeMs: 300 }
  await start($)
  expect((await panelOf($)).header).toContain('7d  9%')
})

test('an unchanged plan-only snapshot is not reread on every poll', async ($, on) => {
  const { clock } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on)
  for (const name of Object.keys(files.files)) delete files.files[name]
  files.files.snapshot = { text: JSON.stringify(SNAPSHOT), mtimeMs: 300 }
  await start($)
  await clock.advance(6000)
  expect(files.reads).toEqual(['snapshot'])
})

test('the saved reading age is drawn in the label grey', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 7_200_000)
  state.seed('usage', SAVED_CODEX)
  await start($)
  expect((await panelOf($)).header).toContain('<tspan class="s" font-weight="400"> · 2h ago</tspan>')
})

test('reading ages advance while no agents are running', async ($, on) => {
  const { state, clock } = engine(on, { infos: [] }, 59_000)
  state.seed('usage', SAVED_CODEX)
  await start($)
  await clock.advance(1000)
  expect((await panelOf($)).header).toContain(' · 1m ago</tspan>')
})

test('an expired Codex window shows zero with a reset label and empty meter', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 2000)
  state.seed('usage', { statuses: {}, codex: { fiveHour: { percentUsed: 96, resetsAt: new Date(1000).toISOString() } }, codexReadAt: 0 })
  await start($)
  const header = (await panelOf($)).header
  expect(header).toContain('5h  0% reset<tspan')
  expect(header).toContain('width="0" height="4" rx="2" fill="#E0A526"')
})

test('resetting one Codex window preserves the other window', () => {
  expect(planUsageText({ codex: { fiveHour: { percentUsed: 65, resetsAt: new Date(1000).toISOString() },
    week: { percentUsed: 18, resetsAt: new Date(3000).toISOString() } } }, 2000)).toBe('Codex 0/18%')
})

test('a Codex window is not reset until strictly after its reset time', () => {
  expect(planUsageText({ codex: { fiveHour: { percentUsed: 65, resetsAt: new Date(1000).toISOString() } } }, 1000)).toBe('Codex 65/—%')
})

test('rendering an expired reading preserves the original stored observation', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 2000)
  const plan = { fiveHour: { percentUsed: 96, resetsAt: new Date(1000).toISOString() } }
  state.seed('usage', { statuses: {}, codex: plan, codexReadAt: 0 })
  await start($)
  await panelOf($)
  expect(state.usage().codex).toEqual(plan)
})
test('a live Codex action becomes its row step note without declared steps', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  statusFiles(on, { ...STATUS_ONE, state: 'running', action: 'dotnet test CreatureProbe.csproj' })
  state.seed(AGENTS, [relay()])
  await start($)
  expect(byId(state.agents(), 'relay')?.stepNote).toBe('dotnet test CreatureProbe.csproj')
  expect((await panelOf($)).terminal).toContain('dotnet test CreatureProbe.csproj')
})
test('a running Codex status keeps a stopped relay row running', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 10_000, { HOME: '/home/worker' })
  statusFiles(on, { ...STATUS_ONE, state: 'running' })
  state.seed(AGENTS, [relay({ status: 'running', stepDone: 4, stepTotal: 4 })])
  await start($)
  expect(byId(state.agents(), 'relay')).toMatchObject({ status: 'running', codexState: 'running', relayStatus: 'failed' })
})
test('a relay turn.complete cannot finish a running Codex row', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  on('turn.complete', () => ({ text: '' }))
  statusFiles(on, { ...STATUS_ONE, state: 'running' })
  state.seed(AGENTS, [relay({ status: 'running', endedAt: undefined })])
  await start($)
  await $.turn.complete({ answer: 'waiting', durationMs: 1, isAborted: false, turnId: 't1', agentId: 'relay', reason: 'answer' })
  expect(byId(state.agents(), 'relay')).toMatchObject({ status: 'running', relayStatus: 'done', codexState: 'running' })
})
test('a live Codex keeps an accepted flow below one hundred percent', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  statusFiles(on, { ...STATUS_ONE, state: 'running' })
  state.seed(AGENTS, [relay()])
  state.seed(FLOW, flowOf({ total: 1, done: 1 }))
  await start($)
  expect(await bar($)).toContain('99%')
  expect(state.flow()?.running).toBe(1)
})
test('a completed Codex releases a row whose relay has completed', async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = statusFiles(on, { ...STATUS_ONE, state: 'running' })
  state.seed(AGENTS, [relay()])
  await start($)
  files.files['run-one'] = { text: JSON.stringify(STATUS_ONE), mtimeMs: 300 }
  await clock.advance(3000)
  expect(byId(state.agents(), 'relay')?.status).toBe('done')
})
test('a failed Codex status fails a completed relay row', () => {
  const usage = { ...READINGS, statuses: { 'run-one': { ...READINGS.statuses['run-one']!, state: 'failed' as const } } }
  expect(codexRun(relay(), usage, 0).status).toBe('failed')
})
test('an unfinished declared step count stays partial after a worker completes', () => {
  expect(progressOf(run('worker', { status: 'done', stepDone: 1, stepTotal: 4 }))).toBe(0.25)
})
test('a completed worker without declared steps still has a full bar', () => {
  expect(progressOf(run('worker', { status: 'done' }))).toBe(1)
})
test('a running Codex bar stays below full even when all steps were reported', () => {
  expect(progressOf(relay({ codexState: 'running', status: 'running', stepDone: 4, stepTotal: 4 }))).toBe(0.99)
})
test('Codex pricing discounts cached input and counts reasoning once', () => {
  expect(codexCostOf('gpt-6.1-sol', CODEX_USAGE)).toBe(1.48)
})
test('the verified GPT price table covers all four families', () => {
  expect(['luna', 'terra', 'sol', 'astra'].map(f => codexCostOf('gpt-6-' + f, CODEX_USAGE))).toEqual([0.078, 0.74, 1.48, 7.8])
})
test('a session resumed twice contributes only its largest cumulative snapshot', () => {
  const usage: UsageReadings = { statuses: Object.fromEntries([1, 2, 3].map(n => ['run-' + n, { ...READINGS.statuses['run-one']!, totalTokenUsage: { ...CODEX_USAGE, input_tokens: n * 1_000_000 } }])) }
  const rows = [1, 2, 3].map(n => relay({ id: String(n), codexStatus: 'run-' + n }))
  expect(totals(rows, 0, usage).codex).toEqual({ tokens: 3_100_000, cost: 5.48 })
})
test('family totals retain Claude relay usage in the Claude total', () => {
  expect(totals([run('worker', { tokens: 200, costUsd: 0.2 }), relay({ tokens: 300, costUsd: 0.3 })], 0, READINGS))
    .toMatchObject({ claude: { tokens: 500, cost: 0.5 }, codex: { tokens: 1_100_000, cost: 1.48 } })
})
test('the step tool accepts a Codex status declaration without done', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  await spawn($, 'relay', 'savvy-codex-sol')
  await stepped($, 'relay', { total: 4, done: 0, note: 'checking Codex login' })
  expect(await stepped($, 'relay', { codexStatus: 'run-one', model: 'gpt-6.1-sol' })).toMatchObject({ result: 'ok' })
  expect(byId(state.agents(), 'relay')).toMatchObject({ codexStatus: 'run-one', stepDone: 0, stepNote: 'checking Codex login' })
})
test('the step schema permits declarations without a progress count', async ($, on) => {
  const { registered } = engine(on, { infos: [] })
  await start($)
  expect(registered.find(t => t.name === 'step')?.inputSchema).toMatchObject({ properties: { codexStatus: { type: 'string' } }, required: [] })
})
test('the step tool rejects a status name that escapes its directory', async ($, on) => {
  engine(on, { infos: [] })
  await start($)
  expect(await stepped($, 'relay', { codexStatus: '../outside' })).toMatchObject({ deny: 'codexStatus must be a safe filename stem' })
})
test('the step description asks for a concrete action note', async ($, on) => {
  const { registered } = engine(on, { infos: [] })
  await start($)
  expect(registered.find(t => t.name === 'step')?.description).toContain('reading CreatureProbe.cs')
  expect(registered.find(t => t.name === 'step')?.description).toContain('never working')
})
// The desktop header, at a chosen width, and any text drawn outside its SVG.
const headerOf = async ($: Engine, columns = 60) => {
  const ui = await $.ui.mount({ ...PANE, props: { ...PANE.props, bodyColumns: columns }, surface: 'desktop' })
  const [drawing] = await ui.findAll({ type: 'Svg' })
  const texts = JSON.stringify(await ui.findAll({ type: 'Text' }))
  await ui.unmount()
  return { source: String(drawing?.props.source), width: Number(drawing?.props.width), height: Number(drawing?.props.height), texts }
}

const planBoxes = (source: string) => [...source.matchAll(/<rect class="tile" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="82" rx="8"\/>/g)]
  .map(m => ({ x: Number(m[1]), y: Number(m[2]), width: Number(m[3]) }))

test('plan usage occupies two equal tiles beneath the metric tiles', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', READINGS)
  state.seed(FLOW, flowOf())
  const header = await headerOf($)
  expect(planBoxes(header.source)).toEqual([{ x: 0, y: 90, width: 233 }, { x: 239, y: 90, width: 233 }])
  expect(header.source).toContain('Claude · plan · pace</text>')
  expect(header.source).toContain('Codex · plan · pace</text>')
  expect(header.height).toBe(176)
})

test('reset formatting uses the fixed locale and timezone', () => {
  const at = Date.parse('2026-11-12T00:00:00Z')
  const locale = { locale: 'en-GB', timeZone: 'UTC' }
  expect(formatPlanReset({ percentUsed: 94, resetsAt: '2026-11-12T02:00:00Z' }, true, at, locale)).toBe('↻ Thu 02:00')
  expect(formatPlanReset({ percentUsed: 41, resetsAt: '2026-11-12T02:00:00Z' }, false, at, locale)).toBe('↻ 02:00')
  expect(formatPlanReset({ percentUsed: 94, resetsAt: '2026-11-20T02:00:00Z' }, true, at, locale)).toBe('↻ 20 Nov 02:00')
  expect(formatPlanReset({ percentUsed: 94, resetsAt: '2026-11-18T00:00:00Z' }, true, at, locale)).toBe('↻ Wed 00:00')
  expect(formatPlanReset({ percentUsed: 94, resetsAt: '2026-11-18T00:01:00Z' }, true, at, locale)).toBe('↻ 18 Nov 00:01')
  expect(formatPlanReset({ percentUsed: 94, resetsAt: '2026-11-11T02:00:00Z' }, true, at, locale)).toBe('')
})

test('plan tiles format both families with a fixed clock, locale and timezone', () => {
  const at = Date.parse('2026-11-12T00:00:00Z')
  const options = { locale: 'en-GB', timeZone: 'UTC' }
  const plan = { fiveHour: { percentUsed: 41, resetsAt: '2026-11-12T02:00:00Z' }, week: { percentUsed: 94, resetsAt: '2026-11-13T02:00:00Z' } }
  for (const name of ['Claude', 'Codex']) {
    const tile = planTile(0, 0, 300, name, plan, '#000', at, at, options)
    expect(tile).toContain('5h  41%  ↻ 02:00')
    expect(tile).toContain('7d  94%  ↻ Fri 02:00')
    expect(tile).toContain(' · 0m ago')
    const expired = planTile(0, 0, 300, name, plan, '#000', at + 2 * 86_400_000, at, options)
    expect(expired).not.toContain('↻')
    expect(expired).toContain('7d  0% reset')
  }
})

test('weekly reset and age fit the normal side-by-side tile', () => {
  const weekday = textWidth('7d  94%  ↻ Thu 02:00 · 0m ago', 11)
  const date = textWidth('7d  94%  ↻ 20 Nov 02:00 · 0m ago', 11)
  expect([360, 420, 480, 600].map(w => weekday <= (w - 6) / 2 - 18)).toEqual([true, true, true, true])
  expect([360, 420, 480, 600].map(w => date <= (w - 6) / 2 - 18)).toEqual([false, true, true, true])
  const at = Date.parse('2026-11-12T00:00:00Z')
  const options = { locale: 'en-GB', timeZone: 'UTC' }
  const weekly = (resetsAt: string) => ({ week: { percentUsed: 94, resetsAt } })
  expect(planTile(0, 0, 177, 'Claude', weekly('2026-11-12T02:00:00Z'), '#000', at, at, options)).toContain('↻ Thu 02:00')
  expect(planTile(0, 0, 177, 'Claude', weekly('2026-11-20T02:00:00Z'), '#000', at, at, options)).not.toContain('↻')
  expect(planTile(0, 0, 207, 'Codex', weekly('2026-11-20T02:00:00Z'), '#000', at, at, options)).toContain('↻ 20 Nov 02:00')
})

test('each plan window displays its percentage and reset time on one line', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', READINGS)
  const { source } = await headerOf($, 120)
  expect(source).toContain('5h  41%  ↻ ')
  expect(source).toContain('7d  94%  ↻ ')
  expect(source.split('↻')).toHaveLength(5)
})

test('plan meters use the row bar geometry and family colours', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', READINGS)
  const { source } = await headerOf($)
  expect(source).toContain('width="88.15" height="4" rx="2" fill="#D97757"')
  expect(source).toContain('width="4.3" height="4" rx="2" fill="#E0A526"')
})

test('a plan meter turns red at ninety percent', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', { statuses: {}, claude: { fiveHour: { percentUsed: 89 }, week: { percentUsed: 90 } } })
  const { source } = await headerOf($)
  expect(source).toContain('width="404.06" height="4" rx="2" fill="#D97757"')
  expect(source).toContain('width="408.6" height="4" rx="2" fill="#D0453F"')
})

test('below 360 pixels plan tiles stack at full width', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', READINGS)
  const header = await headerOf($, 45)
  expect(header.width).toBe(352)
  expect(planBoxes(header.source)).toEqual([{ x: 0, y: 62, width: 352 }, { x: 0, y: 150, width: 352 }])
  expect(header.height).toBe(236)
})

test('at 360 pixels plan tiles share one row', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', READINGS)
  expect(planBoxes((await headerOf($, 46)).source)).toEqual([{ x: 0, y: 62, width: 177 }, { x: 183, y: 62, width: 177 }])
})

test('without Codex the Claude plan tile spans the whole row', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', { statuses: {}, claude: READINGS.claude })
  state.seed(FLOW, flowOf())
  const header = await headerOf($)
  expect(planBoxes(header.source)).toEqual([{ x: 0, y: 90, width: 472 }])
  expect(header.source).toContain('Claude · plan · pace</text>')
  expect(header.source).not.toContain('Codex · plan')
  expect(header.height).toBe(176)
})

test('an unread family gets no tile and the read one spans the row', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', { statuses: {}, codex: READINGS.codex })
  const header = await headerOf($, 45)
  expect(planBoxes(header.source)).toEqual([{ x: 0, y: 62, width: 352 }])
  expect(header.source).not.toContain('Claude · plan')
  expect(header.height).toBe(148)
})

test('no plan readings leave the header at its original height', async ($, on) => {
  engine(on, { infos: [] })
  await start($)
  const header = await headerOf($)
  expect(planBoxes(header.source)).toEqual([])
  expect(header.height).toBe(60)
})

test('an empty plan object supplies no second row', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', { statuses: {}, claude: {}, codex: {} })
  expect(planBoxes((await headerOf($)).source)).toEqual([])
})

test('expanded plan usage has no plain text line outside the SVG', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', READINGS)
  expect((await headerOf($)).texts).not.toContain('41%')
})

test('compact usage preserves both windows in one short line', () => {
  expect(planUsageText({ claude: { fiveHour: { percentUsed: 65 }, week: { percentUsed: 96 } },
    codex: { fiveHour: { percentUsed: 57 }, week: { percentUsed: 18 } } })).toBe('Claude 65/96%  Codex 57/18%')
})

test('compact plan usage is grey text inside its SVG', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', READINGS)
  state.seed('panel', { isCompact: true, isDoneCollapsed: false, autoOpenedFor: '' })
  const header = await headerOf($)
  expect(header.source).toContain('<text class="s" x="0" y="80"')
  expect(header.source).toContain('>Claude 41/94%  Codex 2/9%</text>')
  expect(header.height).toBe(84)
  expect(header.texts).not.toContain('41%')
})

test('compact usage leaves out an unread family', () => {
  expect(planUsageText({ codex: READINGS.codex })).toBe('Codex 2/9%')
  expect(planUsageText({ claude: READINGS.claude })).not.toContain('Codex')
})

test('the narrowest panel preserves plan percentages on single text lines', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', READINGS)
  const { source } = await headerOf($, 24)
  const values = [...source.matchAll(/<text class="t"[^>]*>([^<]*%)\s*(?:↻[^<]*)?<\/text>/g)].map(m => m[1].trim())
  expect(values).toEqual(['5h  41%', '7d  94%', '5h  2%', '7d  9%'])
})

test('cost tiles leave both families unknown before any usage arrives', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [run('fresh', { type: 'savvy-flow:savvy-codex-sol' })])
  const { source } = await headerOf($)
  const cost = source.slice(source.indexOf('Cost ≈'), source.indexOf('Tokens</text>'))
  expect(cost).toContain('>Claude —</text>')
  expect(cost).toContain('>Codex —</text>')
})

test('token tiles leave an unread Codex family unknown', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [run('worker', { tokens: 200 }), run('relay', { type: 'savvy-flow:savvy-codex-sol' })])
  const { source } = await headerOf($)
  const tokens = source.slice(source.indexOf('Tokens</text>'), source.indexOf('Time</text>'))
  expect(tokens).toContain('>Claude 200</text>')
  expect(tokens).toContain('>Codex —</text>')
})

test('without Codex the cost and token tiles carry only Claude', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [run('worker', { tokens: 200 })])
  const { source } = await headerOf($)
  const tiles = source.slice(source.indexOf('Cost ≈'), source.indexOf('Time</text>'))
  expect(tiles).toContain('>Claude 200</text>')
  expect(tiles).not.toContain('Codex')
})

test('a Codex plan reading alone keeps the Codex lines', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', { statuses: {}, codex: READINGS.codex })
  state.seed(AGENTS, [run('worker', { tokens: 200 })])
  const { source } = await headerOf($)
  expect(source.slice(source.indexOf('Cost ≈'), source.indexOf('Time</text>'))).toContain('>Codex —</text>')
})

test('without Codex the family totals name only Claude', () => {
  const t = totals([run('worker', { tokens: 200 })], 0)
  expect(t.showsCodex).toBe(false)
})

test('an observed zero usage stays a known zero in totals', () => {
  expect(totals([run('worker', { steps: 1 })], 0).claude).toEqual({ cost: 0, tokens: 0 })
})

const statsOf = (source: string): string => /<text class="s"[^>]*y="49"[^>]*>([^<]*)<\/text>/.exec(source)?.[1] ?? ''

test('a Codex row places its model directly after its tier tag', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [relay({ codexModel: 'gpt-6.1-sol', codexEffort: 'high' })])
  const { rows, terminal } = await panelOf($)
  expect(rows[0]).toContain('>codex-sol</tspan><tspan class="s">  Sol 6.1 · high</tspan>')
  expect(terminal).toContain('codex-sol · Sol 6.1 · high')
})

test('a row with no accounting reading shows only its elapsed time', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [relay({ startedAt: 0, endedAt: 30_000 })])
  expect(statsOf((await panelOf($)).rows[0]!)).toBe('0:30')
})

test('row stats show known context, tokens, cost and time', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [run('worker', { steps: 1, contextTokens: 100_000, costUsd: 0.42, status: 'done', endedAt: 30_000 })])
  expect(statsOf((await panelOf($)).rows[0]!)).toBe('ctx 10% · 100k ≈$0.42 0:30')
})

test('a Codex row with known tokens and unknown pricing omits cost', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [relay()])
  state.seed('usage', { statuses: { 'run-one': { ...READINGS.statuses['run-one']!, model: 'custom-model' } } })
  expect(statsOf((await panelOf($)).rows[0]!)).toBe('1.1M 0:00')
})

test('Claude plan usage comes from the engine session usage API', async ($, on) => {
  engine(on, { infos: [] })
  on('session.usage', () => ({ value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: CLAUDE_LIMITS } }))
  await start($)
  expect((await panelOf($)).header).toContain('5h  41%')
})
test('Claude usage polls after a minute and retains the last reading on failure', async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0)
  let reads = 0
  on('session.usage', () => {
    reads++
    if (reads === 4) throw new Error('unavailable')
    return { value: { startedAt: 0, context: { window: 1_000_000 }, rateLimits: reads === 1 ? CLAUDE_LIMITS : [{ ...CLAUDE_LIMITS[0]!, percentUsed: 55 }] } }
  })
  await start($)
  await clock.advance(59_000)
  expect(reads).toBe(1)
  await clock.advance(1_000)
  expect(reads).toBe(2)
  expect(state.usage().claude?.fiveHour?.percentUsed).toBe(55)
  await clock.advance(60_000)
  expect(reads).toBe(3)
  expect(state.usage().claudeReadAt).toBe(120_000)
  await clock.advance(60_000)
  expect(reads).toBe(4)
  expect(state.usage().claude?.fiveHour?.percentUsed).toBe(55)
  expect(state.usage().claudeReadAt).toBe(120_000)
  expect((await panelOf($)).header).toContain(' · 1m ago')
})

test('Claude session.measure refreshes the plan windows', async ($, on) => {
  engine(on, { infos: [] })
  on('session.measure', ($, e) => ({ changed: e.changed }))
  await start($)
  await $.session.measure({ context: { window: 1_000_000 }, rateLimits: CLAUDE_LIMITS, changed: ['rateLimits'] })
  expect((await panelOf($)).header).toContain('5h  41%')
})
test('the rendered totals show each familys own cost', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [relay({ tokens: 500, costUsd: 0.42 })])
  state.seed('usage', READINGS)
  expect((await panelOf($)).terminal).toContain('Claude $0.42 · Codex $1.48')
})

const resume = ($: Engine, title = 'old title', name?: string) => $.agent.spawn({ tool_use_id: 'resume-tool',
  prompt: 'Do the next task.', description: title, subagentType: 'savvy-flow:savvy-careful',
  provider: { plugin: 'engine', tier: 'core' }, parentModel: 'claude-opus-5-5', background: true, fork: false,
  resume: { agentId: 'worker' }, ...(name ? { name } : {}) })

// Contract fixture, not a live capture: 2.1.295's tool adapter flattens arguments;
// SendMessage's direct-agent resume reuses the loop instead of calling agent.spawn.
const REUSED_RELAY_SEND = { tool: 'SendMessage', tool_use_id: 'send-plan-design', to: 'worker',
  summary: "Fit plan usage into the panel's own design", message: 'Implement the requested panel design.' } satisfies Parameters<Engine['tool']['call']>[0]
const REUSED_RELAY_STEP = { turnId: 'resumed-relay-turn', index: 0, model: 'claude-opus-5-5', messageCount: 2, agentId: 'worker' } satisfies Parameters<Engine['turn']['step']>[0]

// 2.1.295 contract fixtures, not a live capture: the turn emitter has no
// background flag. Its roster maps an agent's own background work to `waiting`.
const WAITING_WORKER_STOP = { agentId: 'worker', turnId: 'waiting-turn', answer: 'Waiting for background work.',
  durationMs: 1000, isAborted: false, reason: 'answer' } satisfies Parameters<Engine['turn']['complete']>[0]
const WAITING_WORKER_INFO = { id: 'worker', description: 'Run background checks', type: 'savvy-codex-sol', status: 'waiting' } satisfies AgentInfo

test('a legacy Codex relay without a status file stays running when its roster says waiting', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker', { type: 'savvy-codex-sol' })])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(byId(state.agents(), 'worker')?.status).toBe('running')
})

test('a project worker waiting on background work stays running too', async ($, on) => {
  const { state } = engine(on, { infos: [{ ...WAITING_WORKER_INFO, type: 'code-reviewer' }] })
  state.seed(AGENTS, [run('worker', { type: 'code-reviewer' })])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(byId(state.agents(), 'worker')?.status).toBe('running')
})

test('a waiting worker with all reported steps stays below a full bar', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker', { stepDone: 4, stepTotal: 4 })])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(progressOf(byId(state.agents(), 'worker')!)).toBe(0.99)
})

test('a waiting worker with no reported steps does not get a full fallback bar', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker')])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(progressOf(byId(state.agents(), 'worker')!)).toBe(0)
})

test('a waiting worker has no finished checkmark in the panel', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker')])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect((await panelOf($)).terminal).not.toContain('✓')
})

test('periodic reconciliation keeps a waiting worker live', async ($, on) => {
  const { state, clock } = engine(on, { infos: [WAITING_WORKER_INFO] }, 0)
  state.seed(AGENTS, [run('worker')])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  await clock.advance(10_000)
  expect(byId(state.agents(), 'worker')?.status).toBe('running')
})

test('a waiting worker keeps its elapsed clock open', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker')])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(byId(state.agents(), 'worker')?.endedAt).toBeUndefined()
})

for (const status of ['completed', 'idle', 'failed', 'killed'] as const) {
  test(`a waiting worker settles when its roster changes to ${status}`, async ($, on) => {
    const listed = { infos: [WAITING_WORKER_INFO] as AgentInfo[] }
    const { state, clock } = engine(on, listed, 0)
    state.seed(AGENTS, [run('worker')])
    on('turn.complete', () => ({ text: '' }))
    await start($)
    await $.turn.complete(WAITING_WORKER_STOP)
    listed.infos = [{ ...WAITING_WORKER_INFO, status }]
    await clock.advance(5000)
    expect(byId(state.agents(), 'worker')?.status).toBe(status === 'completed' || status === 'idle' ? 'done' : 'failed')
  })
}

test('a final roster completion releases a waiting workers full bar', async ($, on) => {
  const listed = { infos: [WAITING_WORKER_INFO] as AgentInfo[] }
  const { state, clock } = engine(on, listed, 0)
  state.seed(AGENTS, [run('worker', { stepDone: 4, stepTotal: 4 })])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  listed.infos = [{ ...WAITING_WORKER_INFO, status: 'completed' }]
  await clock.advance(5000)
  expect(progressOf(byId(state.agents(), 'worker')!)).toBe(1)
})

test('an answer cannot briefly finish a worker before the roster publishes its wait', async ($, on) => {
  const listed = { infos: [{ ...WAITING_WORKER_INFO, status: 'running' }] as AgentInfo[] }
  const { state, clock } = engine(on, listed, 0)
  state.seed(AGENTS, [run('worker', { stepDone: 4, stepTotal: 4 })])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(byId(state.agents(), 'worker')).toMatchObject({ status: 'running', pendingCompletion: true })
  listed.infos = [WAITING_WORKER_INFO]
  await clock.advance(5000)
  expect(byId(state.agents(), 'worker')).toMatchObject({ status: 'running', isWaiting: true })
})

test('a just-ended worker whose roster is still running has a capped bar', async ($, on) => {
  const { state } = engine(on, { infos: [{ ...WAITING_WORKER_INFO, status: 'running' }] })
  state.seed(AGENTS, [run('worker', { stepDone: 4, stepTotal: 4 })])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(progressOf(byId(state.agents(), 'worker')!)).toBe(0.99)
})

test('a normal finish settles after the roster completes its asynchronous cleanup', async ($, on) => {
  const listed = { infos: [{ ...WAITING_WORKER_INFO, status: 'running' }] as AgentInfo[] }
  const { state, clock } = engine(on, listed, 0)
  state.seed(AGENTS, [run('worker')])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  listed.infos = [{ ...WAITING_WORKER_INFO, status: 'completed' }]
  await clock.advance(5000)
  expect(byId(state.agents(), 'worker')?.status).toBe('done')
})

test('reload repairs a previously finished row that the roster now reports as waiting', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker', { status: 'done', endedAt: 1000 })])
  await start($)
  expect(byId(state.agents(), 'worker')).toMatchObject({ status: 'running', isWaiting: true })
})

test('another workers wait does not keep a genuinely completed worker running', async ($, on) => {
  const { state } = engine(on, { infos: [{ ...WAITING_WORKER_INFO, status: 'completed' }, { ...WAITING_WORKER_INFO, id: 'other-worker' }] })
  state.seed(AGENTS, [run('worker')])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(byId(state.agents(), 'worker')?.status).toBe('done')
})

// The worker's report delivered through the host's hand-back tool ends its run, while
// a command it left in the background keeps the roster saying `waiting`.
const HANDBACK = { tool: 'SubagentHandback', agentId: 'worker', message: 'Report.' } as unknown as Parameters<Engine['tool']['call']>[0]
const handingBack = (on: On) =>
  on('tool.call', (_, e, next) => ((e.tool as string) === 'SubagentHandback' ? { result: 'delivered' } : next(e)))

test('a worker that handed back its report is done though the roster holds its background work', async ($, on) => {
  const { state, clock } = engine(on, { infos: [{ ...WAITING_WORKER_INFO, type: 'savvy-flow:savvy-medium' }] }, 0)
  state.seed(AGENTS, [run('worker', { type: 'savvy-flow:savvy-medium', stepDone: 6, stepTotal: 6 })])
  state.seed(FLOW, flowOf({ running: 1 }))
  on('turn.complete', () => ({ text: '' }))
  handingBack(on)
  await start($)
  await $.tool.call(HANDBACK)
  await $.turn.complete(WAITING_WORKER_STOP)
  await clock.advance(10_000)
  expect(byId(state.agents(), 'worker')).toMatchObject({ status: 'done', isHandedBack: true, leftBackground: true })
  expect(progressOf(byId(state.agents(), 'worker')!)).toBe(1)
  expect(state.flow()?.running).toBe(0)
  expect(await bar($)).toBe('Fix bug: Tasks 0/2, 0%')
  expect((await panelOf($)).terminal).toContain('background work left running')
})

test('a reload leaves a handed-back worker finished while the roster still says waiting', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker', { status: 'done', endedAt: 1000, isHandedBack: true })])
  await start($)
  expect(byId(state.agents(), 'worker')).toMatchObject({ status: 'done', endedAt: 1000, leftBackground: true })
})

test('a handed-back worker the host wakes again runs again, as a run that has not reported', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  answering(on)
  await start($)
  await spawn($, 'w1')
  state.seed(AGENTS, state.agents().map(a => ({ ...a, status: 'done' as const, isHandedBack: true, leftBackground: true })))
  await stepOf($, 'w1', 0)
  expect(byId(state.agents(), 'w1')).toMatchObject({ status: 'running' })
  expect(byId(state.agents(), 'w1')?.isHandedBack).toBeUndefined()
  expect(byId(state.agents(), 'w1')?.leftBackground).toBeUndefined()
})

test('the tool call a worker has been in for a while shows on its row with its time', async ($, on) => {
  const { state, clock } = engine(on, { infos: [{ ...WAITING_WORKER_INFO, status: 'running' }] }, 0)
  state.seed(AGENTS, [run('worker', { stepDone: 1, stepTotal: 4, stepNote: 'reading the config' })])
  let release = (): void => undefined
  on('tool.call', { tool: 'Bash' }, () => new Promise(resolve => {
    release = () => resolve({ result: { stdout: '', stderr: '', interrupted: false } })
  }))
  await start($)
  const call = $.tool.call({ tool: 'Bash', agentId: 'worker', command: 'npm test', description: 'Run the full test suite' })
  await clock.advance(5000)
  expect((await panelOf($)).terminal).toContain('1/4 · reading the config')
  await clock.advance(40_000)
  expect((await panelOf($)).terminal).toContain('1/4 · Bash: Run the full test suite · 0:45')
  release()
  await call
  expect(byId(state.agents(), 'worker')?.activity).toBeUndefined()
  // The panel redraws on its once-a-second tick.
  await clock.advance(1000)
  expect((await panelOf($)).terminal).toContain('1/4 · reading the config')
})

test('a worker parked on its background work says so on its row, with the time it has waited', async ($, on) => {
  const listed = { infos: [{ ...WAITING_WORKER_INFO, status: 'running' }] as AgentInfo[] }
  const { state, clock } = engine(on, listed, 0)
  state.seed(AGENTS, [run('worker', { stepDone: 2, stepTotal: 4, stepNote: 'running the suite' })])
  answering(on)
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  listed.infos = [WAITING_WORKER_INFO]
  await clock.advance(5000)
  await clock.advance(60_000)
  expect((await panelOf($)).terminal).toContain('2/4 · waiting on background work · 1:00')
  // Woken by its work, it is at work again: the note comes back.
  await stepOf($, 'worker', 0)
  await clock.advance(1000)
  expect(byId(state.agents(), 'worker')?.waitingSince).toBeUndefined()
  expect((await panelOf($)).terminal).toContain('2/4 · running the suite')
})

test('a tool call names the action, a file by its own name on any system', () => {
  expect(activityOf({ tool: 'Bash', command: 'npm test -- --run', description: 'Run the unit tests' })).toBe('Bash: Run the unit tests')
  expect(activityOf({ tool: 'Bash', command: '  pnpm   build' })).toBe('Bash: pnpm')
  expect(activityOf({ tool: 'Read', file_path: 'C:\\repo\\src\\app.ts' })).toBe('Read: app.ts')
  expect(activityOf({ tool: 'Edit', file_path: '/repo/src/app.ts' })).toBe('Edit: app.ts')
  expect(activityOf({ tool: 'Grep', pattern: 'TODO' })).toBe('Grep: TODO')
  expect(activityOf({ tool: 'mcp__tracker__get_issue' })).toBe('get_issue')
})

test('an aborted worker is not kept alive by an old waiting roster entry', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker')])
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete({ ...WAITING_WORKER_STOP, reason: 'aborted', isAborted: true })
  expect(byId(state.agents(), 'worker')?.status).toBe('failed')
})

test('a waiting planned worker keeps an accepted flow below one hundred percent', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] })
  state.seed(AGENTS, [run('worker')])
  state.seed(FLOW, flowOf({ done: 1, total: 1 }))
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(await bar($)).toContain('99%')
})

test('opt-in tracing records the actual turn stop fields', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] }, 0, { SAVVY_PROGRESS_DEBUG_RESUME: '1' })
  state.seed(AGENTS, [run('worker')])
  const logs: string[] = []
  on('ui.log', (_, e) => { logs.push(e.text); return { value: undefined } })
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  const stop = logs.find(l => l.includes('"event":"turn.complete"')) ?? ''
  expect(stop).toContain('"agentId":"worker"')
  expect(stop).toContain('"reason":"answer"')
})

test('opt-in stop tracing records the workers authoritative waiting status', async ($, on) => {
  const { state } = engine(on, { infos: [WAITING_WORKER_INFO] }, 0, { SAVVY_PROGRESS_DEBUG_RESUME: '1' })
  state.seed(AGENTS, [run('worker')])
  const logs: string[] = []
  on('ui.log', (_, e) => { logs.push(e.text); return { value: undefined } })
  on('turn.complete', () => ({ text: '' }))
  await start($)
  await $.turn.complete(WAITING_WORKER_STOP)
  expect(logs.find(l => l.includes('"event":"agent.list:stop"'))).toContain('"status":"waiting"')
})

const reusedStep = async ($: Engine, over: Partial<typeof REUSED_RELAY_STEP> = {}) => {
  const stream = $.turn.step({ ...REUSED_RELAY_STEP, ...over })
  for await (const chunk of stream) void chunk
  return stream.result
}

test('SendMessage reuse applies its title before the next model request without a spawn', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('worker', { type: 'savvy-codex-sol', status: 'done',
    description: "Show each worker's model version in the panel" })])
  on('turn.step', async function* (_, e) {
    expect(byId(state.agents(), e.agentId!)?.description).toBe(REUSED_RELAY_SEND.summary)
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: 'end_turn' as const }
  })
  on('tool.call', { tool: 'SendMessage' }, async (_, e) => {
    expect(e.agentId).toBeUndefined()
    expect(e.summary).toBe(REUSED_RELAY_SEND.summary)
    await reusedStep($)
    return { result: { success: true, resumedAgentId: 'worker' } }
  })
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
})

test('a directly reused relay redraws its panel title', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('worker', { status: 'done' })])
  answering(on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  await reusedStep($)
  expect((await panelOf($)).rows[0]).toContain(REUSED_RELAY_SEND.summary)
})

test('a directly reused agent starts round one for a new title', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('worker', { status: 'done', round: 3 })])
  answering(on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  await reusedStep($)
  expect(byId(state.agents(), 'worker')?.round).toBe(1)
})

test('a directly reused agent increments the round only once for the same title', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('worker', { description: REUSED_RELAY_SEND.summary, status: 'done' })])
  answering(on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  await reusedStep($)
  await reusedStep($, { index: 1 })
  expect(byId(state.agents(), 'worker')?.round).toBe(2)
})

test('a queued title does not rename another step of the current turn', async ($, on) => {
  const { state } = engine(on, { infos: [info('worker', 'running')] })
  state.seed(AGENTS, [run('worker', { description: 'current task', turnId: REUSED_RELAY_STEP.turnId })])
  answering(on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  await reusedStep($, { index: 1 })
  expect(byId(state.agents(), 'worker')?.description).toBe('current task')
})

test('a queued title takes effect on the next turn of a running loop', async ($, on) => {
  const { state } = engine(on, { infos: [info('worker', 'running')] })
  state.seed(AGENTS, [run('worker', { description: 'current task', turnId: 'previous-turn' })])
  answering(on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  await reusedStep($)
  expect(byId(state.agents(), 'worker')?.description).toBe(REUSED_RELAY_SEND.summary)
})

test('a failed SendMessage result cannot leave a queued title for a later turn', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('worker', { description: 'old title', status: 'done' })])
  answering(on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: false, message: 'not delivered' } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  await reusedStep($)
  expect(byId(state.agents(), 'worker')?.description).toBe('old title')
})

test('direct reuse clears the previous tasks progress', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('worker', { status: 'done', stepDone: 4, stepTotal: 4, stepNote: 'old action', stepSkipped: 1 })])
  answering(on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  await reusedStep($)
  expect(byId(state.agents(), 'worker')?.stepTotal).toBeUndefined()
  expect(byId(state.agents(), 'worker')?.stepNote).toBeUndefined()
})

test('resume tracing is silent by default', async ($, on) => {
  engine(on, { infos: [] })
  const logs: string[] = []
  on('ui.log', (_, e) => { logs.push(e.text); return { value: undefined } })
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  expect(logs).toEqual([])
})

test('opt-in resume tracing records main-session SendMessage routing fields', async ($, on) => {
  engine(on, { infos: [] }, 0, { SAVVY_PROGRESS_DEBUG_RESUME: '1' })
  const logs: string[] = []
  on('ui.log', (_, e) => { expect(e.to).toBe('debug'); logs.push(e.text); return { value: undefined } })
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call(REUSED_RELAY_SEND)
  const call = logs.find(l => l.includes('"event":"tool.call:SendMessage"')) ?? ''
  expect(call).toContain('"to":"worker"')
  expect(call).toContain('"summary":"Fit plan usage into the panel\'s own design"')
})

test('opt-in resume tracing records a reused agents model event', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0, { SAVVY_PROGRESS_DEBUG_RESUME: '1' })
  state.seed(AGENTS, [run('worker', { status: 'done', nextTitle: REUSED_RELAY_SEND.summary })])
  answering(on)
  const logs: string[] = []
  on('ui.log', (_, e) => { logs.push(e.text); return { value: undefined } })
  await start($)
  await reusedStep($)
  const step = logs.find(l => l.includes('"event":"turn.step"')) ?? ''
  expect(step).toContain('"agentId":"worker"')
  expect(step).toContain('"turnId":"resumed-relay-turn"')
})

test('opt-in resume tracing records an explicit spawn resume', async ($, on) => {
  engine(on, { infos: [] }, 0, { SAVVY_PROGRESS_DEBUG_RESUME: '1' })
  const logs: string[] = []
  on('ui.log', (_, e) => { logs.push(e.text); return { value: undefined } })
  await start($)
  await resume($)
  expect(logs.find(l => l.includes('"event":"agent.spawn"'))).toContain('"resume":{"agentId":"worker"}')
})

test('resume tracing records message shape without the message body', async ($, on) => {
  engine(on, { infos: [] }, 0, { SAVVY_PROGRESS_DEBUG_RESUME: '1' })
  const logs: string[] = []
  on('ui.log', (_, e) => { logs.push(e.text); return { value: undefined } })
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await $.tool.call({ ...REUSED_RELAY_SEND, message: 'private task body' })
  expect(logs.join('\n')).not.toContain('private task body')
  expect(logs.join('\n')).toContain('"message":{"type":"string","length":17}')
})

test('a reload keeps a first run at round one', async ($, on) => {
  const { state } = engine(on, { infos: [info('worker', 'running')] })
  state.seed(AGENTS, [run('worker', { description: 'old title' })])
  await start($)
  await start($)
  expect(byId(state.agents(), 'worker')?.round).toBe(1)
})

test('reload reconciliation deduplicates rows by agent id', async ($, on) => {
  const { state } = engine(on, { infos: [info('worker', 'running')] })
  state.seed(AGENTS, [run('tool-id', { agentId: 'worker' }), run('worker')])
  await start($)
  expect(state.agents().map(a => [a.agentId, a.round])).toEqual([['worker', 1]])
})

test('a new agent on the same title starts at round one', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('worker', { description: 'same title', status: 'done', round: 3 })])
  await start($)
  await spawn($, 'same title')
  expect(byId(state.agents(), 'same title')?.round).toBe(1)
})

test('a repeated initial spawn after reload stays at round one', async ($, on) => {
  const { state } = engine(on, { infos: [info('worker', 'running')] })
  state.seed(AGENTS, [run('tool-id', { agentId: 'worker', description: 'worker' })])
  await start($)
  await spawn($, 'worker')
  expect(state.agents().map(a => [a.agentId, a.round])).toEqual([['worker', 1]])
})

test('a resumed worker takes the new SendMessage summary as its task title', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  on('tool.call', { tool: 'SendMessage' }, async () => {
    await resume($)
    return { result: 'sent' }
  })
  state.seed(AGENTS, [run('worker', { description: 'old title', status: 'done', round: 2 })])
  await start($)
  await $.tool.call({ tool: 'SendMessage', to: 'worker', summary: 'Fix collision lookup', message: 'Implement the next task.' })
  expect(byId(state.agents(), 'worker')?.description).toBe('Fix collision lookup')
})
test('a different resumed task starts at round one', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  on('tool.call', { tool: 'SendMessage' }, async () => { await resume($); return { result: 'sent' } })
  state.seed(AGENTS, [run('worker', { description: 'old title', status: 'done', round: 3, stepDone: 4, stepTotal: 4 })])
  await start($)
  await $.tool.call({ tool: 'SendMessage', to: 'worker', summary: 'Run EditMode tests', message: 'Run the tests.' })
  expect(byId(state.agents(), 'worker')).toMatchObject({ description: 'Run EditMode tests', round: 1 })
  expect(byId(state.agents(), 'worker')?.stepTotal).toBeUndefined()
})
test('returning to the same task starts round two', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(AGENTS, [run('worker', { description: 'old title', status: 'done' })])
  await start($)
  await resume($)
  expect(byId(state.agents(), 'worker')?.round).toBe(2)
})
test('a queued SendMessage summary survives until the later resume', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: 'queued' }))
  state.seed(AGENTS, [run('worker', { name: 'scout', description: 'old title', status: 'done' })])
  await start($)
  await $.tool.call({ tool: 'SendMessage', to: 'scout', summary: 'Inspect CreatureProbe.cs', message: 'Inspect the next task.' })
  expect(byId(state.agents(), 'worker')?.description).toBe('old title')
  await resume($)
  expect(byId(state.agents(), 'worker')?.description).toBe('Inspect CreatureProbe.cs')
})
test('a denied SendMessage does not relabel a future resume', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  on('tool.call', { tool: 'SendMessage' }, () => ({ deny: 'not delivered' }))
  state.seed(AGENTS, [run('worker', { description: 'old title', status: 'done' })])
  await start($)
  await $.tool.call({ tool: 'SendMessage', to: 'worker', summary: 'Undelivered task', message: 'Next task.' })
  await resume($)
  expect(byId(state.agents(), 'worker')?.description).toBe('old title')
})

test('a running snapshot older than fifteen seconds releases a completed relay', () => {
  const usage = { ...READINGS, statuses: { 'run-one': { ...READINGS.statuses['run-one']!, state: 'running' as const, updatedAt: 1000 } } }
  const row = codexRun(relay({ status: 'running', relayStatus: 'done', relayEndedAt: 1000 }), usage, 16_001)
  expect(row.status).toBe('done')
  expect(row.codexState).toBeUndefined()
})
test('a stale running snapshot falls back to the relay failure state', () => {
  const usage = { ...READINGS, statuses: { 'run-one': { ...READINGS.statuses['run-one']!, state: 'running' as const, updatedAt: 1000 } } }
  expect(codexRun(relay({ status: 'running', relayStatus: 'failed' }), usage, 16_001).status).toBe('failed')
})
test('a stale Codex snapshot leaves an active relay running on its own', () => {
  const usage = { ...READINGS, statuses: { 'run-one': { ...READINGS.statuses['run-one']!, state: 'running' as const, updatedAt: 1000 } } }
  const row = codexRun(relay({ status: 'running', relayStatus: 'running' }), usage, 16_001)
  expect(row.status).toBe('running')
  expect(row.codexState).toBeUndefined()
})
test('a snapshot exactly fifteen seconds old is still fresh', () => {
  const usage = { ...READINGS, statuses: { 'run-one': { ...READINGS.statuses['run-one']!, state: 'running' as const, updatedAt: 1000 } } }
  expect(codexRun(relay(), usage, 16_000).codexState).toBe('running')
})
test('a renewed heartbeat revives a Codex row after the prior snapshot went stale', () => {
  const usage = { ...READINGS, statuses: { 'run-one': { ...READINGS.statuses['run-one']!, state: 'running' as const, updatedAt: 1000 } } }
  const stale = codexRun(relay({ relayStatus: 'done' }), usage, 16_001)
  usage.statuses['run-one']!.updatedAt = 20_000
  expect(codexRun(stale, usage, 21_000).status).toBe('running')
})
test('stale heartbeats stop holding an accepted flow below one hundred percent', async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  statusFiles(on, { ...STATUS_ONE, state: 'running' })
  state.seed(AGENTS, [relay()])
  state.seed(FLOW, flowOf({ total: 1, done: 1 }))
  await start($)
  await clock.advance(18_000)
  expect(byId(state.agents(), 'relay')?.status).toBe('done')
  expect(await bar($)).toContain('100%')
})

// Budget fixtures never consult the real session, Codex directory, clock or locale.
const BUDGET_AT = Date.parse('2026-11-12T12:00:00Z')
const MINUTE = 60_000
const BUDGET_FORMAT = { locale: 'en-GB', timeZone: 'UTC' }
const budgetWindow = (percentUsed = 60, key: keyof PlanUsage = 'fiveHour', elapsedMinutes = key === 'fiveHour' ? 150 : 5040) =>
  ({ percentUsed, resetsAt: new Date(BUDGET_AT + ((key === 'fiveHour' ? 300 : 10080) - elapsedMinutes) * MINUTE).toISOString() })

type BudgetFixtures = {
  env?: Record<string, string>
  rateLimits?: () => SessionRateLimit[]
  status?: typeof STATUS_ONE
}

// What the user has typed so far, as the transcript the decide tool reads their words from.
let transcript: { role: 'user' | 'assistant'; text: string; toolUses: [] }[] = []
const say = (text: string): void => void transcript.push({ role: 'user', text, toolUses: [] })

const budgetEngine = (on: On, fixtures: BudgetFixtures = {}) => {
  const fixture = engine(on, { infos: [] }, BUDGET_AT, fixtures.env)
  transcript = []
  on('session.messages', () => ({ value: transcript }))
  on('session.usage', () => ({ value: { startedAt: BUDGET_AT, context: { window: 1_000_000 }, rateLimits: fixtures.rateLimits?.() ?? [] } }))
  // Select one filesystem mock; the harness rejects registering a replacement.
  if (fixtures.status) return { ...fixture, files: statusFiles(on, fixtures.status) }
  on('fs.list', () => ({ value: [] }))
  return { ...fixture, files: undefined }
}

const budgetCommand = ($: Engine, args = '') => $.command.run({ ...typed(args), command: 'savvy-budget' })
const readBudget = ($: Engine) => $.tool.call({ tool: 'mcp__savvy-progress__budget' })

test('average budget pace uses each rolling window start and can exceed one hundred', () => {
  expect(projectPlanWindow(budgetWindow(), 'fiveHour', BUDGET_AT)).toEqual({
    projectedAtReset: 120, exhaustsAt: new Date(BUDGET_AT + 100 * MINUTE).toISOString(), pace: 'average', fits: false,
  })
  expect(projectPlanWindow(budgetWindow(60, 'week'), 'week', BUDGET_AT)).toEqual({
    projectedAtReset: 120, exhaustsAt: new Date(BUDGET_AT + 3360 * MINUTE).toISOString(), pace: 'average', fits: false,
  })
})

test('a projection exactly at the limit fits and has no early exhaustion', () => {
  expect(projectPlanWindow(budgetWindow(50), 'fiveHour', BUDGET_AT)).toEqual({ projectedAtReset: 100, pace: 'average', fits: true })
})

test('zero usage, too early, invalid and already reset windows have no projection', () => {
  expect(projectPlanWindow(budgetWindow(0), 'fiveHour', BUDGET_AT)).toBeUndefined()
  expect(projectPlanWindow(budgetWindow(10, 'fiveHour', 4), 'fiveHour', BUDGET_AT)).toBeUndefined()
  expect(projectPlanWindow(budgetWindow(1, 'fiveHour', 5), 'fiveHour', BUDGET_AT)?.pace).toBe('average')
  expect(projectPlanWindow(budgetWindow(60, 'fiveHour', 300), 'fiveHour', BUDGET_AT)).toBeUndefined()
  expect(projectPlanWindow(budgetWindow(60, 'fiveHour', 301), 'fiveHour', BUDGET_AT)).toBeUndefined()
  expect(projectPlanWindow({ percentUsed: 10 }, 'fiveHour', BUDGET_AT)).toBeUndefined()
  expect(projectPlanWindow({ percentUsed: 10, resetsAt: 'invalid' }, 'fiveHour', BUDGET_AT)).toBeUndefined()
  expect(projectPlanWindow({ ...budgetWindow(), percentUsed: NaN }, 'fiveHour', BUDGET_AT)).toBeUndefined()
})

test('recent five-hour pace starts at fifteen minutes of coverage', () => {
  const plan = { fiveHour: budgetWindow(40) }
  const previous = recordPlanUsage({ statuses: {} }, 'claude', { fiveHour: budgetWindow(10) }, BUDGET_AT - 15 * MINUTE)
  const usage = recordPlanUsage(previous, 'claude', plan, BUDGET_AT)
  expect(projectPlanWindow(plan.fiveHour, 'fiveHour', BUDGET_AT, usage.history?.claude?.fiveHour)).toEqual({
    projectedAtReset: 340, exhaustsAt: new Date(BUDGET_AT + 30 * MINUTE).toISOString(), pace: 'recent', fits: false,
  })
  const short = recordPlanUsage({ statuses: {} }, 'claude', { fiveHour: budgetWindow(10) }, BUDGET_AT - 15 * MINUTE + 1)
  const notEnough = recordPlanUsage(short, 'claude', plan, BUDGET_AT)
  expect(projectPlanWindow(plan.fiveHour, 'fiveHour', BUDGET_AT, notEnough.history?.claude?.fiveHour)?.pace).toBe('average')
})

test('weekly recent pace needs three hours and a plateau projects no further spending', () => {
  const plan = { week: budgetWindow(40, 'week') }
  const previous = recordPlanUsage({ statuses: {} }, 'codex', plan, BUDGET_AT - 180 * MINUTE)
  const usage = recordPlanUsage(previous, 'codex', plan, BUDGET_AT)
  expect(projectPlanWindow(plan.week, 'week', BUDGET_AT, usage.history?.codex?.week)).toEqual({
    projectedAtReset: 40, pace: 'recent', fits: true,
  })
  const short = recordPlanUsage({ statuses: {} }, 'codex', plan, BUDGET_AT - 180 * MINUTE + 1)
  expect(projectPlanWindow(plan.week, 'week', BUDGET_AT, recordPlanUsage(short, 'codex', plan, BUDGET_AT).history?.codex?.week)?.pace).toBe('average')
})

test('history is immutable, bounded by age and sampled once per minute even for frequent Codex files', () => {
  const original: UsageReadings = { statuses: {} }
  let usage = original
  const plan = { fiveHour: budgetWindow(10), week: budgetWindow(10, 'week') }
  for (let seconds = 0; seconds <= 7 * 60 * 60; seconds += 3) {
    usage = recordPlanUsage(usage, 'codex', plan, BUDGET_AT - 7 * 60 * MINUTE + seconds * 1000)
  }
  expect(original).toEqual({ statuses: {} })
  expect(usage.history?.codex?.fiveHour?.samples.length).toBeLessThanOrEqual(31)
  expect(usage.history?.codex?.week?.samples.length).toBeLessThanOrEqual(361)
  expect(usage.history?.codex?.fiveHour?.samples[0]?.at).toBeGreaterThanOrEqual(BUDGET_AT - 30 * MINUTE)
  expect(usage.history?.codex?.week?.samples[0]?.at).toBeGreaterThanOrEqual(BUDGET_AT - 360 * MINUTE)
})

test('each window clears its own history on a changed reset or decreasing percentage', () => {
  const plan = { fiveHour: budgetWindow(60), week: budgetWindow(60, 'week') }
  const initial = recordPlanUsage(recordPlanUsage({ statuses: {} }, 'codex', plan, BUDGET_AT - MINUTE), 'claude', plan, BUDGET_AT - MINUTE)
  const changed = recordPlanUsage(initial, 'claude', { ...plan, fiveHour: budgetWindow(61, 'fiveHour', 149) }, BUDGET_AT)
  expect(changed.history?.claude?.fiveHour?.samples).toEqual([{ at: BUDGET_AT, percentUsed: 61 }])
  expect(changed.history?.claude?.week?.samples).toHaveLength(2)
  expect(changed.history?.codex).toEqual(initial.history?.codex)
  const dropped = recordPlanUsage(initial, 'claude', { ...plan, week: budgetWindow(59, 'week') }, BUDGET_AT)
  expect(dropped.history?.claude?.week?.samples).toEqual([{ at: BUDGET_AT, percentUsed: 59 }])
  expect(dropped.history?.claude?.fiveHour?.samples).toHaveLength(2)
})

test('stale recent history falls back to the average and wrong-window history is ignored', () => {
  const plan = { fiveHour: budgetWindow(40) }
  const old = recordPlanUsage(recordPlanUsage({ statuses: {} }, 'claude', plan, BUDGET_AT - 60 * MINUTE), 'claude', plan, BUDGET_AT - 40 * MINUTE)
  expect(projectPlanWindow(plan.fiveHour, 'fiveHour', BUDGET_AT, old.history?.claude?.fiveHour)?.pace).toBe('average')
  const recent = recordPlanUsage(recordPlanUsage({ statuses: {} }, 'claude', plan, BUDGET_AT - 20 * MINUTE), 'claude', plan, BUDGET_AT)
  expect(projectPlanWindow(budgetWindow(40, 'fiveHour', 149), 'fiveHour', BUDGET_AT, recent.history?.claude?.fiveHour)?.pace).toBe('average')
})

test('the budget summary exposes per-window values and user policy verdicts', () => {
  const usage: UsageReadings = { statuses: {}, claude: { fiveHour: budgetWindow(), week: budgetWindow(20, 'week') },
    codex: { fiveHour: budgetWindow(), week: budgetWindow(20, 'week') }, policies: { claude: 'within', codex: 'full' } }
  expect(budgetSummary(usage, BUDGET_AT)).toEqual({
    claude: {
      fiveHour: { used: 60, resetsAt: budgetWindow().resetsAt, projectedAtReset: 120,
        exhaustsAt: new Date(BUDGET_AT + 100 * MINUTE).toISOString(), pace: 'average', policy: 'within', verdict: 'ask' },
      week: { used: 20, resetsAt: budgetWindow(20, 'week').resetsAt, projectedAtReset: 40, exhaustsAt: null, pace: 'average', policy: 'within', verdict: 'ok' },
    },
    codex: {
      fiveHour: { used: 60, resetsAt: budgetWindow().resetsAt, projectedAtReset: 120,
        exhaustsAt: new Date(BUDGET_AT + 100 * MINUTE).toISOString(), pace: 'average', policy: 'full', verdict: 'over' },
      week: { used: 20, resetsAt: budgetWindow(20, 'week').resetsAt, projectedAtReset: 40, exhaustsAt: null, pace: 'average', policy: 'full', verdict: 'ok' },
    },
    gemini: {},
  })
})

test('budget summary leaves absent windows out and unknown projections null', () => {
  expect(budgetSummary({ statuses: {} }, BUDGET_AT)).toEqual({ claude: {}, codex: {}, gemini: {} })
  expect(budgetSummary({ statuses: {}, claude: { fiveHour: { percentUsed: 12 } }, codex: { week: budgetWindow(90, 'week', 10081) } }, BUDGET_AT)).toEqual({
    claude: { fiveHour: { used: 12, resetsAt: null, projectedAtReset: null, exhaustsAt: null, pace: null, policy: 'pace', verdict: 'ok' } },
    codex: { week: { used: 0, resetsAt: budgetWindow(90, 'week', 10081).resetsAt, projectedAtReset: null, exhaustsAt: null, pace: null, policy: 'pace', verdict: 'ok' } },
    gemini: {},
  })
})

test('budget windows retain observed usage at the reset instant and clear it strictly after', () => {
  for (const family of ['claude', 'codex'] as const) {
    const plan = { fiveHour: budgetWindow(65, 'fiveHour', 300), week: budgetWindow(65, 'week', 10080) }
    const usage: UsageReadings = { statuses: {}, [family]: plan }
    expect(budgetSummary(usage, BUDGET_AT)[family]).toMatchObject({ fiveHour: { used: 65 }, week: { used: 65 } })
    expect(budgetSummary(usage, BUDGET_AT + 1)[family]).toMatchObject({ fiveHour: { used: 0 }, week: { used: 0 } })
    const tile = planTile(0, 0, 600, family, plan, '#000', BUDGET_AT, BUDGET_AT, BUDGET_FORMAT)
    expect(tile).toContain('5h  65%')
    expect(tile).toContain('7d  65%')
    expect(tile).not.toContain('0% reset')
  }
})

test('budget command lists defaults and persists only the chosen family through reload', async ($, on) => {
  const { state, registered } = budgetEngine(on)
  await start($)
  expect(registered.some(tool => tool.name === 'budget')).toBe(true)
  expect(await budgetCommand($)).toMatchObject({ text: 'Budget: Claude pace · Codex pace · Gemini pace.' })
  expect(await budgetCommand($, 'codex full')).toMatchObject({ text: 'Budget: Claude pace · Codex full · Gemini pace.' })
  expect(state.usage().policies).toEqual({ codex: 'full' })
  await start($)
  expect(await budgetCommand($)).toMatchObject({ text: 'Budget: Claude pace · Codex full · Gemini pace.' })
  expect(await budgetCommand($, 'codex within')).toMatchObject({ text: 'Budget: Claude pace · Codex within · Gemini pace.' })
})

test('budget command rejects missing, extra or invalid arguments without changing policies', async ($, on) => {
  const { state } = budgetEngine(on)
  await start($)
  for (const args of ['claude', 'both full', 'claude unlimited', 'claude full extra']) {
    expect(await budgetCommand($, args)).toMatchObject({ text: 'Usage: /savvy-budget <claude|codex|gemini> <within|full|pace|once>' })
  }
  expect(state.usage().policies).toBeUndefined()
})

test('progress returns the budget and the read-only tool leaves the bar and agents untouched', async ($, on) => {
  const { state } = budgetEngine(on)
  await start($)
  state.seed('usage', { statuses: {}, claude: { fiveHour: budgetWindow() } })
  const expected = budgetSummary(state.usage(), BUDGET_AT)
  expect((await report($)).result).toBe(`ok: Tasks 0/2\nbudget: ${JSON.stringify(expected)}`)
  state.seed(AGENTS, [run('kept', { status: 'done' })])
  const before = { flow: state.flow(), agents: state.agents() }
  const writes = state.written.length
  expect((await readBudget($)).result).toBe(`budget: ${JSON.stringify(expected)}`)
  expect({ flow: state.flow(), agents: state.agents() }).toEqual(before)
  expect(state.written.slice(writes)).toEqual([])
})

test('progress result is a string with the acknowledgement first and a parseable budget line', async ($, on) => {
  const { state } = budgetEngine(on)
  await start($)
  state.seed('usage', { statuses: {}, claude: { fiveHour: budgetWindow(), week: budgetWindow(20, 'week') },
    codex: { fiveHour: budgetWindow() }, policies: { codex: 'full' } })
  const expected = budgetSummary(state.usage(), BUDGET_AT)
  const result = (await report($)).result
  expect(typeof result).toBe('string')
  const [acknowledgement, budgetLine, ...extra] = (result as string).split('\n')
  expect(acknowledgement).toBe('ok: Tasks 0/2')
  expect(budgetLine).toMatch(/^budget: /)
  expect(JSON.parse(budgetLine!.slice('budget: '.length))).toEqual(expected)
  expect(extra).toEqual([])
})

test('read-only budget result is a string whose compact JSON parses back to the summary', async ($, on) => {
  const { state } = budgetEngine(on)
  await start($)
  state.seed('usage', { statuses: {}, claude: { fiveHour: budgetWindow() }, codex: { week: budgetWindow(20, 'week') } })
  const expected = budgetSummary(state.usage(), BUDGET_AT)
  const result = (await readBudget($)).result
  expect(typeof result).toBe('string')
  expect(result).toMatch(/^budget: /)
  expect(JSON.parse((result as string).slice('budget: '.length))).toEqual(expected)
  expect(result).toBe(`budget: ${JSON.stringify(expected)}`)
})

test('Claude polls and measure events add history without changing family policies', async ($, on) => {
  let used = 10
  const { clock, state } = budgetEngine(on, { rateLimits: () => [{ kind: 'five_hour', ...budgetWindow(used) }] })
  on('session.measure', (_, e) => ({ changed: e.changed }))
  await start($)
  await budgetCommand($, 'claude full')
  used = 12
  await clock.advance(MINUTE)
  expect(state.usage().history?.claude?.fiveHour?.samples).toEqual([{ at: BUDGET_AT, percentUsed: 10 }, { at: BUDGET_AT + MINUTE, percentUsed: 12 }])
  await $.session.measure({ context: { window: 1_000_000 }, rateLimits: [{ kind: 'five_hour', ...budgetWindow(2) }], changed: ['rateLimits'] })
  expect(state.usage().history?.claude?.fiveHour?.samples).toEqual([{ at: BUDGET_AT + MINUTE, percentUsed: 2 }])
  expect(state.usage().policies).toEqual({ claude: 'full' })
})

test('Codex history uses snapshot timestamps and never invents samples for unchanged files', async ($, on) => {
  const limits = { primary: { used_percent: 10, window_minutes: 300, resets_at: Date.parse(budgetWindow().resetsAt) / 1000 } }
  const { clock, state, files } = budgetEngine(on, { env: { HOME: '/home/budget-test' },
    status: { ...STATUS_ONE, rateLimits: { ...CODEX_LIMITS, ...limits }, updatedAt: BUDGET_AT - MINUTE } })
  await start($)
  await clock.advance(3000)
  expect(state.usage().history?.codex?.fiveHour?.samples).toEqual([{ at: BUDGET_AT - MINUTE, percentUsed: 10 }])
  files!.files['run-one'] = { text: JSON.stringify({ ...STATUS_ONE, rateLimits: { ...CODEX_LIMITS, primary: { ...limits.primary, used_percent: 20 } }, updatedAt: BUDGET_AT }), mtimeMs: BUDGET_AT }
  await clock.advance(3000)
  expect(state.usage().history?.codex?.fiveHour?.samples).toEqual([{ at: BUDGET_AT - MINUTE, percentUsed: 10 }, { at: BUDGET_AT, percentUsed: 20 }])
})

test('plan tiles show projected percent or exhaustion with policy colour and title', () => {
  const fitting = planTile(0, 0, 600, 'Claude', { fiveHour: budgetWindow(36) }, '#000', BUDGET_AT, BUDGET_AT, BUDGET_FORMAT)
  expect(fitting).toContain('→ 72%')
  expect(fitting).toContain('Claude · plan · pace')
  const over = planTile(0, 0, 600, 'Codex', { fiveHour: budgetWindow() }, '#000', BUDGET_AT, BUDGET_AT, { ...BUDGET_FORMAT, policy: 'full' })
  expect(over).toContain('100% ↯ Thu 13:40')
  expect(over).toContain('fill="#E0A526"')
  expect(over).toContain('Codex · plan · full')
  const within = planTile(0, 0, 600, 'Claude', { fiveHour: budgetWindow() }, '#000', BUDGET_AT, BUDGET_AT, { ...BUDGET_FORMAT, policy: 'within' })
  expect(within).toContain('fill="#D0453F"')
  expect(within).toContain('Claude · plan · within')
})

test('tiles drop projections before reset text at 360, 420, 480 and 600 pixels', () => {
  for (const width of [360, 420, 480, 600]) {
    const tileWidth = (width - 6) / 2
    const source = planTile(0, 0, tileWidth, 'Claude', { fiveHour: budgetWindow(36) }, '#000', BUDGET_AT, BUDGET_AT, BUDGET_FORMAT)
    expect(source).toContain('↻ 14:30')
    const fitsMarker = textWidth('5h  36%  ↻ 14:30  → 72% · 0m ago', 11) <= tileWidth - 18
    expect(source.includes('→ 72%')).toBe(fitsMarker)
    for (const match of source.matchAll(/<text[^>]*>(.*?)<\/text>/g)) {
      expect(textWidth(match[1]!.replace(/<[^>]*>/g, ''), 11)).toBeLessThanOrEqual(tileWidth - 18)
    }
  }
})

test('tiles and compact text share recent projections and each family gets only one warning', () => {
  const plan = { fiveHour: budgetWindow(40), week: budgetWindow(60, 'week') }
  const asking = { claude: 'within', codex: 'within' } as const
  const usage = recordPlanUsage(recordPlanUsage({ statuses: {}, codex: plan, policies: asking }, 'claude', { ...plan, fiveHour: budgetWindow(10) }, BUDGET_AT - 15 * MINUTE), 'claude', plan, BUDGET_AT)
  expect(budgetSummary(usage, BUDGET_AT).claude.fiveHour).toMatchObject({ projectedAtReset: 340, pace: 'recent', verdict: 'ask' })
  expect(planUsageText(usage, BUDGET_AT)).toBe('Claude! 40/60%  Codex! 40/60%')
  expect(planUsageText({ ...usage, policies: { ...asking, claude: 'full' } }, BUDGET_AT)).toBe('Claude 40/60%  Codex! 40/60%')
  expect(planTile(0, 0, 600, 'Claude', plan, '#000', BUDGET_AT, BUDGET_AT, { ...BUDGET_FORMAT, history: usage.history?.claude })).toContain('100% ↯ Thu 12:30')
  expect(planUsageText({ statuses: {}, claude: { fiveHour: budgetWindow(60, 'fiveHour', 301) } }, BUDGET_AT)).toBe('Claude 0/—%')
})

test('the panel passes stored family policy to its plan tiles', async ($, on) => {
  const { state } = budgetEngine(on)
  await start($)
  state.seed('usage', { statuses: {}, claude: { fiveHour: budgetWindow() }, policies: { claude: 'full' } })
  expect((await headerOf($)).source).toContain('Claude · plan · full')
})

// ---------------------------------------------------------------------------
// The budget gate, the user's one-shot decision and the cost of a tier's run.

// A family that asks: these fixtures store within, since an unset family is on pace.
const askUsage = (over: Partial<UsageReadings> = {}): UsageReadings =>
  ({ statuses: {}, claude: { fiveHour: budgetWindow(), week: budgetWindow(20, 'week') }, policies: { claude: 'within', codex: 'within' }, ...over })

// Two Claude readings half an hour apart, with what the session had spent at each.
const spending = (fromPercent: number, toPercent: number, fromUsd: number, toUsd: number): UsageReadings => {
  const before = recordPlanUsage({ statuses: {}, spentUsd: { claude: fromUsd } }, 'claude',
    { fiveHour: budgetWindow(fromPercent), week: budgetWindow(20, 'week') }, BUDGET_AT - 30 * MINUTE)
  return recordPlanUsage({ ...before, spentUsd: { claude: toUsd } }, 'claude',
    { fiveHour: budgetWindow(toPercent), week: budgetWindow(21, 'week') }, BUDGET_AT)
}

test('history samples carry the family spend when it is known and nothing when it is not', () => {
  const known = recordPlanUsage({ statuses: {}, spentUsd: { claude: 4.5 } }, 'claude', { fiveHour: budgetWindow(10) }, BUDGET_AT)
  expect(known.history?.claude?.fiveHour?.samples).toEqual([{ at: BUDGET_AT, percentUsed: 10, spentUsd: 4.5 }])
  const unknown = recordPlanUsage({ statuses: {} }, 'claude', { fiveHour: budgetWindow(10) }, BUDGET_AT)
  expect(Object.keys(unknown.history?.claude?.fiveHour?.samples[0] ?? {})).toEqual(['at', 'percentUsed'])
})

test('a tier estimate averages its finished Claude runs and converts them with the observed percent per dollar', () => {
  const usage = spending(40, 50, 10, 30)
  const runs = [
    run('h1', { type: 'savvy-flow:savvy-heavy', status: 'done', costUsd: 4 }),
    run('h2', { type: 'savvy-heavy', status: 'done', costUsd: 6 }),
    run('h3', { type: 'savvy-flow:savvy-heavy', status: 'running', costUsd: 50 }),
    run('h4', { type: 'savvy-flow:savvy-heavy', status: 'failed', costUsd: 50 }),
    run('m1', { type: 'savvy-flow:savvy-medium', status: 'done', costUsd: 1 }),
    run('x1', { type: 'Explore', status: 'done', costUsd: 9 }),
    run('c1', { type: 'savvy-flow:savvy-codex-sol', status: 'done', costUsd: 9 }),
  ]
  expect(tierEstimates(runs, usage, BUDGET_AT)).toEqual({
    heavy: { runs: 2, usd: 5, fiveHour: 2.5, week: 0.3 },
    medium: { runs: 1, usd: 1, fiveHour: 0.5, week: 0.1 },
  })
})

test('a tier estimate leaves the window percent null on thin or stale evidence', () => {
  const runs = [run('h1', { type: 'savvy-heavy', status: 'done', costUsd: 4 })]
  const nullWindows = { heavy: { runs: 1, usd: 4, fiveHour: null, week: null } }
  // Under half a dollar spent, no percent moved, or no spend recorded at all.
  expect(tierEstimates(runs, spending(40, 50, 10, 10.4), BUDGET_AT)).toEqual(nullWindows)
  expect(tierEstimates(runs, { ...spending(40, 40, 10, 30), claude: { fiveHour: budgetWindow(40) } }, BUDGET_AT).heavy?.fiveHour).toBeNull()
  expect(tierEstimates(runs, askUsage(), BUDGET_AT)).toEqual(nullWindows)
  // A window that has reset since its history was taken.
  expect(tierEstimates(runs, { ...spending(40, 50, 10, 30), claude: { fiveHour: budgetWindow(50, 'fiveHour', 149) } }, BUDGET_AT).heavy?.fiveHour).toBeNull()
  expect(tierEstimates([], spending(40, 50, 10, 30), BUDGET_AT)).toEqual({})
})

test('the gate refuses a costly tier of a family whose verdict is ask, and names the way out', () => {
  const refusal = budgetGate('savvy-flow:savvy-heavy', askUsage(), [], BUDGET_AT)
  expect(refusal).toContain('Claude')
  expect(refusal).toContain('ask')
  expect(refusal).toContain('savvy-heavy')
  expect(refusal).toContain('5h 60% → 120%')
  expect(refusal).toContain(budgetWindow().resetsAt)
  expect(refusal).toContain('/savvy-budget claude once')
  expect(refusal).toContain('decide')
  for (const tier of ['savvy-fable', 'savvy-careful']) expect(budgetGate(tier, askUsage(), [], BUDGET_AT)).toBeDefined()
})

test('the gate passes cheap tiers, other agents, the other family and windows without an ask', () => {
  for (const type of ['savvy-flow:savvy-medium', 'savvy-light', 'savvy-codex-luna', 'savvy-codex-terra', 'Explore', 'general-purpose']) {
    expect(budgetGate(type, askUsage(), [], BUDGET_AT)).toBeUndefined()
  }
  // A Claude ask does not hold Codex back, and a Codex ask holds its costly relays alone.
  expect(budgetGate('savvy-codex-sol', askUsage(), [], BUDGET_AT)).toBeUndefined()
  const codexAsks: UsageReadings = { statuses: {}, codex: { fiveHour: budgetWindow() }, policies: { codex: 'within' } }
  expect(budgetGate('savvy-flow:savvy-codex-astra', codexAsks, [], BUDGET_AT)).toContain('/savvy-budget codex once')
  expect(budgetGate('savvy-heavy', codexAsks, [], BUDGET_AT)).toBeUndefined()
  // over (a full policy), no projection yet, and a fitting projection all pass.
  expect(budgetGate('savvy-heavy', askUsage({ policies: { claude: 'full' } }), [], BUDGET_AT)).toBeUndefined()
  expect(budgetGate('savvy-heavy', { statuses: {}, claude: { fiveHour: budgetWindow(10, 'fiveHour', 3) } }, [], BUDGET_AT)).toBeUndefined()
  expect(budgetGate('savvy-heavy', { statuses: {}, claude: { fiveHour: budgetWindow(30) } }, [], BUDGET_AT)).toBeUndefined()
})

test("the gate's refusal gives the tier's estimated share of each window when there is one", () => {
  const usage = { ...spending(40, 60, 10, 30), policies: { claude: 'within' } as const, claude: { fiveHour: budgetWindow(), week: budgetWindow(21, 'week') } }
  const refusal = budgetGate('savvy-heavy', usage, [run('h1', { type: 'savvy-heavy', status: 'done', costUsd: 5 })], BUDGET_AT)
  expect(refusal).toContain('≈ 5% of 5h')
  expect(refusal).not.toContain('≈ null')
})

test('a decision holds until the soonest reset of its family and then the gate asks again', () => {
  const decided = decideBudget(askUsage(), 'claude', BUDGET_AT, 'user')
  expect(decided.decisions?.claude).toEqual({ until: budgetWindow().resetsAt, at: BUDGET_AT, by: 'user' })
  expect(budgetGate('savvy-heavy', decided, [], BUDGET_AT)).toBeUndefined()
  // The week still asks once the five-hour window that bounded the decision has reset.
  const weekAsks: UsageReadings = { statuses: {}, claude: { fiveHour: budgetWindow(30), week: budgetWindow(60, 'week') }, policies: { claude: 'within' } }
  const weekDecided = decideBudget(weekAsks, 'claude', BUDGET_AT, 'user')
  expect(weekDecided.decisions?.claude?.until).toBe(budgetWindow().resetsAt)
  expect(budgetGate('savvy-heavy', weekDecided, [], BUDGET_AT)).toBeUndefined()
  expect(budgetGate('savvy-heavy', weekDecided, [], Date.parse(budgetWindow().resetsAt))).toContain('week')
  // The other family's decision does not open this one.
  expect(budgetGate('savvy-heavy', decideBudget(askUsage(), 'codex', BUDGET_AT, 'user'), [], BUDGET_AT)).toBeDefined()
  // With the week's reset alone, a yes still lasts one five-hour window at most.
  const weekOnly = decideBudget({ statuses: {}, claude: { week: budgetWindow(60, 'week') } }, 'claude', BUDGET_AT, 'user')
  expect(weekOnly.decisions?.claude?.until).toBe(new Date(BUDGET_AT + 300 * MINUTE).toISOString())
  const told = decideBudget(askUsage(), 'claude', BUDGET_AT, 'orchestrator', '  yes, go on  ')
  expect(told.decisions?.claude).toEqual({ until: budgetWindow().resetsAt, at: BUDGET_AT, by: 'orchestrator', words: 'yes, go on' })
})

const gatedLaunch = ($: Engine, on: On, usage: UsageReadings) => {
  const { state } = budgetEngine(on)
  launching($, on)
  return { state, seed: () => state.seed('usage', usage) }
}

test('an Agent call refused by the gate starts nothing and leaves the bar where it was', async ($, on) => {
  const { state, seed } = gatedLaunch($, on, askUsage())
  await start($)
  seed()
  await plan($, [{ title: 'dig', tier: 'heavy' }, { title: 'tidy', tier: 'medium' }])
  await $.tool.call({ tool: 'mcp__savvy-progress__progress', phase: 'plan' })
  const refused = await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })
  expect(refused.deny).toContain('/savvy-budget claude once')
  expect(state.agents()).toEqual([])
  expect(state.flow()?.phase).toBe('plan')
  // A cheaper tier is not held back.
  expect((await launch($, 'tidy', { subagent_type: 'savvy-flow:savvy-medium' })).deny).toBeUndefined()
})

test('the user opens the gate with /savvy-budget <family> once until the next reset', async ($, on) => {
  const { state, seed } = gatedLaunch($, on, askUsage())
  await start($)
  seed()
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeDefined()
  const until = formatPlanReset(budgetWindow(), true, BUDGET_AT, { locale: 'en-GB' }).slice(2)
  expect(await budgetCommand($, 'claude once')).toMatchObject({ text: `Budget: Claude within · Codex within · Gemini pace. Claude: go until ${until}.` })
  expect(state.usage().decisions?.claude).toMatchObject({ by: 'user', until: budgetWindow().resetsAt })
  expect(state.usage().policies).toEqual({ claude: 'within', codex: 'within' })
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeUndefined()
})

test('the decide tool records the user answer from the main session only and wants their words', async ($, on) => {
  const { state, seed, } = gatedLaunch($, on, askUsage())
  await start($)
  seed()
  const decide = (input: Record<string, unknown>) => $.tool.call({ tool: 'mcp__savvy-progress__decide', ...input })
  say('Yes, use it, go ahead.')
  expect((await decide({ family: 'claude', answer: 'yes', agentId: 'w1' })).result).toMatch(/^ignored/)
  expect(state.usage().decisions).toBeUndefined()
  expect((await decide({ family: 'claude', answer: '   ' })).deny).toBeDefined()
  expect((await decide({ family: 'both', answer: 'yes' })).deny).toBeDefined()
  expect((await decide({ family: 'claude', answer: 'yes, use it' })).result).toBe(`ok: Claude go until ${budgetWindow().resetsAt}`)
  expect(state.usage().decisions?.claude).toEqual({ until: budgetWindow().resetsAt, at: BUDGET_AT, by: 'orchestrator', words: 'yes, use it' })
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeUndefined()
})

const OLD_POLICY = 'the weekly one should reach the reset between 90 and 100, never leave it unspent'
const decideWith = ($: Engine, input: Record<string, unknown>) => $.tool.call({ tool: 'mcp__savvy-progress__decide', ...input })

test('a yes quoting a user message from before the gate refused is refused, and a quote of their reply after it is recorded', async ($, on) => {
  const { state, seed } = gatedLaunch($, on, askUsage())
  await start($)
  seed()
  say(OLD_POLICY)
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeDefined()
  expect(state.usage().refusals?.families?.claude).toEqual({ at: BUDGET_AT, userMessages: 1 })
  const stale = await decideWith($, { family: 'claude', answer: OLD_POLICY })
  expect(stale.deny).toContain('Ask the user now')
  expect(state.usage().decisions).toBeUndefined()
  say('Ok, go on with Heavy.')
  expect((await decideWith($, { family: 'claude', answer: 'go on with heavy' })).result).toBe(`ok: Claude go until ${budgetWindow().resetsAt}`)
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeUndefined()
})

test('a yes quoting words no user message holds is refused, with or without a refusal before', async ($, on) => {
  const { state, seed } = gatedLaunch($, on, askUsage())
  await start($)
  seed()
  say('something else entirely')
  expect((await decideWith($, { family: 'claude', answer: 'yes, I made it up' })).deny).toContain('quote')
  expect((await decideWith($, { family: 'claude', answer: '  "  " ' })).deny).toBeDefined()
  expect(state.usage().decisions).toBeUndefined()
})

test('with no refusal yet the decide tool takes a quote from any user message', async ($, on) => {
  const { state, seed } = gatedLaunch($, on, askUsage())
  await start($)
  seed()
  say('Yes, Heavy is fine whenever you need it.')
  expect(state.usage().refusals).toBeUndefined()
  expect((await decideWith($, { family: 'claude', answer: 'Heavy is fine' })).result).toContain('ok: Claude')
})

test('the refusal of one family does not date the other', async ($, on) => {
  const { state, seed } = gatedLaunch($, on, { ...askUsage(), codex: { fiveHour: budgetWindow(10, 'fiveHour', 3) } })
  await start($)
  seed()
  say('Codex is fine to use')
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeDefined()
  expect(state.usage().refusals?.families?.codex).toBeUndefined()
  expect((await decideWith($, { family: 'codex', answer: 'Codex is fine' })).result).toContain('ok: Codex')
})

test('a tier yes must quote a user message after the latest refusal of that tier, and a family refusal does not date it', async ($, on) => {
  const { state, seed } = topGated($, on)
  await start($)
  seed()
  say(OLD_POLICY)
  expect((await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-fable' })).deny).toContain('PLANS only')
  expect(state.usage().refusals?.tiers?.fable).toEqual({ at: BUDGET_AT, userMessages: 1 })
  expect((await decideWith($, { tier: 'fable', answer: OLD_POLICY })).deny).toContain('Ask the user now')
  expect(state.usage().topTiers).toBeUndefined()
  say('Yes, Fable for the plan.')
  expect((await decideWith($, { tier: 'fable', answer: 'fable for the plan' })).result).toBe('ok: Claude Fable allowed for 1 launch')
  expect((await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-fable' })).deny).toBeUndefined()
  // Used up, refused again: a newer refusal makes the earlier yes stale too.
  expect((await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-fable' })).deny).toContain('used up')
  expect((await decideWith($, { tier: 'fable', answer: 'fable for the plan' })).deny).toContain('Ask the user now')
  expect((await decideWith($, { tier: 'astra', answer: 'fable for the plan' })).result).toContain('ok: Codex Astra')
})

test('a tier yes with no refusal of that tier yet quotes any user message', async ($, on) => {
  const { state, seed } = topGated($, on)
  await start($)
  seed()
  expect((await decideWith($, { tier: 'fable', answer: 'yes' })).deny).toContain('quote')
  say('Yes, Fable once.')
  expect((await decideWith($, { tier: 'fable', answer: 'fable once' })).result).toContain('ok: Claude Fable')
  expect(state.usage().refusals).toBeUndefined()
})

test('every Claude model step, the main session and the workers alike, adds to the family spend', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  answering(on)
  await start($)
  await spawn($, 'w1')
  await stepOf($, 'w1', 0)
  const main = $.turn.step({ turnId: 'm1', index: 0, model: 'claude-opus-5-5', messageCount: 1 })
  for await (const chunk of main) void chunk
  expect(Math.abs((state.usage().spentUsd?.claude ?? 0) - 2 * costOf('claude-opus-5-5', USAGE))).toBeLessThan(1e-9)
})

test('progress and budget add an estimates line once a tier has finished runs, and none before', async ($, on) => {
  const { state } = budgetEngine(on)
  await start($)
  const usage = spending(40, 50, 10, 30)
  await report($)
  state.seed('usage', usage)
  expect((await readBudget($)).result).toBe(`budget: ${JSON.stringify(budgetSummary(usage, BUDGET_AT))}`)
  state.seed(AGENTS, [run('h1', { type: 'savvy-heavy', status: 'done', costUsd: 4 })])
  const lines = ((await readBudget($)).result as string).split('\n')
  expect(lines).toHaveLength(2)
  expect(JSON.parse(lines[1]!.slice('estimates: '.length))).toEqual({ heavy: { runs: 1, usd: 4, fiveHour: 2, week: 0.2 } })
  // A new flow keeps only the running rows, so the flow is already under way here.
  const reported = ((await $.tool.call({ tool: 'mcp__savvy-progress__progress', done: 0 })).result as string).split('\n')
  expect(reported[0]).toMatch(/^ok: /)
  expect(reported[2]).toMatch(/^estimates: /)
})

// ---------------------------------------------------------------------------
// Clearing the finished runs from the panel's view, the run's totals kept.

test('clearing marks every finished run and leaves the running ones and the totals as they were', () => {
  const list = [run('a', { status: 'done', costUsd: 2, tokens: 100 }), run('b', { status: 'failed', costUsd: 1, tokens: 50 }),
    run('c', { status: 'running', costUsd: 3, tokens: 70 })]
  const cleared = clearFinished(list)
  expect(cleared.map(a => [a.id, a.isCleared ?? false])).toEqual([['a', true], ['b', true], ['c', false]])
  expect(totals(cleared, 0)).toEqual(totals(list, 0))
  expect(list.every(a => a.isCleared === undefined)).toBe(true)
})

test('progress with clearFinished empties Finished but keeps the totals, the running and the planned tasks', { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  await plan($, [{ title: 'kept', tier: 'careful' }, { title: 'later', tier: 'medium' }])
  state.seed(AGENTS, [run('kept', { description: 'kept', status: 'done', costUsd: 2, tokens: 900 }), run('live', { description: 'live', costUsd: 1, tokens: 100 })])
  const before = await panelOf($)
  expect(before.rows.some(r => r.includes('>kept<'))).toBe(true)

  const answer = await $.tool.call({ tool: 'mcp__savvy-progress__progress', clearFinished: true })
  expect(String(answer.result)).toMatch(/^ok: /)
  const after = await panelOf($)
  expect(after.rows.some(r => r.includes('>kept<'))).toBe(false)
  expect(after.rows.some(r => r.includes('>live<'))).toBe(true)
  // The planned task whose run finished stays out of Planned; the other waits.
  expect(after.rows.filter(r => r.includes('later'))).toHaveLength(1)
  expect(after.terminal).not.toContain('"Finished')
  expect(after.header).toBe(before.header)
  expect(state.agents().map(a => [a.id, a.isCleared ?? false])).toEqual([['kept', true], ['live', false]])
})

test('a worker cannot clear the panel, and a cleared run that runs again comes back', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  answering(on)
  await start($)
  await report($)
  await spawn($, 'w1')
  state.seed(AGENTS, state.agents().map(a => ({ ...a, status: 'done' as const })))
  expect((await $.tool.call({ tool: 'mcp__savvy-progress__progress', agentId: 'w1', clearFinished: true })).result).toMatch(/^ignored/)
  expect(byId(state.agents(), 'w1')?.isCleared).toBeUndefined()
  await $.tool.call({ tool: 'mcp__savvy-progress__progress', clearFinished: true })
  expect(byId(state.agents(), 'w1')?.isCleared).toBe(true)
  await stepOf($, 'w1', 1)
  expect(byId(state.agents(), 'w1')).toMatchObject({ status: 'running' })
  expect(byId(state.agents(), 'w1')?.isCleared).toBeUndefined()
})

test("the panel's clear button, beside Finished, empties it in the panel's language", { options: { theme: 'classic', language: 'it' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0)
  await start($)
  await report($)
  state.seed(AGENTS, [run('old', { status: 'done', costUsd: 2 })])
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const [clear] = await ui.findAll({ type: 'Button', text: 'Svuota finiti' })
  expect(clear).toBeDefined()
  await ui.press({ key: 'clear-done' })
  await ui.unmount()
  expect(byId(state.agents(), 'old')?.isCleared).toBe(true)
  const after = await $.ui.mount({ ...PANE, surface: 'desktop' })
  expect(await after.findAll({ type: 'Button', text: 'Svuota finiti' })).toHaveLength(0)
  await after.unmount()
})

// ---------------------------------------------------------------------------
// The top-tier gate: Fable and Codex Astra are for plans only, each launch on the user's recorded yes.

const topGated = ($: Engine, on: On, usage: UsageReadings = { statuses: {}, claude: { fiveHour: budgetWindow(10, 'fiveHour', 3) } }) => {
  const { state } = budgetEngine(on)
  launching($, on)
  return { state, seed: (over: Partial<UsageReadings> = {}) => state.seed('usage', { ...usage, ...over }) }
}
const decideTier = ($: Engine, input: Record<string, unknown>) => {
  if (!transcript.length) say('Yes, for the plan.')
  return $.tool.call({ tool: 'mcp__savvy-progress__decide', answer: 'yes, for the plan', ...input })
}

test('the top-tier gate refuses Fable and Astra, either name, whatever the budget says, and names the way out', () => {
  const ok: UsageReadings = { statuses: {}, claude: { fiveHour: budgetWindow(10, 'fiveHour', 3) } }
  for (const type of ['savvy-fable', 'savvy-flow:savvy-fable', 'savvy-codex-astra', 'savvy-flow:savvy-codex-astra']) {
    const refusal = topTierGate(type, ok)
    expect(refusal).toContain('PLANS only')
    expect(refusal).toContain('decide')
    expect(refusal).toContain(type.includes('fable') ? 'Heavy (Claude)' : 'Sol (Codex)')
  }
  expect(topTierGate('savvy-flow:savvy-heavy', ok)).toBeUndefined()
  expect(topTierGate('Explore', ok)).toBeUndefined()
  expect(topTierGate('savvy-fable', ok, false, 'it')).toContain('PIANI')
})

test('an Agent call for Fable is refused without a yes even when the budget is ok, and starts nothing', async ($, on) => {
  const { state, seed } = topGated($, on)
  await start($)
  seed()
  const refused = await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-fable' })
  expect(refused.deny).toContain('PLANS only')
  expect(state.agents()).toEqual([])
  expect((await launch($, 'astra', { subagent_type: 'savvy-flow:savvy-codex-astra' })).deny).toContain('Sol (Codex)')
  expect((await launch($, 'tidy', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeUndefined()
})

test('a recorded yes lets Fable launch once, and the second launch is refused again', async ($, on) => {
  const { state, seed } = topGated($, on)
  await start($)
  seed()
  expect((await decideTier($, { tier: 'fable', agentId: 'w1' })).result).toMatch(/^ignored/)
  expect((await decideTier($, { tier: 'fable', answer: ' ' })).deny).toBeDefined()
  expect((await decideTier($, { tier: 'opus' })).deny).toBeDefined()
  expect((await decideTier($, { tier: 'fable', family: 'codex' })).deny).toBeDefined()
  expect((await decideTier($, { tier: 'fable', uses: 0 })).deny).toBeDefined()
  expect((await decideTier($, { tier: 'fable' })).result).toBe('ok: Claude Fable allowed for 1 launch')
  expect(state.usage().topTiers?.fable).toEqual({ at: BUDGET_AT, words: 'yes, for the plan', uses: 1 })
  expect((await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-fable' })).deny).toBeUndefined()
  const second = await launch($, 'build', { subagent_type: 'savvy-fable' })
  expect(second.deny).toContain('used up')
  expect(state.agents().map(a => a.description)).toEqual(['plan'])
})

test('a session yes lets Fable launch again and again; a counted yes covers that many', async ($, on) => {
  const { state, seed } = topGated($, on)
  await start($)
  seed()
  await decideTier($, { tier: 'fable', uses: 'session' })
  for (const name of ['a', 'b', 'c']) expect((await launch($, name, { subagent_type: 'savvy-fable' })).deny).toBeUndefined()
  await decideTier($, { tier: 'astra', uses: 2 })
  expect(state.usage().topTiers?.['codex-astra']?.uses).toBe(2)
  for (const name of ['x', 'y']) expect((await launch($, name, { subagent_type: 'savvy-codex-astra' })).deny).toBeUndefined()
  expect((await launch($, 'z', { subagent_type: 'savvy-codex-astra' })).deny).toContain('used up')
})

test('the Astra relay is held like Fable, and the yes of one tier does not open the other', async ($, on) => {
  const { state, seed } = topGated($, on)
  await start($)
  seed()
  await decideTier($, { tier: 'astra' })
  expect((await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-fable' })).deny).toContain('PLANS only')
  expect((await launch($, 'relay', { subagent_type: 'savvy-flow:savvy-codex-astra' })).deny).toBeUndefined()
  expect((await launch($, 'relay2', { subagent_type: 'savvy-codex-astra' })).deny).toContain('used up')
  expect(state.usage().topTiers?.['codex-astra']?.uses).toBe(0)
})

test('a SendMessage resume of a top-tier worker needs a yes with a use left; other workers resume freely', async ($, on) => {
  const { state, seed } = topGated($, on)
  state.seed(AGENTS, [run('fab', { type: 'savvy-flow:savvy-fable', status: 'done' }), run('hv', { type: 'savvy-flow:savvy-heavy', status: 'done' })])
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  seed()
  const resume = (to: string) => $.tool.call({ tool: 'SendMessage', tool_use_id: `send-${to}`, to, message: 'go on' })
  expect((await resume('fab')).deny).toContain('resume (SendMessage)')
  expect((await resume('hv')).deny).toBeUndefined()
  await decideTier($, { tier: 'fable' })
  expect((await resume('fab')).deny).toBeUndefined()
  expect((await resume('fab')).deny).toContain('used up')
})

test('an Agent call of any type with a Fable model hits the top-tier gate and spends a permit; a resume of such a worker too', async ($, on) => {
  const { state, seed } = topGated($, on)
  state.seed(AGENTS, [run('odd', { type: 'general-purpose', model: 'claude-fable-5-2', status: 'done' })])
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  seed()
  expect(topTierGate('general-purpose', { statuses: {} }, false, 'en', 'FABLE')).toContain('PLANS only')
  for (const model of ['fable', 'Fable', 'FABLE', 'claude-fable-5-2']) {
    expect((await launch($, `m-${model}`, { subagent_type: 'savvy-flow:savvy-heavy', model })).deny).toContain('PLANS only')
  }
  expect((await launch($, 'plain', { subagent_type: 'Explore', model: 'sonnet' })).deny).toBeUndefined()
  await decideTier($, { tier: 'fable' })
  expect((await launch($, 'ok', { subagent_type: 'general-purpose', model: 'Fable' })).deny).toBeUndefined()
  expect((await launch($, 'again', { subagent_type: 'savvy-heavy', model: 'fable' })).deny).toContain('used up')
  const resume = $.tool.call({ tool: 'SendMessage', tool_use_id: 'send-odd', to: 'odd', message: 'go on' })
  expect((await resume).deny).toContain('used up')
})

// The plan gate: the bar tells the truth, so a savvy worker outside the current plan is refused.
const planned = ($: Engine, on: On) => {
  const { state } = engine(on, { infos: [] }, 0)
  launching($, on)
  return state
}
const careful = { subagent_type: 'savvy-flow:savvy-careful' }

test('the plan gate refuses a savvy launch outside the plan, names the way out, and starts nothing', async ($, on) => {
  const state = planned($, on)
  await start($)
  await plan($, [{ title: 'build', tier: 'careful' }])
  const refused = await launch($, 'extra', careful)
  expect(refused.deny).toBe("Plan gate: 'extra' is not a task of the current plan 'Fix bug'. Update the plan first: call progress with the new title, tasks and total (the new plan replaces the old one), then launch with description = the task's title.")
  expect(state.agents()).toEqual([])
  expect(planGate('savvy-careful', 'extra', state.flow(), 'it')).toContain('Blocco del piano')
  expect(planGate('Explore', 'extra', state.flow())).toBeUndefined()
})

test('the plan gate lets a launch whose description is a task title through', async ($, on) => {
  const state = planned($, on)
  await start($)
  await plan($, [{ title: 'build', tier: 'careful' }])
  expect((await launch($, 'build', careful)).deny).toBeUndefined()
  expect(state.agents().map(a => a.description)).toEqual(['build'])
  expect((await launch($, 'Explore the repo', { subagent_type: 'Explore' })).deny).toBeUndefined()
})

test('the plan gate lets the launch through once the plan is replaced to include it', async ($, on) => {
  planned($, on)
  await start($)
  await plan($, [{ title: 'build', tier: 'careful' }])
  expect((await launch($, 'verify', careful)).deny).toContain('Plan gate')
  await plan($, [{ title: 'build', tier: 'careful' }, { title: 'verify', tier: 'careful' }])
  expect((await launch($, 'verify', careful)).deny).toBeUndefined()
})

test('without a plan, or with a finished one, the plan gate does nothing', async ($, on) => {
  planned($, on)
  await start($)
  expect((await launch($, 'anything', careful)).deny).toBeUndefined()
  await plan($, [{ title: 'build', tier: 'careful' }])
  await $.tool.call({ tool: 'mcp__savvy-progress__progress', finished: true })
  expect((await launch($, 'later', careful)).deny).toBeUndefined()
})

test('a SendMessage resume of a worker already matched to a task passes the plan gate', async ($, on) => {
  const state = planned($, on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  await plan($, [{ title: 'build', tier: 'careful' }])
  expect((await launch($, 'build', careful)).deny).toBeUndefined()
  await plan($, [{ title: 'other', tier: 'careful' }])
  const resumed = await $.tool.call({ tool: 'SendMessage', tool_use_id: 'send-build', to: 'build', message: 'go on' })
  expect(resumed.deny).toBeUndefined()
  expect(state.agents().map(a => a.description)).toEqual(['build'])
})

// ---------------------------------------------------------------------------
// The pace policy: stay inside every window by re-tiering, never by asking.

const paceUsage = (over: Partial<UsageReadings> = {}): UsageReadings => askUsage({ policies: { claude: 'pace' }, ...over })

test('under pace the gate never refuses a costly tier for the budget, whatever the projection', () => {
  for (const tier of ['savvy-heavy', 'savvy-careful', 'savvy-flow:savvy-heavy']) {
    expect(budgetGate(tier, paceUsage(), [], BUDGET_AT)).toBeUndefined()
  }
  const codexPace: UsageReadings = { statuses: {}, codex: { fiveHour: budgetWindow() }, policies: { codex: 'pace' } }
  expect(budgetGate('savvy-codex-sol', codexPace, [], BUDGET_AT)).toBeUndefined()
  // The same projection under within is still refused.
  expect(budgetGate('savvy-heavy', askUsage(), [], BUDGET_AT)).toBeDefined()
})

test('under pace a projection over 100 is retier with advice, a weekly one under 90 near its reset is spend, the rest ok', () => {
  const summary = budgetSummary(paceUsage(), BUDGET_AT).claude
  expect(summary.fiveHour).toMatchObject({ policy: 'pace', projectedAtReset: 120, verdict: 'retier' })
  expect(summary.fiveHour?.advice).toMatch(/tier/)
  expect(summary.fiveHour?.advice).toMatch(/headroom/)
  // Week 20% used 5040 min in projects to 40%, but its reset is 3.5 days away: ok.
  expect(summary.week).toMatchObject({ verdict: 'ok' })
  expect(summary.week?.advice).toBeUndefined()
  const week = (used: number, elapsedMinutes: number): UsageReadings =>
    ({ statuses: {}, claude: { week: budgetWindow(used, 'week', elapsedMinutes) }, policies: { claude: 'pace' } })
  const weekOf = (usage: UsageReadings) => budgetSummary(usage, BUDGET_AT).claude.week
  // One day left: 60% used over 8640 min projects to 70%: spend.
  expect(weekOf(week(60, 8640))).toMatchObject({ projectedAtReset: 70, verdict: 'spend' })
  expect(weekOf(week(60, 8640))?.advice).toMatch(/room/)
  // 90% and 100% exactly are ok.
  expect(weekOf(week(77.14285714285714, 8640))?.verdict).toBe('ok')
  expect(weekOf(week(85.71428571428571, 8640))?.verdict).toBe('ok')
  // Two days left or more: ok even when low; just under two days: spend.
  expect(weekOf(week(30, 7200))?.verdict).toBe('ok')
  expect(weekOf(week(30, 7201))?.verdict).toBe('spend')
  // Over 100 in the week is retier too.
  expect(weekOf(week(95, 8640))).toMatchObject({ verdict: 'retier' })
  // A five-hour window under 90 is never spend.
  const fiveHour: UsageReadings = { statuses: {}, claude: { fiveHour: budgetWindow(10, 'fiveHour', 270) }, policies: { claude: 'pace' } }
  expect(budgetSummary(fiveHour, BUDGET_AT).claude.fiveHour?.verdict).toBe('ok')
  // Other policies are unchanged.
  expect(budgetSummary(askUsage({ policies: { claude: 'full' } }), BUDGET_AT).claude.fiveHour?.verdict).toBe('over')
})

test('the bar title shows the pace policy', async ($, on) => {
  const { state } = budgetEngine(on)
  await start($)
  state.seed('usage', { statuses: {}, claude: { fiveHour: budgetWindow() }, policies: { claude: 'pace' } })
  expect((await headerOf($)).source).toContain('Claude · plan · pace')
})

test('/savvy-budget <family> pace sets the policy and lists it', async ($, on) => {
  const { state } = budgetEngine(on)
  await start($)
  expect(await budgetCommand($, 'claude pace')).toMatchObject({ text: 'Budget: Claude pace · Codex pace · Gemini pace.' })
  expect(state.usage().policies).toEqual({ claude: 'pace' })
})

test('the decide tool records pace from the user words, and it survives a reset', async ($, on) => {
  const { state, seed } = gatedLaunch($, on, askUsage())
  await start($)
  seed()
  say(OLD_POLICY)
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeDefined()
  expect((await decideWith($, { family: 'claude', policy: 'pace', answer: OLD_POLICY })).deny).toContain('Ask the user now')
  expect((await decideWith($, { policy: 'pace', answer: 'x' })).deny).toBeDefined()
  expect((await decideWith($, { family: 'claude', policy: 'full', answer: 'x' })).deny).toBeDefined()
  say('Go on, but stay inside the budget.')
  expect((await decideWith($, { family: 'claude', policy: 'pace', answer: 'stay inside the budget' })).result).toBe('ok: Claude pace')
  expect(state.usage().policies).toEqual({ claude: 'pace', codex: 'within' })
  expect(state.usage().decisions).toBeUndefined()
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-heavy' })).deny).toBeUndefined()
  // A reading after the window reset keeps the policy.
  const later = recordPlanUsage(state.usage(), 'claude', { fiveHour: budgetWindow(5, 'fiveHour', 10) }, BUDGET_AT + 301 * MINUTE)
  expect(later.policies).toEqual({ claude: 'pace', codex: 'within' })
  expect(budgetSummary(later, BUDGET_AT + 301 * MINUTE).claude.fiveHour?.policy).toBe('pace')
})

test('under pace the top-tier gate still refuses Fable without its own yes', async ($, on) => {
  const { seed } = topGated($, on)
  await start($)
  seed({ policies: { claude: 'pace' } })
  expect((await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-fable' })).deny).toContain('PLANS only')
  expect(topTierGate('savvy-fable', paceUsage())).toContain('PLANS only')
})

// A family nobody set is on pace: the user never has to type /savvy-budget.

test('a family with no stored policy is on pace: the gate lets a costly tier through a projection over 100', () => {
  const unset: UsageReadings = { statuses: {}, claude: { fiveHour: budgetWindow(), week: budgetWindow(20, 'week') } }
  expect(unset.policies).toBeUndefined()
  expect(budgetSummary(unset, BUDGET_AT).claude.fiveHour).toMatchObject({ policy: 'pace', verdict: 'retier' })
  for (const tier of ['savvy-heavy', 'savvy-careful', 'savvy-flow:savvy-heavy']) {
    expect(budgetGate(tier, unset, [], BUDGET_AT)).toBeUndefined()
  }
})

test('a policy the user stored as within still refuses, and /savvy-budget within opts back into asking', async ($, on) => {
  const within = askUsage({ policies: { claude: 'within' } })
  expect(budgetSummary(within, BUDGET_AT).claude.fiveHour).toMatchObject({ policy: 'within', verdict: 'ask' })
  expect(budgetGate('savvy-heavy', within, [], BUDGET_AT)).toContain('/savvy-budget claude once')
  const { state } = budgetEngine(on)
  await start($)
  expect(await budgetCommand($)).toMatchObject({ text: 'Budget: Claude pace · Codex pace · Gemini pace.' })
  expect(await budgetCommand($, 'claude within')).toMatchObject({ text: 'Budget: Claude within · Codex pace · Gemini pace.' })
  expect(state.usage().policies).toEqual({ claude: 'within' })
})

// ---------------------------------------------------------------------------
// The Gemini family: the Codex cases above, mirrored for the agy relays.

// `agy -p "/usage" --output-format json`, as measured live (the response text left out).
const AGY_USAGE = { conversation_id: '', status: 'SUCCESS', duration_seconds: 0, num_turns: 0,
  usage: { input_tokens: 0, output_tokens: 0, thinking_tokens: 0, cache_read_tokens: 0, total_tokens: 0 },
  command: { name: 'usage', data: { description: 'Within each group, models share a weekly limit and a 5-hour limit.', groups: [
    { name: 'Gemini Models', description: 'Models within this group: Gemini 4 Neon, Gemini 4 Carbon, Gemini 4 Argon, Gemini 4 Hydrogen, Gemini 3.8 Flash', buckets: [
      { id: 'gemini-weekly', name: 'Weekly Limit Remaining', description: 'You have used some of your weekly limit.', window: 'weekly', remaining_fraction: 0.9978731274604797, reset_time: '2026-11-30T21:24:13Z' },
      { id: 'gemini-5h', name: 'Five Hour Limit Remaining', description: 'You have used some of your 5-hour limit.', window: '5h', remaining_fraction: 0.9914926290512085, reset_time: '2026-11-24T02:24:13Z' },
    ] },
    { name: 'Claude and GPT models', description: 'Models within this group: Claude Opus 5.5, Claude Sonnet 5.5, GPT-OSS 120B', buckets: [
      { id: '3p-weekly', name: 'Weekly Limit Remaining', window: 'weekly', remaining_fraction: 1, reset_time: '2026-11-30T22:21:10Z' },
      { id: '3p-5h', name: 'Five Hour Limit Remaining', window: '5h', remaining_fraction: 0.5, reset_time: '2026-11-24T03:21:10Z' },
    ] },
  ] } } }
const GEMINI_PLAN: PlanUsage = {
  fiveHour: { percentUsed: 1, resetsAt: '2026-11-24T02:24:13.000Z' },
  week: { percentUsed: 0, resetsAt: '2026-11-30T21:24:13.000Z' },
}
// The stream-json `result.usage` of a live flash run: cache reads are apart from the input.
const GEMINI_USAGE = { input_tokens: 13534, output_tokens: 460, thinking_tokens: 276, cache_read_tokens: 9099, total_tokens: 13994 }
const GEMINI_ONE = { version: 1, sessionId: '00000000-0000-4000-8000-000000000002', model: 'gemini-3.8-flash', state: 'done',
  action: 'write_file hello.txt', totalTokenUsage: GEMINI_USAGE, rateLimits: AGY_USAGE.command.data, updatedAt: 100 }
const GEMINI_SNAPSHOT = { rateLimits: AGY_USAGE.command.data, model: null, updatedAt: 300 }

// The Gemini status directory, beside an empty Codex one; reading anything else is a test failure.
const geminiFiles = (on: On, initial: Record<string, unknown> = GEMINI_ONE) => {
  const files: Record<string, { text: string; mtimeMs: number; size?: number }> = { 'gem-one': { text: JSON.stringify(initial), mtimeMs: 200 } }
  const reads: string[] = []
  on('fs.list', ($, e) => {
    if (!e.path?.replace(/\\/g, '/').endsWith('/.gemini/savvy-status')) return { value: [] }
    return { value: Object.entries(files).map(([name, f]) => ({ name: name + '.json', kind: 'file', size: f.size ?? f.text.length, mtimeMs: f.mtimeMs, isLink: false })) }
  })
  on('fs.read', ($, e) => {
    if (e.path.endsWith('models_cache.json')) return { value: '{}' }
    expect(e.path.replace(/\\/g, '/')).toMatch(/\/\.gemini\/savvy-status\/[\w-]+\.json$/)
    const name = e.path.replace(/\\/g, '/').split('/').pop()!.slice(0, -5)
    reads.push(name)
    if (!files[name]) throw new Error('unreadable')
    return { value: files[name].text }
  })
  return { files, reads }
}

const geminiRelay = (over: Partial<AgentRun> = {}) => run('relay', { type: 'savvy-gemini-argon', geminiStatus: 'gem-one', status: 'done', endedAt: 0, ...over })

// The Gemini figures, each with the Claude tier whose costume it wears, its color and its intensity.
const GEMINI: [string, string, string, string][] = [
  ['gemini-carbon', 'fable', '#3F51B5', 'Carbon'],
  ['gemini-hydrogen', 'careful', '#2BA6C6', 'Hydrogen'],
  ['gemini-neon', 'careful', '#F2542D', 'Neon'],
  ['gemini-argon', 'medium', '#D2559A', 'Argon'],
  ['gemini-flash', 'light', '#D4B21C', 'Flash'],
]
// The sparkle's eyes, wherever their group or color.
const GEMINI_EYES = ['<rect x="11" y="14" width="2" height="2"', '<rect x="17" y="14" width="2" height="2"']

test("every theme, and the classic set, draws all five Gemini figures in their tier's costume, with the badge and the sparkle's eyes", () => {
  const faults: string[] = []
  for (const [theme, dress] of [['classic', null] as const, ...Object.entries(DRESSES)]) {
    for (const [figure, wears] of GEMINI) {
      let drawn = ''
      try {
        drawn = figureSvg(figure, dress)
      } catch (err) {
        faults.push(`${theme} ${figure}: throws ${String(err)}`)
        continue
      }
      const cls = dress ? `c-${dress.prefix}-${wears}` : `c-${wears}`
      if (!drawn.includes(`class="${cls}`)) faults.push(`${theme} ${figure}: not dressed as ${wears}`)
      if (!/<g class="badge"><rect/.test(drawn)) faults.push(`${theme} ${figure}: no badge`)
      const hasEyes = figureSvg(wears, dress).includes('<rect x="9" y="12" width="2" height="2"')
      for (const px of GEMINI_EYES) if (drawn.includes(px) !== hasEyes) faults.push(`${theme} ${figure}: eyes ${hasEyes ? 'missing' : 'shown with eyes hidden'}`)
    }
  }
  expect(faults).toEqual([])
})

test('each Gemini intensity has a badge of its own, in a color no other tier has', () => {
  const badge = (figure: string): string => /<g class="badge">(.*?)<\/g>/.exec(figureSvg(figure, null))?.[1] ?? ''
  const shapes = GEMINI.map(([figure]) => badge(figure).replace(/fill="[^"]*"/g, ''))
  expect(new Set(shapes).size).toBe(GEMINI.length)
  for (const [figure, , color] of GEMINI) expect(badge(figure)).toContain(`fill="${color}"`)
  const others = ['#7F77DD', '#D85A30', '#BA7517', '#378ADD', '#1D9E75', '#8FA3BF', '#6E9B4A', '#E0A526', '#9B7BE0', '#888780']
  expect(new Set([...others, ...GEMINI.map(([, , color]) => color)]).size).toBe(others.length + GEMINI.length)
})

test('a Gemini figure leaves the crab as it was, even when its drawing throws', () => {
  const crab = figureSvg('careful', DRESSES.winter)
  figureSvg('gemini-hydrogen', DRESSES.winter)
  expect(figureSvg('careful', DRESSES.winter)).toBe(crab)
  expect(() =>
    withBody(geminiBody, () => {
      throw new Error('torn costume')
    }),
  ).toThrow('torn costume')
  const { f, groups } = pixels()
  crabBody(f)
  expect(groups.get('bd')?.[0]).toBe('<rect x="7" y="10" width="16" height="12" fill="#D97757"/>')
})

test("a Gemini run shows its intensity, not the relay's model, plugin-prefixed or bare", { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  const types = GEMINI.flatMap(([tier]) => [`savvy-flow:savvy-${tier}`, `savvy-${tier}`])
  state.seed(AGENTS, types.map((type, i) => run(`w${i}`, { type, model: 'claude-sonnet-5-5', effort: 'low', costUsd: 0.42, status: 'done', endedAt: 5 })))
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const rows = (await ui.findAll({ type: 'Svg' })).slice(1).map(e => ({ svg: String(e.props.source), alt: String(e.props.alt) }))
  await ui.unmount()
  expect(rows.length).toBe(types.length)
  const faults: string[] = []
  for (const { svg, alt } of rows) {
    const seen = GEMINI.find(([tier, , color]) => svg.includes(`<tspan fill="${color}">${tier}</tspan>`))
    if (!seen) faults.push(`no gemini tier in ${alt}`)
    else {
      const [tier, , , label] = seen
      if (!svg.includes(label) || !alt.includes(label)) faults.push(`${tier}: no ${label}`)
      if (/Sonnet/.test(svg) || /Sonnet/.test(alt)) faults.push(`${tier}: shows the relay's model`)
      if (svg.includes('≈—')) faults.push(`${tier}: missing session shows a cost placeholder`)
      if (!svg.includes('class="badge"')) faults.push(`${tier}: no badge`)
    }
  }
  expect(faults).toEqual([])
})

test('a planned Gemini task, named with or without savvy-, waits as its intensity', { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  await plan($, [{ title: 'second opinion', tier: 'savvy-gemini-hydrogen' }, { title: 'quick fix', tier: 'gemini-flash' }])
  expect(state.flow()?.tasks.map(t => t.tier)).toEqual(['gemini-hydrogen', 'gemini-flash'])
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const [, hydrogen, flash] = (await ui.findAll({ type: 'Svg' })).map(e => String(e.props.source))
  await ui.unmount()
  expect(hydrogen).toContain('<tspan fill="#2BA6C6">gemini-hydrogen</tspan>')
  expect(hydrogen).toContain('Hydrogen')
  expect(hydrogen).toContain('class="c-careful"')
  expect(flash).toContain('Flash')
  expect(flash).toContain('class="c-light"')
})

test('the progress tool takes the Gemini tiers, and decide takes carbon', async ($, on) => {
  const { registered } = engine(on, { infos: [] })
  await start($)
  const schema = registered.find(t => t.name === 'progress')?.inputSchema as { properties: { tasks: { items: { properties: { tier: { enum: string[] } } } } } }
  expect(schema.properties.tasks.items.properties.tier.enum).toEqual(expect.arrayContaining(GEMINI.map(([tier]) => tier)))
  const decide = registered.find(t => t.name === 'decide')?.inputSchema as { properties: { tier: { enum: string[] }; family: { enum: string[] } } }
  expect(decide.properties.tier.enum).toEqual(['fable', 'astra', 'carbon'])
  expect(decide.properties.family.enum).toEqual(['claude', 'codex', 'gemini'])
})

test('a Gemini slug names its family and version; any other is shown as given', () => {
  expect(geminiModelName('gemini-4-argon')).toBe('Argon 4')
  expect(geminiModelName('gemini-3.8-flash')).toBe('Flash 3.8')
  expect(geminiModelName('gemini-4-neon')).toBe('Neon 4')
  expect(geminiModelName('gemini-4-krypton')).toBe('gemini-4-krypton')
})

test('a planned Gemini task names its bare intensity and no effort, whatever the plan declares', () => {
  expect(plannedModel(taskOf('gemini-carbon'), { codex: {}, claude: {} })).toBe('Carbon')
  expect(plannedModel({ ...taskOf('gemini-argon'), effort: 'max' }, { codex: {}, claude: {} })).toBe('Argon')
})

test("a Gemini run with a declared model and no effort shows each intensity's own effort", () => {
  for (const [family, effort, slug] of [['flash', 'low', 'gemini-3.8-flash'], ['argon', 'medium', 'gemini-4-argon'], ['neon', 'medium', 'gemini-4-neon'],
    ['hydrogen', 'high', 'gemini-4-hydrogen'], ['carbon', 'high', 'gemini-4-carbon']] as const) {
    expect(runModel(run('w1', { type: `savvy-gemini-${family}`, geminiModel: slug }))).toBe(`${geminiModelName(slug)} · ${effort}`)
  }
})

test("a Gemini run awaiting declaration keeps the bare intensity, not the relay's effort", () => {
  expect(runModel(run('w1', { type: 'savvy-gemini-argon', effort: 'low' }))).toBe('Argon')
})

test("a run's declared Gemini model and effort win", () => {
  expect(runModel(run('w1', { type: 'savvy-flow:savvy-gemini-argon', geminiModel: 'gemini-4-argon', geminiEffort: 'xhigh' }))).toBe('Argon 4 · xhigh')
})

test('the step tool accepts a Gemini model and effort and preserves them through later relay usage', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  answering(on)
  await start($)
  await spawn($, 'w1', 'savvy-flow:savvy-gemini-argon')
  expect(await stepped($, 'w1', { done: 1, model: 'gemini-4-argon', effort: 'medium' })).toMatchObject({ result: 'ok' })
  await stepOf($, 'w1', 0)
  await stepped($, 'w1', { done: 2 })
  expect(byId(state.agents(), 'w1')).toMatchObject({ model: 'claude-opus-5-5', geminiModel: 'gemini-4-argon', geminiEffort: 'medium' })
  expect(byId(state.agents(), 'w1')?.codexModel).toBeUndefined()
  const { rows, terminal } = await panelOf($)
  expect(rows[0]).toContain('Argon 4 · medium')
  expect(terminal).toContain('Argon 4 · medium')
})

test('the step tool accepts a Gemini status declaration without done, and each family keeps to its own field', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  await spawn($, 'relay', 'savvy-gemini-hydrogen')
  await stepped($, 'relay', { total: 4, done: 0, note: 'checking agy login' })
  expect(await stepped($, 'relay', { geminiStatus: 'gem-one', model: 'gemini-4-hydrogen', codexStatus: 'not-mine' })).toMatchObject({ result: 'ok' })
  expect(byId(state.agents(), 'relay')).toMatchObject({ geminiStatus: 'gem-one', stepDone: 0, stepNote: 'checking agy login' })
  expect(byId(state.agents(), 'relay')?.codexStatus).toBeUndefined()
  await spawn($, 'cx', 'savvy-codex-sol')
  await stepped($, 'cx', { geminiStatus: 'not-mine' })
  expect(byId(state.agents(), 'cx')?.geminiStatus).toBeUndefined()
})

test('the step schema declares geminiStatus, and the tool rejects a name that escapes its directory', async ($, on) => {
  const { registered } = engine(on, { infos: [] })
  await start($)
  expect(registered.find(t => t.name === 'step')?.inputSchema).toMatchObject({ properties: { geminiStatus: { type: 'string' } }, required: [] })
  expect(registered.find(t => t.name === 'step')?.description).toContain('geminiStatus')
  expect(await stepped($, 'relay', { geminiStatus: '../outside' })).toMatchObject({ deny: 'geminiStatus must be a safe filename stem' })
})

test("agy's /usage output gives the Gemini Models group's windows, used as one minus the remaining fraction", () => {
  expect(geminiUsageFrom(JSON.stringify(AGY_USAGE))).toEqual(GEMINI_PLAN)
  expect(geminiLimitsFrom(AGY_USAGE.command.data)).toEqual(GEMINI_PLAN)
})

test("the third-party group never stands for Gemini, whatever the groups' order", () => {
  const [gemini, others] = AGY_USAGE.command.data.groups
  expect(geminiLimitsFrom({ groups: [others] })).toBeUndefined()
  expect(geminiLimitsFrom({ groups: [others, gemini] })).toEqual(GEMINI_PLAN)
})

test('an invalid Gemini bucket is skipped, and the first bucket of a window wins', () => {
  const bucket = (window: unknown, remaining_fraction: unknown, reset_time: unknown) => ({ window, remaining_fraction, reset_time })
  const groups = (buckets: unknown[]) => ({ groups: [{ name: 'Gemini Models', buckets }] })
  for (const bad of [bucket('5h', 1.2, '2026-11-24T02:24:13Z'), bucket('5h', -0.1, '2026-11-24T02:24:13Z'), bucket('5h', '0.5', '2026-11-24T02:24:13Z'),
    bucket('5h', 0.5, undefined), bucket('5h', 0.5, 'soon'), bucket('1h', 0.5, '2026-11-24T02:24:13Z')]) {
    expect(geminiLimitsFrom(groups([bad]))).toBeUndefined()
  }
  expect(geminiLimitsFrom(groups([bucket('5h', 0.25, '2026-11-24T02:24:13Z'), bucket('5h', 0.9, '2026-11-24T03:00:00Z')])))
    .toEqual({ fiveHour: { percentUsed: 75, resetsAt: '2026-11-24T02:24:13.000Z' } })
  expect(geminiLimitsFrom(undefined)).toBeUndefined()
  expect(geminiUsageFrom('broken')).toBeUndefined()
  expect(geminiUsageFrom(JSON.stringify({ ...AGY_USAGE, command: { ...AGY_USAGE.command, name: 'models' } }))).toBeUndefined()
})

test('a bounded Gemini status parses its windows and counters, cache reads above the input included', () => {
  expect(geminiStatusFrom(JSON.stringify(GEMINI_ONE))).toEqual({ ...GEMINI_ONE, rateLimits: GEMINI_PLAN })
  expect(geminiStatusFrom(JSON.stringify({ ...GEMINI_ONE, rateLimits: null }))?.rateLimits).toBeUndefined()
})

test('missing Gemini thinking and total counts stay unknown', () => {
  const { thinking_tokens: _, total_tokens: __, ...counted } = GEMINI_USAGE
  expect(geminiStatusFrom(JSON.stringify({ ...GEMINI_ONE, totalTokenUsage: counted }))?.totalTokenUsage)
    .toEqual({ ...counted, thinking_tokens: null, total_tokens: null })
})

test('an invalid or oversized Gemini status supplies no reading', () => {
  expect(geminiStatusFrom('broken')).toBeUndefined()
  expect(geminiStatusFrom(JSON.stringify({ ...GEMINI_ONE, totalTokenUsage: { ...GEMINI_USAGE, cache_read_tokens: '9' } }))).toBeUndefined()
  expect(geminiStatusFrom(JSON.stringify({ ...GEMINI_ONE, state: 'SUCCESS' }))).toBeUndefined()
  expect(geminiStatusFrom(JSON.stringify({ ...GEMINI_ONE, action: 'x'.repeat(61) }))).toBeUndefined()
  expect(geminiStatusFrom(JSON.stringify({ ...GEMINI_ONE, output: 'x'.repeat(17_000) }))).toBeUndefined()
})

test('a plan-only Gemini snapshot parses without run fields, and never becomes a run status', () => {
  expect(geminiPlanFrom(JSON.stringify(GEMINI_SNAPSHOT))).toEqual({ rateLimits: GEMINI_PLAN, updatedAt: 300 })
  expect(geminiStatusFrom(JSON.stringify(GEMINI_SNAPSHOT))).toBeUndefined()
  expect(geminiPlanFrom(JSON.stringify({ ...GEMINI_SNAPSHOT, updatedAt: 'yesterday' }))).toBeUndefined()
  expect(geminiPlanFrom(JSON.stringify({ ...GEMINI_ONE, totalTokenUsage: null }))).toBeUndefined()
  expect(geminiPlanFrom(JSON.stringify(GEMINI_ONE))).toEqual({ rateLimits: GEMINI_PLAN, updatedAt: 100 })
})

test('the Gemini row reads only its declared status file and shows its tokens with no cost', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = geminiFiles(on)
  files.files.other = { text: JSON.stringify({ ...GEMINI_ONE, rateLimits: null, updatedAt: 50 }), mtimeMs: 100 }
  state.seed(AGENTS, [geminiRelay()])
  await start($)
  expect(files.reads).toEqual(['gem-one'])
  const { terminal } = await panelOf($)
  expect(terminal).toContain('23k')
  expect(terminal).not.toContain('23k ≈')
})

test('a Gemini reading gives the header its tile and stamps its own reading age', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 10_000, { HOME: '/home/worker' })
  geminiFiles(on)
  await start($)
  expect(state.usage()).toMatchObject({ gemini: GEMINI_PLAN, geminiReadAt: 10_000, geminiUpdatedAt: 100 })
  expect(state.usage().codexReadAt).toBeUndefined()
  const { header } = await panelOf($)
  expect(header).toContain('Gemini · plan · pace')
  expect(header).toContain('5h  1%')
  expect(header).toContain('7d  0%')
})

test('a plan-only Gemini snapshot supplies usage before any relay runs, and is not reread unchanged', async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = geminiFiles(on)
  delete files.files['gem-one']
  files.files.snapshot = { text: JSON.stringify(GEMINI_SNAPSHOT), mtimeMs: 300 }
  await start($)
  expect(state.usage().gemini).toEqual(GEMINI_PLAN)
  await clock.advance(6000)
  expect(files.reads).toEqual(['snapshot'])
})

test('a session with no Gemini snapshot keeps no Gemini statuses', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  const files = geminiFiles(on)
  delete files.files['gem-one']
  await start($)
  expect(state.usage().geminiStatuses).toBeUndefined()
  expect(state.usage().gemini).toBeUndefined()
})

test('a live Gemini action becomes its row step note, and a running Gemini keeps a stopped relay row running', async ($, on) => {
  const { state } = engine(on, { infos: [] }, 10_000, { HOME: '/home/worker' })
  geminiFiles(on, { ...GEMINI_ONE, state: 'running', updatedAt: 9_000, action: 'run_command npm test' })
  state.seed(AGENTS, [geminiRelay({ status: 'running', stepDone: 4, stepTotal: 4 })])
  await start($)
  expect(byId(state.agents(), 'relay')).toMatchObject({ status: 'running', geminiState: 'running', stepNote: 'run_command npm test' })
})

test('a relay turn.complete cannot finish a running Gemini row, and a finished Gemini releases it', async ($, on) => {
  const { clock, state } = engine(on, { infos: [] }, 0, { HOME: '/home/worker' })
  on('turn.complete', () => ({ text: '' }))
  const files = geminiFiles(on, { ...GEMINI_ONE, state: 'running' })
  state.seed(AGENTS, [geminiRelay({ status: 'running', endedAt: undefined })])
  await start($)
  await $.turn.complete({ answer: 'waiting', durationMs: 1, isAborted: false, turnId: 't1', agentId: 'relay', reason: 'answer' })
  expect(byId(state.agents(), 'relay')).toMatchObject({ status: 'running', relayStatus: 'done', geminiState: 'running' })
  files.files['gem-one'] = { text: JSON.stringify(GEMINI_ONE), mtimeMs: 300 }
  await clock.advance(3000)
  expect(byId(state.agents(), 'relay')?.status).toBe('done')
})

test('a failed Gemini fails a completed relay row, and a stale heartbeat stops holding it', () => {
  const status = geminiStatusFrom(JSON.stringify(GEMINI_ONE))!
  expect(geminiRun(geminiRelay(), { statuses: {}, geminiStatuses: { 'gem-one': { ...status, state: 'failed' } } }, 0).status).toBe('failed')
  const stale = { statuses: {}, geminiStatuses: { 'gem-one': { ...status, state: 'running' as const, updatedAt: 0 } } }
  expect(geminiRun(geminiRelay(), stale, 10_000).status).toBe('running')
  expect(geminiRun(geminiRelay(), stale, 20_000).status).toBe('done')
  expect(geminiRun(run('plain', { status: 'done' }), stale, 0)).toEqual(run('plain', { status: 'done' }))
})

test('a running Gemini bar stays below full even when all steps were reported', () => {
  expect(progressOf(geminiRelay({ geminiState: 'running', status: 'running', stepDone: 4, stepTotal: 4 }))).toBe(0.99)
})

test('a Gemini conversation resumed twice contributes only its largest cumulative snapshot, and no cost', () => {
  const status = geminiStatusFrom(JSON.stringify(GEMINI_ONE))!
  const usage: UsageReadings = { statuses: {}, geminiStatuses: Object.fromEntries([1, 2, 3].map(n =>
    ['gem-' + n, { ...status, totalTokenUsage: { ...status.totalTokenUsage, input_tokens: n * 10_000 } }])) }
  const rows = [1, 2, 3].map(n => geminiRelay({ id: String(n), geminiStatus: 'gem-' + n }))
  const t = totals([...rows, run('worker', { tokens: 200, costUsd: 0.2 })], 0, usage)
  expect(t.gemini).toEqual({ tokens: 30_000 + 9099 + 460, cost: undefined })
  expect(t.showsGemini).toBe(true)
  expect(t.claude).toMatchObject({ tokens: 200, cost: 0.2 })
})

test('without Gemini the family totals leave it out', () => {
  expect(totals([run('worker', { tokens: 200 })], 0).showsGemini).toBe(false)
})

test('a Gemini worker puts Gemini beside Codex in the cost and token tiles', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed(AGENTS, [geminiRelay({ geminiStatus: undefined })])
  state.seed(FLOW, flowOf())
  const header = (await headerOf($)).source
  expect(header).toContain('Gemini —')
  expect(header).not.toContain('Codex —')
})

test('three plan families go two to a row, the third spanning a row of its own', async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  state.seed('usage', { ...READINGS, gemini: GEMINI_PLAN })
  state.seed(FLOW, flowOf())
  const header = await headerOf($)
  expect(planBoxes(header.source)).toEqual([{ x: 0, y: 90, width: 233 }, { x: 239, y: 90, width: 233 }, { x: 0, y: 178, width: 472 }])
  expect(header.source).toContain('Gemini · plan · pace</text>')
  expect(header.height).toBe(264)
})

test('compact usage adds Gemini after the others, and leaves it out unread', () => {
  expect(planUsageText({ ...READINGS, gemini: GEMINI_PLAN })).toBe('Claude 41/94%  Codex 2/9%  Gemini 1/0%')
  expect(planUsageText({ gemini: GEMINI_PLAN })).toBe('Gemini 1/0%')
  expect(planUsageText(READINGS)).toBe('Claude 41/94%  Codex 2/9%')
})

test('a Gemini reading stamps its own reading time and history', () => {
  const recorded = recordPlanUsage({ statuses: {} }, 'gemini', GEMINI_PLAN, 5)
  expect(recorded).toMatchObject({ gemini: GEMINI_PLAN, geminiReadAt: 5 })
  expect(recorded.codexReadAt).toBeUndefined()
  expect(recorded.history?.gemini?.fiveHour?.samples).toEqual([{ at: 5, percentUsed: 1 }])
})

test('the budget summary gives Gemini its own windows and policy verdicts', () => {
  const usage: UsageReadings = { statuses: {}, gemini: { fiveHour: budgetWindow(), week: budgetWindow(20, 'week') }, policies: { gemini: 'full' } }
  expect(budgetSummary(usage, BUDGET_AT).gemini).toEqual({
    fiveHour: { used: 60, resetsAt: budgetWindow().resetsAt, projectedAtReset: 120,
      exhaustsAt: new Date(BUDGET_AT + 100 * MINUTE).toISOString(), pace: 'average', policy: 'full', verdict: 'over' },
    week: { used: 20, resetsAt: budgetWindow(20, 'week').resetsAt, projectedAtReset: 40, exhaustsAt: null, pace: 'average', policy: 'full', verdict: 'ok' },
  })
  expect(budgetSummary(usage, BUDGET_AT).codex).toEqual({})
})

const GEMINI_ASKS: UsageReadings = { statuses: {}, gemini: { fiveHour: budgetWindow() }, policies: { gemini: 'within' } }

test("the gate holds Gemini's costly relays while Gemini asks, and only them", () => {
  for (const type of ['savvy-flow:savvy-gemini-hydrogen', 'savvy-gemini-carbon']) {
    const refusal = budgetGate(type, GEMINI_ASKS, [], BUDGET_AT)
    expect(refusal).toContain('Gemini')
    expect(refusal).toContain('/savvy-budget gemini once')
  }
  for (const type of ['savvy-gemini-flash', 'savvy-flow:savvy-gemini-argon', 'savvy-heavy', 'savvy-codex-sol']) {
    expect(budgetGate(type, GEMINI_ASKS, [], BUDGET_AT)).toBeUndefined()
  }
  // A Claude ask does not hold Gemini back, and the other family's yes does not open it.
  expect(budgetGate('savvy-gemini-hydrogen', askUsage(), [], BUDGET_AT)).toBeUndefined()
  expect(budgetGate('savvy-gemini-hydrogen', decideBudget(GEMINI_ASKS, 'codex', BUDGET_AT, 'user'), [], BUDGET_AT)).toBeDefined()
  expect(budgetGate('savvy-gemini-hydrogen', decideBudget(GEMINI_ASKS, 'gemini', BUDGET_AT, 'user'), [], BUDGET_AT)).toBeUndefined()
})

test('/savvy-budget gemini sets its policy alone, and once opens its gate until the next reset', async ($, on) => {
  const { state } = budgetEngine(on)
  launching($, on)
  await start($)
  expect(await budgetCommand($, 'gemini full')).toMatchObject({ text: 'Budget: Claude pace · Codex pace · Gemini full.' })
  expect(state.usage().policies).toEqual({ gemini: 'full' })
  state.seed('usage', GEMINI_ASKS)
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-gemini-hydrogen' })).deny).toContain('/savvy-budget gemini once')
  const until = formatPlanReset(budgetWindow(), true, BUDGET_AT, { locale: 'en-GB' }).slice(2)
  expect(await budgetCommand($, 'gemini once')).toMatchObject({ text: `Budget: Claude pace · Codex pace · Gemini within. Gemini: go until ${until}.` })
  expect((await launch($, 'dig', { subagent_type: 'savvy-flow:savvy-gemini-hydrogen' })).deny).toBeUndefined()
})

test("the decide tool records the user's yes for Gemini", async ($, on) => {
  const { state, seed } = gatedLaunch($, on, GEMINI_ASKS)
  await start($)
  seed()
  expect((await launch($, 'dig', { subagent_type: 'savvy-gemini-carbon' })).deny).toContain('PLANS only')
  expect((await launch($, 'dig', { subagent_type: 'savvy-gemini-hydrogen' })).deny).toContain('Budget gate: Gemini')
  say('Yes, use Gemini.')
  expect((await decideWith($, { family: 'gemini', answer: 'yes, use gemini' })).result).toBe(`ok: Gemini go until ${budgetWindow().resetsAt}`)
  expect(state.usage().decisions?.gemini).toMatchObject({ by: 'orchestrator', words: 'yes, use gemini' })
  expect((await launch($, 'dig', { subagent_type: 'savvy-gemini-hydrogen' })).deny).toBeUndefined()
})

test('the top-tier gate refuses Carbon, either name, whatever the budget says, and names the way out', () => {
  const ok: UsageReadings = { statuses: {}, gemini: { fiveHour: budgetWindow(10, 'fiveHour', 3) } }
  for (const type of ['savvy-gemini-carbon', 'savvy-flow:savvy-gemini-carbon']) {
    const refusal = topTierGate(type, ok)
    expect(refusal).toContain('savvy-gemini-carbon (Gemini Carbon) is for PLANS only')
    expect(refusal).toContain('(tier carbon, uses 1')
    expect(refusal).toContain('Hydrogen (Gemini)')
  }
  expect(topTierGate('savvy-gemini-carbon', ok, true, 'it')).toContain('(tier carbon, uses 1')
  expect(topTierGate('savvy-gemini-hydrogen', ok)).toBeUndefined()
  // Fable's and Astra's refusals still name their own tiers.
  expect(topTierGate('savvy-fable', ok)).toContain('savvy-fable (Claude Fable) is for PLANS only')
  expect(topTierGate('savvy-fable', ok)).toContain('(tier fable, uses 1')
  expect(topTierGate('savvy-codex-astra', ok)).toContain('savvy-codex-astra (Codex Astra) is for PLANS only')
  expect(topTierGate('savvy-codex-astra', ok)).toContain('(tier astra, uses 1')
})

test('the Carbon relay is held like Fable and Astra, and the yes of one top tier opens no other', async ($, on) => {
  const { state, seed } = topGated($, on)
  await start($)
  seed()
  expect((await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-gemini-carbon' })).deny).toContain('Hydrogen (Gemini)')
  expect((await decideTier($, { tier: 'carbon', family: 'codex' })).deny).toBeDefined()
  expect((await decideTier($, { tier: 'carbon', family: 'gemini' })).result).toBe('ok: Gemini Carbon allowed for 1 launch')
  expect(state.usage().topTiers?.['gemini-carbon']).toMatchObject({ uses: 1 })
  expect((await launch($, 'fable', { subagent_type: 'savvy-flow:savvy-fable' })).deny).toContain('PLANS only')
  expect((await launch($, 'astra', { subagent_type: 'savvy-codex-astra' })).deny).toContain('PLANS only')
  expect((await launch($, 'plan', { subagent_type: 'savvy-flow:savvy-gemini-carbon' })).deny).toBeUndefined()
  expect((await launch($, 'plan2', { subagent_type: 'savvy-gemini-carbon' })).deny).toContain('used up')
  expect(state.usage().topTiers?.['gemini-carbon']?.uses).toBe(0)
})

// ---------------------------------------------------------------------------
// The Tools tier: in the plan, the panel and the estimates like the other Claude tiers, and not a gated one.

test('a planned Tools task has its own color and label, under the costume of the tier on its model', { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  await start($)
  await plan($, [{ title: 'capture the page', tier: 'savvy-tools' }, { title: 'second capture', tier: 'tools', effort: 'high' }])
  expect(state.flow()?.tasks.map(t => t.tier)).toEqual(['tools', 'tools'])
  const { rows: [first, second] } = await panelOf($)
  expect(first).toContain('<tspan fill="#C46686">tools</tspan>')
  expect(first).toContain('Sonnet · medium')
  expect(first).toContain('class="c-medium"')
  expect(second).toContain('Sonnet · high')
})

test('the progress tool takes the tools tier', async ($, on) => {
  const { registered } = engine(on, { infos: [] })
  await start($)
  const schema = registered.find(t => t.name === 'progress')?.inputSchema as { properties: { tasks: { items: { properties: { tier: { enum: string[] } } } } } }
  expect(schema.properties.tasks.items.properties.tier.enum).toEqual(expect.arrayContaining(['fable', 'heavy', 'careful', 'medium', 'light', 'tools', 'other']))
})

test("every theme, and the classic set, draws the Tools figure in Medium's costume, in its own color", () => {
  const faults: string[] = []
  for (const [theme, dress] of [['classic', null] as const, ...Object.entries(DRESSES)]) {
    const cls = dress ? `c-${dress.prefix}-medium` : 'c-medium'
    if (!figureSvg('tools', dress).includes(`class="${cls}`)) faults.push(`${theme}: not dressed as medium`)
  }
  expect(faults).toEqual([])
  expect(figureSvg('tools', null)).toContain('fill="#C46686"')
})

test('a planned Tools task learns the version of its model alias', () => {
  expect(plannedModel({ title: 'capture', tier: 'tools', after: [] }, { codex: {}, claude: { sonnet: 'Sonnet 5.5' } })).toBe('Sonnet 5.5 · medium')
})

test('the Tools tier has an estimate of its own', () => {
  const runs = [run('t1', { type: 'savvy-flow:savvy-tools', status: 'done', costUsd: 1 }), run('t2', { type: 'savvy-tools', status: 'done', costUsd: 3 })]
  expect(tierEstimates(runs, spending(40, 50, 10, 30), BUDGET_AT)).toEqual({ tools: { runs: 2, usd: 2, fiveHour: 1, week: 0.1 } })
})

test('the Tools tier is held by neither the budget gate nor the top-tier gate', () => {
  expect(budgetGate('savvy-flow:savvy-tools', askUsage(), [], BUDGET_AT)).toBeUndefined()
  expect(topTierGate('savvy-flow:savvy-tools', { statuses: {} })).toBeUndefined()
})

test('a plan and a run stored before the Tools tier draw without a fault', { options: { theme: 'classic' } }, async ($, on) => {
  const { state } = engine(on, { infos: [] })
  state.seed(FLOW, flowOf({ tasks: [{ title: 'old capture', tier: 'other', after: [], agent: 'savvy-flow:savvy-tools' }, { title: 'odd', tier: 'vanished', after: [] }] }))
  state.seed(AGENTS, [run('past', { type: 'savvy-flow:savvy-tools', status: 'done', endedAt: 5 })])
  await start($)
  const { terminal } = await panelOf($)
  expect(terminal).toContain('old capture')
  expect(terminal).toContain('odd')
  expect(terminal).toContain('task past')
})

// ---------------------------------------------------------------------------
// The routing card: the skill's routing rules, given again with every plan and after a compaction or a resume.

const CARD = 'routing: re-tier each open task'
const send = ($: Engine, input: Record<string, unknown>) => $.tool.call({ tool: 'mcp__savvy-progress__progress', ...input })

test('a call that sets tasks ends with the routing card, short, after the budget line', async ($, on) => {
  engine(on, { infos: [] })
  await start($)
  const result = String((await plan($, [{ title: 'build', tier: 'careful' }])).result)
  const lines = result.split('\n')
  expect(lines[0]).toContain('ok:')
  expect(lines[1]).toContain('budget: ')
  const card = result.slice(result.indexOf(CARD))
  expect(card.split('\n').length).toBeLessThanOrEqual(8)
  expect(card.length).toBeLessThanOrEqual(700)
  expect(card).toContain('- Tools')
  expect(card).toContain('judging images')
})

test('the routing card speaks the panel language, within the same bound', { options: { language: 'it' } }, async ($, on) => {
  engine(on, { infos: [] })
  await start($)
  const result = String((await plan($, [{ title: 'build', tier: 'careful' }])).result)
  const card = result.slice(result.indexOf('instradamento:'))
  expect(card).toContain('- Tools')
  expect(card.split('\n').length).toBeLessThanOrEqual(8)
  expect(card.length).toBeLessThanOrEqual(700)
})

test('a call without tasks, with none left, or that finishes the flow carries no routing card', async ($, on) => {
  engine(on, { infos: [] })
  await start($)
  const open = [{ title: 'build', tier: 'careful' }]
  await plan($, open)
  expect((await send($, { done: 1, phase: 'review' })).result).not.toContain(CARD)
  expect((await send($, { tasks: [], total: 1, done: 1 })).result).not.toContain(CARD)
  expect((await send($, { tasks: open, finished: true })).result).not.toContain(CARD)
})

test('a worker that calls progress gets no routing card', async ($, on) => {
  engine(on, { infos: [] })
  await start($)
  const refused = await send($, { agentId: 'w1', title: 'mine', tasks: [{ title: 'x', tier: 'light' }] })
  expect(refused.result).toBe('ignored: only the main session reports the flow')
})

test('after a compaction or a resume the open plan brings the routing card back, beside what other hooks add', async ($, on) => {
  engine(on, { infos: [] })
  on('classic.SessionStart', () => ({ additionalContext: ['theirs'] }))
  await start($)
  await plan($, [{ title: 'build', tier: 'careful' }])
  for (const source of ['compact', 'resume'] as const) {
    const { additionalContext } = await $.classic.SessionStart({ source })
    expect(additionalContext?.[0]).toBe('theirs')
    expect(additionalContext?.[1]).toContain(CARD)
    expect(additionalContext).toHaveLength(2)
  }
})

test('the routing card stays away at a fresh start, in a subagent, and while no plan is open', async ($, on) => {
  engine(on, { infos: [] })
  on('classic.SessionStart', () => ({}))
  await start($)
  expect((await $.classic.SessionStart({ source: 'compact' })).additionalContext).toBeUndefined()
  await plan($, [{ title: 'build', tier: 'careful' }])
  for (const source of ['startup', 'clear'] as const) expect((await $.classic.SessionStart({ source })).additionalContext).toBeUndefined()
  expect((await $.classic.SessionStart({ source: 'compact', agent_id: 'w1' })).additionalContext).toBeUndefined()
  await send($, { finished: true })
  expect((await $.classic.SessionStart({ source: 'compact' })).additionalContext).toBeUndefined()
})

// ---------------------------------------------------------------------------
// The fit gate: a ready procedure run through a connected tool is Tools work. The briefs are invented.

const RECIPE = 'Run the ready procedure in docs/capture.md through the browser tools: the five pages, the steps in order. Return the files.'
const WHY = `${RECIPE}\nwhy-not-tools: the procedure broke last time and its cause is unknown`

test('the fit gate refuses a ready run on a costly Claude tier, names the rule and the way through', () => {
  for (const tier of ['heavy', 'careful', 'fable']) {
    const refusal = fitGate(`savvy-flow:savvy-${tier}`, 'Shoot the settings pages', RECIPE)
    expect(refusal).toContain('Fit gate')
    expect(refusal).toContain('Connected tools')
    expect(refusal).toContain('Relaunch it as savvy-tools')
    expect(refusal).toContain(`savvy-${tier} after all`)
    expect(refusal).toContain('why-not-tools: <reason>')
  }
  expect(fitGate('savvy-careful', 'Shoot the settings pages', RECIPE, 'it')).toContain('Blocco di idoneità')
})

test('the fit gate reads the run in the title however it is worded, and the tool and the procedure in the prompt', () => {
  const RUNS: [string, string][] = [
    ['Capture the checkout flow', 'Follow the steps of the last capture in the simulator, views unchanged.'],
    ['Photograph the second lamp model', 'Same scripts as for the first; the editor is driven through mcp__scene__run.'],
    ['Report pages: export and screenshots', 'The recipe is in RECIPE.md. Drive the app with its MCP tools.'],
    ['Re-export the icons', 'Everything is prepared: run the export on the device and list the files.'],
    ['Screenshots of the new theme', 'Repeat the previous capture in the browser with the theme switched.'],
  ]
  for (const [title, prompt] of RUNS) expect([title, fitGate('savvy-careful', title, prompt) !== undefined]).toEqual([title, true])
})

test('the fit gate lets genuine work through', () => {
  const WORK: [string, string][] = [
    // A build whose brief ends in an export, or quotes the procedure for later.
    ['New checkout layout', `Build the new layout, then export it. ${RECIPE}`],
    ['Build and export the icon set', RECIPE],
    ['Fix the flicker, capture', RECIPE],
    ['Capture flicker probe', RECIPE],
    ['Compose the page and capture it', RECIPE],
    ['Add a screenshot button', RECIPE],
    ['Tools tier in the panel', RECIPE],
    // A run with no connected tool, and a run in one with no procedure to repeat.
    ['Export the parser module', 'Follow the same steps as the lexer module: move it, export it, run the tests.'],
    ['Capture the empty state', 'Open the browser, work out how to reach the empty state, and explain why it differs.'],
    // Features whose title is a run's word; the worker's progress tool, in every brief, is no connected tool.
    ['Export orders to CSV', 'Report with mcp__savvy-progress__step. Follow the steps of the import module and run its tests.'],
    ['Record login attempts', 'Call `mcp__savvy-progress__step` first. Same method as the audit log; the tests run in CI.'],
    ['Capture webhook payloads', 'Get the endpoint ready for review. The list is read in the browser.'],
    // A title that only resembles a run.
    ['Exporter crash on empty input', RECIPE],
    ['Recorder rewrite', RECIPE],
  ]
  for (const [title, prompt] of WORK) expect([title, fitGate('savvy-careful', title, prompt)]).toEqual([title, undefined])
})

test('a why-not-tools line with a reason opens the fit gate, and an empty or placeholder one does not', () => {
  for (const line of ['why-not-tools: new camera, no recipe yet', '- Why-Not-Tools: diagnosis first', '  why-not-tools: "broken"']) {
    expect([line, fitGate('savvy-heavy', 'Shoot the pages', `${RECIPE}\n${line}`)]).toEqual([line, undefined])
  }
  for (const line of ['why-not-tools:', 'why-not-tools:   ', 'why-not-tools: <reason>', 'why-not-tools: -', 'say why-not-tools: in a line']) {
    expect([line, fitGate('savvy-heavy', 'Shoot the pages', `${line}\n${RECIPE}`) !== undefined]).toEqual([line, true])
  }
})

test('the fit gate leaves the other tiers, families and agents alone', () => {
  for (const type of ['savvy-tools', 'savvy-flow:savvy-tools', 'savvy-medium', 'savvy-light', 'savvy-codex-sol', 'savvy-codex-astra', 'savvy-gemini-hydrogen', 'Explore', 'general-purpose', 'heavy']) {
    expect([type, fitGate(type, 'Shoot the settings pages', RECIPE)]).toEqual([type, undefined])
  }
})

test('the fit gate opens on missing or unreadable text', () => {
  const CALLS: [unknown, unknown, unknown][] = [
    ['savvy-careful', undefined, RECIPE], ['savvy-careful', 'Shoot the pages', undefined], ['savvy-careful', 'Shoot the pages', ''],
    ['savvy-careful', '', RECIPE], ['savvy-careful', 7, RECIPE], ['savvy-careful', 'Shoot the pages', { text: RECIPE }],
    [undefined, 'Shoot the pages', RECIPE], [null, null, null],
  ]
  for (const call of CALLS) expect(fitGate(...call)).toBeUndefined()
})

test('a launch the fit gate refuses starts nothing and leaves the bar where it was; with the line it passes', async ($, on) => {
  const state = planned($, on)
  await start($)
  await plan($, [{ title: 'Shoot the pages', tier: 'careful' }])
  const before = state.flow()
  const writes = state.written.length
  const refused = await launch($, 'Shoot the pages', { ...careful, prompt: RECIPE })
  expect(refused.deny).toContain('Fit gate')
  expect(state.agents()).toEqual([])
  expect(state.flow()).toEqual(before)
  expect(state.written.slice(writes)).toEqual([])
  expect((await launch($, 'Shoot the pages', { ...careful, prompt: WHY })).deny).toBeUndefined()
  expect(state.agents().map(a => a.description)).toEqual(['Shoot the pages'])
})

test('the same brief relaunched as Tools passes at once', async ($, on) => {
  const state = planned($, on)
  await start($)
  await plan($, [{ title: 'Shoot the pages', tier: 'tools' }])
  expect((await launch($, 'Shoot the pages', { ...careful, prompt: RECIPE })).deny).toContain('Fit gate')
  expect((await launch($, 'Shoot the pages', { subagent_type: 'savvy-flow:savvy-tools', prompt: RECIPE })).deny).toBeUndefined()
  expect(state.agents().map(a => a.type)).toEqual(['savvy-flow:savvy-tools'])
})

test('the plan gate and the budget gate answer before the fit gate, and its line opens neither', async ($, on) => {
  const { state, seed } = gatedLaunch($, on, askUsage())
  await start($)
  await plan($, [{ title: 'Shoot the pages', tier: 'careful' }])
  expect((await launch($, 'Shoot other pages', { ...careful, prompt: WHY })).deny).toContain('Plan gate')
  seed()
  expect((await launch($, 'Shoot the pages', { ...careful, prompt: WHY })).deny).toContain('Budget gate')
  expect(state.agents()).toEqual([])
})

test("a fit refusal spends no use of a top tier's yes", async ($, on) => {
  const { state } = topGated($, on)
  await start($)
  state.seed('usage', { statuses: {}, topTiers: { fable: { at: 0, words: 'yes', uses: 1 } } })
  expect((await launch($, 'Shoot the pages', { prompt: RECIPE })).deny).toContain('Fit gate')
  expect(state.usage().topTiers?.fable?.uses).toBe(1)
})

test('a SendMessage resume of a worker is not held by the fit gate', async ($, on) => {
  const state = planned($, on)
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  state.seed(AGENTS, [run('w1', { status: 'done' })])
  const resumed = await $.tool.call({ tool: 'SendMessage', tool_use_id: 'send-w1', to: 'w1', summary: 'Shoot the pages', message: RECIPE })
  expect(resumed.deny).toBeUndefined()
})

test('a SendMessage resume of a Carbon worker needs a yes with a use left', async ($, on) => {
  const { state, seed } = topGated($, on)
  state.seed(AGENTS, [run('car', { type: 'savvy-flow:savvy-gemini-carbon', status: 'done' }), run('hy', { type: 'savvy-flow:savvy-gemini-hydrogen', status: 'done' })])
  on('tool.call', { tool: 'SendMessage' }, () => ({ result: { success: true } }))
  await start($)
  seed()
  const resume = (to: string) => $.tool.call({ tool: 'SendMessage', tool_use_id: `send-${to}`, to, message: 'go on' })
  expect((await resume('car')).deny).toContain('resume (SendMessage)')
  expect((await resume('hy')).deny).toBeUndefined()
  await decideTier($, { tier: 'carbon' })
  expect((await resume('car')).deny).toBeUndefined()
  expect((await resume('car')).deny).toContain('used up')
})
