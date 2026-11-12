export type Phase = 'plan' | 'design' | 'delegate' | 'review' | 'close'

export type PlannedTask = {
  title: string
  /** A savvy tier, or `other` for an agent of the project that is no savvy worker. */
  tier: string
  after: number[]
  /** The effort the task's Agent call passes, when it is not its tier's. */
  effort?: string
  /** The model the task's Agent call passes, when it is not its tier's. */
  model?: string
  /** For tier `other`: the agent type the task runs as. */
  agent?: string
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
  /** Codex's own model and effort, declared by its relay; accounting stays Claude's. */
  codexModel?: string
  codexEffort?: string
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
  /** Planned steps the worker left undone, as it reports them. */
  stepSkipped?: number
}

export type Panel = {
  isCompact: boolean
  isDoneCollapsed: boolean
  autoOpenedFor: string
}

export type ModelHints = {
  codex: Record<string, string>
  /** First resolved model label seen for each Claude alias. */
  claude: Record<string, string>
  cacheReadAt?: number
}

// What the agents panel shows, copied from the live values once a second: the
// panel redraws on this alone, so the copy can wait while its theme picker is open.
export type PaneView = {
  flow: Flow | null
  agents: AgentRun[]
  now: number
  models?: ModelHints
}

declare module 'claude-code' {
  interface PluginState {
    'savvy-progress': {
      flow: Flow | null
      agents: AgentRun[]
      panel: Panel
      now: number
      models: ModelHints
      /** The `theme` option's value as last picked: `auto` or a theme's name. */
      theme: string
      /** What the agents panel shows; null until the first copy. */
      shown: PaneView | null
      /** When the theme picker took the panel's focus, in ms; 0 while it has not. No drawing reads it. */
      picking: number
    }
  }
}
