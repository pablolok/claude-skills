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
  name?: string
  /** SendMessage's local summary, held until the engine actually resumes this agent. */
  nextTitle?: string
  /** Last model turn seen; a queued message must not rename a step in that same turn. */
  turnId?: string
  /** The engine's agent roster reports waiting on work owned by this worker. */
  isWaiting?: boolean
  /** Hidden from the panel's Finished list by the user or the flow; still counted in the totals. */
  isCleared?: boolean
  /** An answered turn still needs the roster to confirm that the worker finished. */
  pendingCompletion?: boolean
  /** The worker delivered its report (SubagentHandback): its run is over, whatever it left in the background. */
  isHandedBack?: boolean
  /** At its report the roster still held background work the worker owns: the row says it was left running. */
  leftBackground?: boolean
  /** The tool call the worker is in now, the call's id and when it began; cleared when the call returns. */
  activity?: string
  activityId?: string
  activityAt?: number
  type: string
  description: string
  model: string
  effort?: string
  /** Codex's model, effort and status filename stem, declared by its Claude relay. */
  codexModel?: string
  codexEffort?: string
  codexStatus?: string
  codexState?: AgentStatus
  /** The relay's own state, while an independently running Codex keeps the row live. */
  relayStatus?: AgentStatus
  relayEndedAt?: number
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

export type PlanWindow = { percentUsed: number; resetsAt?: string }
export type PlanUsage = { fiveHour?: PlanWindow; week?: PlanWindow }
export type PlanFamily = 'claude' | 'codex'
export type PlanWindowKey = keyof PlanUsage
export type BudgetPolicy = 'within' | 'full' | 'pace'
/** spentUsd: the family's estimated session spend when the reading was taken, when known. */
export type UsageSample = { at: number; percentUsed: number; spentUsd?: number }
export type WindowHistory = { resetsAt?: string; samples: UsageSample[] }
export type PlanHistory = Partial<Record<PlanWindowKey, WindowHistory>>
export type PlanProjection = {
  projectedAtReset: number
  exhaustsAt?: string
  pace: 'recent' | 'average'
  fits: boolean
}
export type WindowBudget = {
  used: number
  resetsAt: string | null
  projectedAtReset: number | null
  exhaustsAt: string | null
  pace: PlanProjection['pace'] | null
  policy: BudgetPolicy
  /** ok includes windows with no projection yet; consult the nullable fields. */
  verdict: 'ok' | 'over' | 'ask' | 'retier' | 'spend'
  /** Under pace, with retier or spend: what to do about it. */
  advice?: string
}
export type BudgetSummary = Record<PlanFamily, Partial<Record<PlanWindowKey, WindowBudget>>>
/** The user's yes to costly work despite an ask verdict, until the family's soonest reset. */
/** The user's recorded yes to a top tier (fable, codex-astra), which is for plans only: launches and resumes left, or the session. */
export type TopTierPermit = { at: number; words: string; uses: number | 'session' }
/** The gate's latest refusal: when, and how many user messages the transcript held, so a yes must come after them. */
export type GateRefusal = { at: number; userMessages: number }
export type BudgetDecision = { until: string; at: number; by: 'user' | 'orchestrator'; words?: string }
/** A tier's finished runs: their mean estimated cost, and that cost as a share of each window when observed. */
export type TierEstimate = { runs: number; usd: number; fiveHour: number | null; week: number | null }
export type TierEstimates = Record<string, TierEstimate>
export type CodexTokens = {
  input_tokens: number
  cached_input_tokens: number
  output_tokens: number
  reasoning_output_tokens: number | null
}
export type CodexStatus = {
  version: 1
  sessionId: string | null
  model: string | null
  state: AgentStatus
  action: string
  totalTokenUsage: CodexTokens
  rateLimits?: PlanUsage
  updatedAt: number
}
export type UsageReadings = {
  /** Bounded observations and user-owned policies persist with the usage atom. */
  history?: Partial<Record<PlanFamily, PlanHistory>>
  policies?: Partial<Record<PlanFamily, BudgetPolicy>>
  decisions?: Partial<Record<PlanFamily, BudgetDecision>>
  topTiers?: Record<string, TopTierPermit>
  /** The most recent refusal per family (budget gate) and per top tier (top-tier gate). */
  refusals?: { families?: Partial<Record<PlanFamily, GateRefusal>>; tiers?: Record<string, GateRefusal> }
  /** Cumulative estimated spend per family, every model step of the session included. */
  spentUsd?: Partial<Record<PlanFamily, number>>
  claude?: PlanUsage
  claudeReadAt?: number
  claudeCacheReadAt?: number
  codex?: PlanUsage
  /** Last valid Codex plan observation, retained when status files disappear. */
  codexReadAt?: number
  codexUpdatedAt?: number
  codexSource?: { name: string; mtimeMs: number }
  statuses: Record<string, CodexStatus>
  statusMtimes?: Record<string, number>
  cacheReadAt?: number
}

// What the agents panel shows, copied from the live values once a second: the
// panel redraws on this alone, so the copy can wait while its theme picker is open.
export type PaneView = {
  flow: Flow | null
  agents: AgentRun[]
  now: number
  models?: ModelHints
  usage?: UsageReadings
}

declare module 'claude-code' {
  interface PluginState {
    'savvy-progress': {
      flow: Flow | null
      agents: AgentRun[]
      panel: Panel
      now: number
      models: ModelHints
      usage: UsageReadings
      /** The `theme` option's value as last picked: `auto` or a theme's name. */
      theme: string
      /** What the agents panel shows; null until the first copy. */
      shown: PaneView | null
      /** When the theme picker took the panel's focus, in ms; 0 while it has not. No drawing reads it. */
      picking: number
    }
  }
}
