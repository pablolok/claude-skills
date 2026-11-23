# Host tools

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

Some hosts add orchestration tools of their own: a task list shown to the user (`update_plan`), a summary box that
closes each turn (`wrap_up`), separate sessions (`start_session`, `hand_off_to_session`). They run alongside this
flow, never in place of it:

- **The host's task list holds the plan.** Its steps are the worker tasks, in plan order, each led by its tier
  (`Careful — migrate the parser`); a step is done when its task is accepted in review (section 5), not when the
  worker returns. If the host caps the list, group tasks by dependency stage. The progress bar stays current as well.
- **Workers are always Agent tool calls.** Never move a worker task to a separate session: invoking this skill is the
  user's explicit request for subagent delegation, and a host's preference for sessions over subagents does not
  override it. Work outside the task may still be proposed the host's way.
- **A turn summary closes a turn, not the flow.** While tasks are running or pending, its recap says which are
  accepted and which are still out, it asks nothing that is not the user's decision, and the flow resumes when the
  workers report. Section 6 runs once, after the last task is accepted.
- The workers' definitions deny the host's task-list and session tools (`disallowedTools`): a worker reports to you,
  never to the user's task list or to a session of its own.
