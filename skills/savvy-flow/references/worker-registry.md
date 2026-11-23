# One worker per topic

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

- **One worker per topic.** You stay the only conversation with the user and sort the work into topics. Each topic has
  one live worker: resume it (SendMessage) for the topic's next task at the same tier. A different tier needs a
  different worker (model and effort are fixed when an agent starts); a new topic gets a new worker. A worker left
  behind stays registered, so a return to its topic resumes it. Before starting a worker, look in the registry for
  one at the same tier whose topic overlaps the task (the same files or subsystem): resume that one instead.
- **Keep the registry on file**, so it survives a compaction of your own context: in the session scratchpad directory
  when there is one, otherwise in a file outside version control. One row per worker: topic, tier, agent id, context
  tokens at its last return, handoff file, time of last use. Agent ids hold only within the session; in a new session
  workers restart from their handoff files.
- **Resume or rotate between tasks, never during one.** A working worker finishes its task; it is never interrupted to
  hand off. The token count a worker reports on return is its context size now, not a running total: judge by it. A
  fresh worker already starts with a large fixed context (system prompt, project instructions, tool and skill
  listings), which is why a worker per task is expensive and the threshold is a share of the window. Before its next
  task:
  - below 70% of its model's context window → resume it;
  - at or above 70% → ask it for a handoff note and give the task to a fresh worker pointed at that note;
  - below 70%, but the next task is long enough to push it toward the limit, or needs little of what it has read →
    rotate now.

  Resuming within the prompt-cache lifetime is cheap; after a long pause every step re-reads the whole context at full
  price, so a large worker whose next task needs little of it is rotated too. The handoff note is short — state,
  decisions, how to rebuild, traps, open issues; facts, no history — and goes to the handoff file of its registry row.
