---
name: python-standards
description: The Python-specific layer on top of clean-code-standards. Use whenever writing, refactoring, or reviewing Python — scripts, packages, services, tests. Assumes the language-agnostic core and adds only the Python idioms — injection without import-time side effects, type hints with Protocol/Enum/dataclass, narrow exceptions, no mutable defaults, pathlib and explicit encodings, safe subprocess, logging, and the project's own runner, minimum version and checkers — never tools it does not use.
---

# Python Standards — Python layer

**The universal core lives in the `clean-code-standards` skill and applies in full to every Python task.** This skill
adds only what is Python-specific. When writing Python, apply both: the core sets the design discipline (single
responsibility, injected collaborators, no god objects — including the "many capability protocols on one class is
still a monolith" insight — Tell-Don't-Ask, no module-level business logic, strong typing over magic values, literal
centralization, reuse audit, fail-fast inputs, no warning suppression); the items below make it idiomatic Python.

**Use the project's own tools, never ones it does not use.** Every rule below that names a runner, a checker or a
syntax reads "where the project has it": check before reaching for it.

## Python conventions

1. **Injection without import-time side effects.** Collaborators come in through `__init__` or as function
   parameters. No client, connection or session instantiated at module level; no I/O, network call or meaningful env
   read when the module is imported — importing a module must not do its work. A script guards its entry point with
   `if __name__ == "__main__":` and `main()` returns an exit code (`sys.exit(main())`), so a test can call it.
2. **Module scope is constants and pure functions.** No mutable module globals used as state. No business logic in a
   class of `@staticmethod`s used as a namespace: a module of functions, or a class that is injected.
3. **The project's minimum Python version.** Check it (pyproject `requires-python`, the CI matrix, the interpreter it
   runs on) before reaching for newer syntax: `X | Y` unions need 3.10 at runtime unless the module has
   `from __future__ import annotations`, `match` needs 3.10, builtin generics (`list[int]`) 3.9. Follow the typing
   style the project already uses (`typing.Dict` or `dict`) rather than mixing both.
4. **Type hints on public functions and methods.** `typing.Protocol` (or an ABC) for an injected seam, so a fake
   satisfies it without inheriting. No `Any` to dodge the checker; `cast` only at a documented boundary, commented.
5. **Typed values, not codes or bags.** `Enum` (or `Literal`) for finite states instead of string or int codes. A
   record crossing a module boundary is a `dataclass` (`frozen=True` when it is a value) or a `NamedTuple`, not a bare
   dict or tuple whose keys and positions every caller must know.
6. **Parse at the boundary.** External data (JSON, env vars, CLI args, a config file) is parsed into typed values
   where it enters, and rejected there when invalid; deep code never digs through raw dicts. Config fails fast at
   startup, not on first use.
7. **Narrow exceptions.** Never a bare `except:` or `except Exception: pass`; catch the narrowest type that can occur.
   Re-raise with `raise NewError(...) from err` so the cause survives. A domain error is its own exception class. No
   exception for normal control flow when a return value can state the outcome.
8. **No mutable default arguments.** `def f(items=[])` shares one list across every call — a defect, not a style
   point. Default to `None` and build the value inside.
9. **Resources and paths.** `with` for files, locks, connections and temp dirs, so they close on every path.
   `pathlib.Path` for paths, never string-joined paths or a hardcoded separator. Open text files with an explicit
   `encoding="utf-8"` (the platform default differs on Windows), JSON included; pass `newline=""` to `csv` and where
   line endings must be preserved.
10. **Safe subprocess.** `subprocess.run([...], check=True)` with an argument list; never `shell=True` with
    interpolated input. Capture output with `capture_output=True, text=True, encoding="utf-8"`. Pass a `timeout`
    wherever the child can hang.
11. **Logging, not prints.** `logging.getLogger(__name__)` (or an injected logger) for tracking; `print` is only a
    CLI's actual output. Lazy `%`-style arguments in log calls (`log.info("read %s", path)`), not f-strings, so an
    unused message is never formatted.
12. **Console output encoding** (core rule 13). A script's prints stay ASCII or set the stream's encoding
    (`sys.stdout.reconfigure(encoding="utf-8")`): a legacy Windows code page rejects what it cannot encode.
13. **Time and randomness injected.** A clock callable and a `random.Random` instance come in as collaborators, so a
    test fixes them. Datetimes that are stored or compared are timezone-aware (`datetime.now(timezone.utc)`), never
    naive.
14. **Imports.** Absolute imports within the package; no wildcard imports; `__all__` where a module exports an API.
    No `sys.path` manipulation in production code (a test may do it where the project's convention does).
15. **Concurrency.** asyncio code never calls blocking I/O on the event loop (offload it, or use the async client).
    Threads never share mutable state without a lock.

## Quality gates (Python)

16. **Tests with the project's runner** (`unittest` or `pytest` — whichever it uses; do not switch or add one).
    Deterministic. Doubles for injected collaborators: `unittest.mock` with `autospec=True` / `spec=` so a renamed
    method breaks the test, or a hand-written fake that satisfies the protocol. Patch the name where it is **looked
    up**, not where it is defined (`mod.requests`, not `requests`). Temp dirs via `tempfile` (or pytest's
    `tmp_path`), env vars via `mock.patch.dict(os.environ, ...)`, every patch restored after the test.
17. **Coverage at the project's bar.** Where the project sets none, every new branch of new logic has a test — do not
    invent a percentage.
18. **Type checker and linter where the project defines one** (mypy, pyright, ruff, flake8, pylint): it passes clean,
    with no new warnings. Where none is defined, do not add one unasked.
19. **No suppression.** No `# type: ignore`, `# noqa` or `# pylint: disable` to dodge a diagnostic. The only
    exceptions: a commented, locally scoped one at a real external boundary, or one the project's own convention
    documents (for instance, the import line that follows a test file's `sys.path` setup).

## When reviewing / refactoring

Run the core review lens first (responsibilities confined to their module, no god objects / module-level business
logic / magic values / duplicated orchestration / hidden construction), then the Python specifics: hunt work done at
import time, module-level clients and mutable globals, `Any` and unexplained `cast`, dicts and tuples standing in for
records, string codes for states, broad or silent `except`, mutable defaults, unclosed resources, string paths and
missing encodings, `shell=True`, prints used as logging, naive datetimes, mocks without a spec or patched at the wrong
name, and suppressed diagnostics. Prefer the **smallest** behavior-preserving change that moves a responsibility to its
rightful module; verify with the project's runner and whichever checkers it defines.
