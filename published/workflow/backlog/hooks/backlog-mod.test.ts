// Tests of the backlog mod: the command opens the pane and reads the register through the skill's own script; the
// pane's rows open an entry, its document, and filter the documents. Labels depend on the locale, so the checks
// address elements by their keys.
import { expect, mock, test } from 'claude-code/testing'

const SNAPSHOT = {
  root: '/work',
  board: {
    project: { name: 'shop', backlog: 'docs/implementations/BACKLOG.md', history: 'docs/implementations/BACKLOG-HISTORY.md', docsDir: 'docs/implementations', citation: 'wiki' },
    totals: {
      open: 2, inProgress: 1, blocked: 0, notStarted: 1, closed: 1, pending: 1,
      byPriority: { high: 1, medium: 1, low: 0, none: 0 },
      phases: { done: 1, active: 1, dropped: 1, planned: 1 },
    },
    entries: [
      {
        id: 'BKLG-002', title: 'Import pipeline', status: 'in-progress', statusText: 'in-progress — P2 dedupe',
        priority: 'high', added: '2026-10-01', summary: 'Import the bank file.', fields: { Slice: '—' },
        docs: [{ label: 'spec', path: 'docs/implementations/features/import/spec.md' }],
        phases: [
          { name: 'P1', label: 'parse', state: 'done', note: '' },
          { name: 'P2', label: 'dedupe', state: 'active', note: '' },
          { name: 'P3', label: 'report', state: 'planned', note: '' },
          { name: 'P4', label: 'background job', state: 'dropped', note: '**dropped** — the import takes 2 s, see [[BKLG-003]]' },
        ],
        phaseCounts: { done: 1, active: 1, dropped: 1, planned: 1 },
        waitsOn: [], cites: ['BKLG-003'], citedBy: [], unblocks: [],
        last: { date: '2026-10-08T10:00:00Z', sha: 'c2', subject: 'BKLG-002 P2: dedupe' },
        block: '## BKLG-002 — Import pipeline\n- **Status**: in-progress — P2 dedupe\n- **Summary**: see [[BKLG-003]]',
      },
      {
        id: 'BKLG-003', title: 'Retry flow', status: 'open', statusText: 'open', priority: 'medium', added: '2026-10-02',
        summary: '', fields: {}, docs: [], phases: [], phaseCounts: { done: 0, active: 0, dropped: 0, planned: 0 },
        waitsOn: [], cites: [], citedBy: ['BKLG-002'], unblocks: [], last: null, block: '## BKLG-003 — Retry flow',
      },
    ],
    inProgress: ['BKLG-002'],
    blocked: [],
    next: [{ id: 'BKLG-003', unblocks: 0, citedBy: 1, priority: 'medium', added: '2026-10-02' }],
    pending: [{ kind: 'verification', items: [{ label: 'Review', text: '[[BKLG-002]] — look at the report', ids: ['BKLG-002'] }] }],
    closed: [{ id: 'BKLG-001', phase: '', title: 'First', text: 'First — shipped', day: '2026-09-29', docs: [] }],
    activity: [{ sha: 'c2', date: '2026-10-08T10:00:00Z', subject: 'BKLG-002 P2: dedupe', ids: ['BKLG-002'], mentions: [] }],
  },
  tree: [
    { group: 'register', docs: ['docs/implementations/BACKLOG.md'] },
    { group: 'work', docs: ['docs/implementations/features/import/spec.md'] },
    { group: 'architecture', docs: [] },
    { group: 'archive', docs: [] },
    { group: 'other', docs: ['README.md'] },
  ],
}

const SPEC = '# Import\n\nSee [the register](../../BACKLOG.md) and [[BKLG-003]].\n'

