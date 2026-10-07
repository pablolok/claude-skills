---
name: csharp-oop-standards
description: Pablo's C#-specific layer on top of clean-code-standards. Use whenever writing, refactoring, or reviewing C# for this user. Assumes the language-agnostic core (SRP, injected collaborators, Tell-Don't-Ask, no god objects, no static business logic, strong typing, literal centralization, reuse audit, fail-fast, no warning suppression) and adds only the C#/.NET idioms, tooling, and coverage bar. The persistence stack (repository/UnitOfWork/EF) is project-specific and opt-in, NOT a universal rule.
---

# C# / OOP Standards (Pablo) — C# layer

**The universal core lives in the `clean-code-standards` skill and applies
in full to every C# task.** This skill adds only what is C#/.NET-specific. When writing C#, apply
both: the core sets the design discipline (single responsibility, injected collaborators, no god
objects — including the "many capability interfaces on one class is still a monolith" insight —
Tell-Don't-Ask, no static business logic, strong typing over magic values, literal centralization,
reuse audit, fail-fast inputs, no warning suppression); the items below make it idiomatic C#.

## C#-specific conventions

1. **Constructor DI, concretely.** Runtime collaborators come through the constructor. No hidden
   `new Service()` in production code; container-registered dependencies resolved via the ctor.
2. **Static logic policy.** Business rules/orchestration must NOT live in static classes. In C#,
   statics are strictly for constants and extension methods.
3. **Modern C# features** where they read cleanly and **the project's compiler has them**: primary constructors,
   collection expressions (`[]`), file-scoped namespaces, pattern matching, target-typed `new`, records. An engine
   or framework may pin an older language version (one at C# 9 refused a `record struct`): check the version the
   project builds with before reaching for newer syntax.
4. **Cross-platform paths.** Always `System.IO.Path` (`Path.Combine`, `Path.GetTempPath`). Never a
   hardcoded `\` or `/`.
5. **Logging & observability.** Inject `ILogger<T>` for business-logic tracking. No raw
   `Console.WriteLine` / `Debug.WriteLine` for that purpose. (A dedicated log / UI-event *sink*
   abstraction is fine — it's still its own responsibility.)
6. **Fail-fast configuration.** Validate `IOptions<T>` / config values at the start of the service or
   at startup, not lazily deep in a call path. Null-check injected collaborators in the ctor. Check each argument on
   its own, the exception naming that argument and its value (`nameof(x), x, "why"`) — one combined check naming the
   first argument blames the wrong one.
   An object driven on a schedule from the moment it exists (a tick, a poll, a timer callback) is valid before its
   first setup call: until it has its input it does nothing — it never assumes the setup came first (one computed
   a direction from two default zero points and logged a warning every frame).
7. **XML documentation** (`///`) on public members.
8. **Domain modeling in C#.** Prefer enums / strongly-typed named abstractions over raw numeric or
   string codes for finite states, categories, statuses, modes, results.

## Quality gates (C#)

9. **TDD & coverage.** Deterministic automated tests (typically MSTest/xUnit/NUnit) for new logic.
   Baseline **90% line / 85% branch**. Test doubles for injected collaborators; assert behavior.
10. **Static analysis clean.** Passes Roslyn analyzers / `.editorconfig` / `dotnet format` with no
    warnings.
11. **No warning suppression.** No `#pragma warning disable`, `NoWarn`, `[SuppressMessage]`,
    GlobalSuppressions, or severity downgrades to dodge a required diagnostic — unless the repo
    documents a justified exception. (Generated EF migration files under `Migrations/` are the one
    allowed local exception, to accommodate model evolution.)

## Project-specific (opt-in — NOT a universal rule)

The persistence conventions below were created for one specific project (an EF-backed app). Apply
them **only when the project already uses EF / that architecture** — do not impose them on a project
that has no EF (e.g. a plugin with no DbContext). When they don't apply, the transactional DB seam
still follows the core rules: a dedicated gateway class owns connection/transaction, callers own
their SQL.

- **UnitOfWork & DbContextFactory.** Don't inject `UnitOfWork`/`DbContext` as scoped deps into
  long-lived/singleton services. Use `IUnitOfWorkFactory` / `IDbContextFactory` to create
  short-lived instances on demand.
- **Base repository pattern.** Entities implement `IEntity<TId>`; repositories inherit
  `IRepository<TEntity, TId>` with EF impl `EfRepository<TEntity, TId>`.

## When reviewing / refactoring

Run the core review lens first (responsibilities confined to their module, no god objects/static
business logic/magic values/duplication/hidden `new`), then the C# specifics above. Prefer the
smallest behavior-preserving change that moves a responsibility to its rightful module.
