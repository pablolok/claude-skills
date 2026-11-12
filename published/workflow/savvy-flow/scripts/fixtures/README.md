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