const PANE = {
  plugin: 'backlog',
  component: 'Pane',
  requestId: 'backlog-dashboard',
  surface: 'terminal',
  viewport: { columns: 120, rows: 40 },
  props: { title: 'Backlog', isFocused: true, bodyColumns: 90, placement: 'inline', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

/** The stubs every test needs: the pane opens, the session's folder, the script's answer, the documents. */
function stubs(on, runs: string[][], answer = { exitCode: 0, stdout: JSON.stringify(SNAPSHOT), stderr: '' }) {
  mock.clock(on)
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.cwd', () => ({ value: '/work' }))
  on('process.run', ($, e) => {
    runs.push([...e.argv])
    return { value: answer }
  })
  on('fs.read', ($, e) => ({ value: e.path.endsWith('spec.md') ? SPEC : '# Register' }))
}

test('the command opens the pane and reads the register through the skill script, for the session folder', async ($, on) => {
  const runs: string[][] = []
  stubs(on, runs)
  const answer = await $.command.run({ command: 'backlog-dashboard', args: '' })
  expect(answer).toEqual({})
  expect(runs.length).toBe(1)
  expect(runs[0][0]).toBe('node')
  expect(runs[0][1]).toMatch(/scripts\/dashboard\.mjs$/)
  expect(runs[0].slice(2)).toEqual(['--json', '--root', '/work'])

  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ key: 'entry-BKLG-002' })).toBeDefined()
  expect(await ui.find({ key: 'next-BKLG-003' })).toBeDefined()
  expect(await ui.find({ key: 'now-BKLG-002' })).toBeDefined()
  expect(await ui.find({ key: 'tab-docs' })).toBeDefined()
  expect(await ui.find({ key: 'back' })).toBeUndefined()
})

test('an entry opens with its phases, its docs and its links; its doc opens with pressable links', async ($, on) => {
  stubs(on, [])
  await $.command.run({ command: 'backlog-dashboard', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'entry-BKLG-002' })
  expect(await ui.find({ key: 'back' })).toBeDefined()
  expect(await ui.find({ key: 'cite-BKLG-003' })).toBeDefined()
  expect(await ui.find({ key: 'phase-BKLG-002-P2' })).toBeDefined()

  await ui.press({ key: 'edoc-docs/implementations/features/import/spec.md' })
  const md = await ui.find({ key: 'doc-md' })
  expect(md).toBeDefined()
  expect(md.props.text).toContain('(file:///work/docs/implementations/BACKLOG.md)')
  expect(md.props.text).toContain('[BKLG-003](file:///work/docs/implementations/BACKLOG.md#BKLG-003)')
  expect(await ui.find({ key: 'link-docs/implementations/BACKLOG.md' })).toBeDefined()
  expect(await ui.find({ key: 'usedby-BKLG-002' })).toBeDefined()

  await ui.press({ key: 'back' })
  expect(await ui.find({ key: 'cite-BKLG-003' })).toBeDefined()
})

test('the documents tab lists every document and filters them by path', async ($, on) => {
  stubs(on, [])
  await $.command.run({ command: 'backlog-dashboard', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'tab-docs' })
  expect(await ui.find({ key: 'doc-README.md' })).toBeDefined()
  await ui.input({ key: 'doc-filter', text: 'spec' })
  expect(await ui.find({ key: 'doc-README.md' })).toBeUndefined()
  expect(await ui.find({ key: 'doc-docs/implementations/features/import/spec.md' })).toBeDefined()
})

