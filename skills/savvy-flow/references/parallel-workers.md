# Parallel and isolated workers

Part of the savvy-flow skill: "section N" and section "Name" below name the sections of its `SKILL.md`.

- **A piece that reuses another piece's scripts works on copies.** The brief tells the worker to copy them into its
  own work folder, repoint every output there, and make its runner refuse to run when a module loads from outside
  that folder: a script run from where it lives writes to its own output paths, over the other piece's results.
- Parallel workers share one machine: anything that measures time (benchmarks, timing probes) runs alone, and each
  worker runs only the tests of what it touched — the full suite runs once, by the orchestrator, before merging.
  Parallel full runs turn correct timing-sensitive tests into timeouts. That run also builds: if a live preview or
  device test is serving the working tree's build output, run it in a copy of the final tree (a spare worktree with
  the same diff, compared line by line) so the build does not swap the files under the test.
- A resource with one instance — a visible browser, a device simulator, the dev server's port — has one user at a
  time: two testing workers in parallel each open their own and multiply them on the user's screen. Run them in
  sequence, or start the one instance yourself and tell every brief to attach to it and never open another.
- Workers in one working tree still share its index: a worker's `git mv` stages its files. When you commit one
  task while another runs, stage by path and read `git diff --cached --stat` before committing; unstage what is
  not this task's. Chain the add to the commit with `&&`: one path that no longer exists (the old side of a move)
  makes the whole add stage nothing, and a commit run after it anyway goes out with only what was staged before.
- A worker isolated in its own worktree may start from the repository's default branch, not from the branch you work
  on: the brief names the base commit and makes resetting to it the worker's first step; on return, check the base
  before taking the diff. The brief also asks it for plain shell commands — explicit paths, no command substitution,
  no runtime variables, one git command at a time: the isolation guard refuses any command it cannot prove stays
  inside the worktree, and each refusal costs the worker a round. Isolated worktrees may be created inside the
  repository's own folder: before the first one, make sure that folder is git-ignored, or a broad `git add` in the
  main tree stages the worker's checkout as an embedded repository.
