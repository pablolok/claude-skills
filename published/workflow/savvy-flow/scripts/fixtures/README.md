# Event fixtures

`codex-exec-recorded.jsonl` is stdout from a real Codex CLI 0.167.1 probe on 2026-11-12:

```text
codex exec --json --ephemeral --ignore-user-config -s read-only --skip-git-repo-check -C <repo> -m gpt-6-luna
```

Prompt: `Reply exactly OK. Do not use tools or modify files.` Initialization required temporary Codex state in
the workspace. The network could not discover workspace routing, so this records `thread.started`, `turn.started`,
`error`, `item.completed` (an error item), and `turn.failed`. It does not verify successful model/tool events or
rate-limit fields. No credentials or stderr are included.

`codex-exec-success.jsonl` is the five-line sample from
[OpenAI's non-interactive mode documentation](https://learn.chatgpt.com/docs/non-interactive-mode), read on
2026-11-12, rather than a successful local probe. Action variants and optional `rate_limits` are synthetic test
inputs, labelled in their tests. The actual probe and the documented sample have no `rate_limits`; the writer and
panel leave plan usage absent unless supplied by the stream or matching rollout tail. A missing reasoning count remains `null`.

`codex-rollout-tail.jsonl` is a synthetic, sanitized tail using the `turn_context.payload.model` and
`event_msg` / `token_count.payload.rate_limits` layout previously checked in a real rollout. It includes two
readings plus a partial first and last line. Tests append it after a sparse 17 MiB prefix and assert that the reader
requests exactly the final 512 KiB by file position. It is not a successful live probe.

`gemini-stream-*.jsonl` and `gemini-usage.json` are stdout from real Antigravity CLI (`agy` 1.5.15) probes on
2026-11-23, with `gemini-3.8-flash` at effort low in a scratch git repository. Every path is replaced by
`/work/repo` (or `/work/skills` for a file outside it), every conversation id by a fixed fake id, and the answer's `text_delta` chunks are re-split from the
anonymised answer; the event shapes, counts and usage numbers are unchanged. No stderr or credentials are included.

- `gemini-stream-success.jsonl`: `agy -p … --sandbox --output-format stream-json`, a task that writes one file
  (`init`, `step_update`, `result` with `status: "SUCCESS"`).
- `gemini-stream-denied.jsonl`: the read-only settings (`write_file(*)` and `command(*)` denied, no `agentMode`);
  a `SKILL.md` outside the working directory is read, then an edit, a new file and a command each fail as a step in
  `ERROR` with a `TOOL_ERROR`, and the run still ends with `SUCCESS`, a full answer and exit 0.
- `gemini-stream-soft-denied.jsonl`: `agentMode: ""` with no command rule; the command is soft-denied, the turn
  ends with an empty response and `result.denied_actions`, exit 0 (stderr carried the notice).
- `gemini-stream-follow-up.jsonl`: the third turn of one conversation (`--conversation <id>`); its one step reports
  that turn's usage, while `result.usage` holds the whole conversation's (input 17464 + 2392 + 18759 = 38615,
  output 3 + 3 + 3 = 9).
- `gemini-stream-timeout.jsonl`: `--print-timeout 1s`; exit 3, `result.status: "ERROR"` with `error` and
  `finished_reason: "print_timeout"` (stderr carried an `AGY_ERROR:` line).
- `gemini-usage.json`: `agy -p /usage --output-format json`, no model call and no tokens; `command.data.groups`.
