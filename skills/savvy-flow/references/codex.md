# The Codex tier

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

### The Codex tier

Code and context go to a second vendor, OpenAI, under the user's own Codex sign-in. Use it for a second opinion, for a
self-contained task the user wants done on OpenAI models, or to move work off the Claude limits when the user asks.
Long repetitive execution (many rounds toward known targets) gains the most from that move: make it when the user has
asked for it or set it as their default, never on your own.
- **Pick the intensity like a Claude tier**, the cheapest that gets it right: Luna for mechanical work, Terra for
  standard work, Sol for delicate or unfamiliar work and for second opinions, Astra for plans only, each launch on the user's yes. The
  relay picks the newest model of its family from Codex's own model list and sets the effort; a brief names a model
  or an effort only when the user asked for one.
- A Codex task is marked as such in the plan you present before it is delegated, with its intensity.
- The relay (`savvy-codex-<intensity>`) runs `codex exec` and returns what Codex did, checked:
  - a second opinion runs read-only (`-s read-only`, or `codex exec review` on the diff);
  - an implementation runs in a tree no other worker is writing (alone, or in its own worktree), with Codex told not to commit (its sandbox cannot write `.git`): it leaves the message, the relay commits after its checks;
  - a follow-up on the same topic resumes the Codex session (`codex exec resume <session id>`) instead of starting cold: keep its session id in the registry row.
- **Codex does not load Claude Code's skills or `CLAUDE.md`.** It reads `AGENTS.md` and the skills in the project's
  `.agents/skills` (and its own user folder) by itself; a skill from `.claude/skills`, a user folder or a plugin
  reaches it only when the brief names its `SKILL.md` by absolute path ("Before starting, read and follow …"), and so
  does a `CLAUDE.md` the task depends on. Named that way, Codex follows it; left out, it is silently ignored.
- Its report ends with the Codex plan usage when the logs show it (the 5-hour and weekly windows). Pass it on in your close report.
- Its work gets the same adversarial review as any other tier.
- **Codex has its own connected tools.** It reaches an MCP server only when the Codex CLI's own configuration
  declares it (`codex mcp list` shows it enabled), whatever the Claude session has. Check before routing a
  connected-tool task to a relay; a server Codex lacks is added there on the user's yes, never by a worker.
