export type Phase = 'plan' | 'design' | 'delegate' | 'review' | 'close'

export type PlannedTask = {
  title: string
  tier: string
  after: number[]
}

export type Flow = {
  title: string
  total: number
  done: number
  running: number
  phase: Phase
  isFinished: boolean
  tasks: PlannedTask[]
}

export type AgentStatus = 'running' | 'done' | 'failed'

export type AgentRun = {
  id: string
  agentId?: string
  type: string
  description: string
  model: string
  effort?: string
  status: AgentStatus
  startedAt: number
  endedAt?: number
  contextTokens: number
  contextMax: number
  tokens: number
  costUsd: number
  steps: number
  round: number
  /** Started by a workflow script's `agent()`: `$.agent.list()` never lists it. */
  isWorkflow?: boolean
  /** Self-reported by the worker through the `step` tool. */
  stepDone?: number
  stepTotal?: number
  stepNote?: string
}

export type Panel = {
  isCompact: boolean
  isDoneCollapsed: boolean
  autoOpenedFor: string
}

// The panel's view held still while its theme picker has the focus: a redraw would
// send the open list back to where it started.
export type HeldView = {
  flow: Flow | null
  agents: AgentRun[]
  now: number
  /** When the picker took the focus. */
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'savvy-progress': {
      flow: Flow | null
      agents: AgentRun[]
      panel: Panel
      now: number
      /** The `theme` option's value as last picked: `auto` or a theme's name. */
      theme: string
      /** The view the panel holds while the theme picker is open; null otherwise. */
      held: HeldView | null
    }
  }
}