test('on the desktop the overview is drawn as vector cards and its rows stay pressable', async ($, on) => {
  stubs(on, [])
  await $.command.run({ command: 'backlog-dashboard', args: '' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const drawings = await ui.findAll({ type: 'Svg' })
  expect(drawings.length).toBeGreaterThan(1)
  const sources: string[] = drawings.map((d) => d.props.source)
  expect(sources.every((s) => s.startsWith('<svg') && !s.includes('NaN'))).toBe(true)
  expect(sources.some((s) => s.includes('shop'))).toBe(true)
  expect(sources.some((s) => s.includes('stroke-dasharray'))).toBe(true)
  // The entry worked on last (newest commit naming it) is a card with its phases, each pressable, and that commit.
  expect(await ui.find({ key: 'now-BKLG-002' })).toBeDefined()
  expect(await ui.find({ key: 'phase-BKLG-002-P3' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /BKLG-002 P2: dedupe/ })).toBeDefined()
  expect(await ui.find({ key: 'entry-BKLG-002' })).toBeDefined()
  expect(await ui.find({ key: 'next-BKLG-003' })).toBeDefined()
  await ui.press({ key: 'entry-BKLG-002' })
  expect(await ui.find({ key: 'back' })).toBeDefined()
})

test('a phase pressed shows its whole note under the phases, with pressable links; pressed again it closes', async ($, on) => {
  stubs(on, [])
  await $.command.run({ command: 'backlog-dashboard', args: '' })
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ key: 'phase-md-BKLG-002-P4' })).toBeUndefined()

  await ui.press({ key: 'phase-BKLG-002-P4' })
  const detail = await ui.find({ key: 'phase-md-BKLG-002-P4' })
  expect(detail).toBeDefined()
  expect(detail.props.text).toContain('the import takes 2 s')
  expect(detail.props.text).toContain('[BKLG-003](file:///work/docs/implementations/BACKLOG.md#BKLG-003)')
  expect(await ui.find({ type: 'Text', text: /P4 · / })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'background job' })).toBeDefined()

  await ui.press({ key: 'phase-BKLG-002-P4' })
  expect(await ui.find({ key: 'phase-md-BKLG-002-P4' })).toBeUndefined()
})

test('on the entry page every phase is pressable and opens its detail in place', async ($, on) => {
  stubs(on, [])
  await $.command.run({ command: 'backlog-dashboard', args: '' })
  const ui = await $.ui.mount(PANE)
  await ui.press({ key: 'entry-BKLG-002' })
  await ui.press({ key: 'phase-BKLG-002-P2' })
  expect(await ui.find({ key: 'phase-md-BKLG-002-P2' })).toBeUndefined() // P2 has no note: its label is the detail
  expect(await ui.find({ type: 'Text', text: /P2 · / })).toBeDefined()
  await ui.press({ key: 'phase-BKLG-002-P4' })
  expect(await ui.find({ key: 'phase-md-BKLG-002-P4' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /P2 · / })).toBeUndefined()
})

test('a dropped phase is drawn apart from one not started: its own fill and its own mark', async ($, on) => {
  stubs(on, [])
  await $.command.run({ command: 'backlog-dashboard', args: '' })
  const ui = await $.ui.mount({ ...PANE, surface: 'desktop' })
  const sources: string[] = (await ui.findAll({ type: 'Svg' })).map((d) => d.props.source)
  const track = sources.find((s) => s.includes('dropped-hatch') && s.includes('url(#dropped-hatch)'))
  expect(track).toBeDefined()
  const fills = [...track.matchAll(/<rect x="[^"]+" y="26"[^>]*fill="([^"]+)"/g)].map((m) => m[1])
  expect(fills.length).toBe(4)
  expect(new Set(fills).size).toBe(4) // done, active, planned and dropped: four different fills
  const p3 = await ui.find({ key: 'phase-BKLG-002-P3' })
  const p4 = await ui.find({ key: 'phase-BKLG-002-P4' })
  expect(p3.props.label.slice(0, 1)).not.toBe(p4.props.label.slice(0, 1))
})

test('a script that fails shows its message, not an empty pane', async ($, on) => {
  stubs(on, [], { exitCode: 2, stdout: '', stderr: 'dashboard: no register at docs/implementations/BACKLOG.md' })
  await $.command.run({ command: 'backlog-dashboard', args: '' })
  const ui = await $.ui.mount(PANE)
  expect(await ui.find({ type: 'Text', text: /no register at/ })).toBeDefined()
  expect(await ui.find({ key: 'entry-BKLG-002' })).toBeUndefined()
})
