// The fit gate's rule: does a brief read as a ready procedure run through a connected tool (work for savvy-tools)?
// Pure and product-neutral. Three signals must agree, because each alone fires on briefs that build something: the
// title names the run and no making or diagnosing beside it, the prompt reaches a connected tool, and it points at a
// procedure that exists.

// The title names the run: shoot, capture, export, screenshot.
const RUNS = /\b(?:re-?)?(?:shoot|shot|captur|export|screenshot|photograph|film|record)(?:s|e|es|ing|ed)?\b/i

// The title also names work that is not a run: making, changing, diagnosing, reviewing.
const MAKES = new RegExp(
  '\\b(?:' +
    'fix(?:es|ed|ing)?|repair\\w*|debug\\w*|diagnos\\w*|investigat\\w*|find|probe\\w*|research\\w*|design\\w*|plan|' +
    'implement\\w*|refactor\\w*|rewrit\\w*|rewir\\w*|wir(?:e|ing)|reroute\\w*|compos(?:e|es|ing)|assembl\\w*|clean-?\\s?up|' +
    'review\\w*|docs?|author\\w*|add(?:s|ing)?|creat(?:e|es|ing)|writ(?:e|es|ing)|chang(?:e|es|ing)|updat(?:e|es|ing)|' +
    'migrat\\w*|remov(?:e|es|ing)|renam(?:e|es|ing)|convert\\w*|support\\w*|build(?:s|ing)?\\s+(?:and|\\+|then)' +
  ')\\b|^\\s*build\\b',
  'i',
)

// The prompt reaches a connected tool: an MCP server, or an app by its kind. The progress tool is in every brief and
// counts for none.
const PROGRESS_TOOL = /mcp__savvy-progress\w*/gi
const CONNECTED = /mcp|\b(?:connected tool|browser|simulator|emulator|editor|play mode|dev ?tools|devices?)\b/i

// The prompt points at a procedure that exists: a recipe, something prepared, an earlier run to repeat.
const READY = new RegExp(
  '\\b(?:recipe|procedure|runbook|playbook|template|prepared|(?:already|is|are|run (?:a|the)) ready|' +
    'ready (?:recipe|procedure|capture|script|export|run)|already (?:written|open|done|there|in place|exists?|imported)|' +
    'same (?:way|method|scripts?|steps|pipeline|tools?|job)|' +
    '(?:copy|copies|follow|reuse|model|repeat)\\b[^.\\n]{0,40}\\b(?:method|scripts?|steps|path|capture|shoot|session|take))\\b',
  'i',
)

// The way through: a line of its own with a reason in words (the message's own `<reason>` is none).
const REASON = /^[ \t>*`-]*why-not-tools:[ \t]*["'“]?[\p{L}\p{N}]/imu

export const readsAsRecipe = (title: string, prompt: string): boolean =>
  RUNS.test(title) && !MAKES.test(title) && CONNECTED.test(prompt.replace(PROGRESS_TOOL, '')) && READY.test(prompt)

export const saysWhyNotTools = (prompt: string): boolean => REASON.test(prompt)
