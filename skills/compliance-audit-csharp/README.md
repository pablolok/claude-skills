# Conductor Compliance Audit Skill (C#)

A specialized skill for **Claude Code** to enforce architectural rigor and engineering standards during the development of C#/.NET projects.

## Overview

This skill automates the "Sub-Agent Compliance Audit" step of the **Conductor** workflow. When invoked, it first applies quota-aware routing and explicit model-selection guardrails, then delegates only if that route is justified. If the user selected Opus or rejected Sonnet or Haiku models, the skill must preserve that choice or keep the audit local.

## Audit Criteria

The skill performs a holistic review based on 12 key principles:

1.  **C# Standards:** Enforces C# 12+ features and Microsoft's .NET naming conventions.
2.  **Cross-Platform:** Mandatory use of `System.IO.Path`.
3.  **Unit of Work & DbContext Factory:** Prevents captive dependencies in long-lived services.
4.  **Base Repository Pattern:** Enforces standard generic repository/entity structures.
5.  **Dependency Injection:** Strict constructor injection and prohibits manual instantiation.
6.  **TDD & Coverage:** Enforces 90% Line / 85% Branch coverage.
7.  **Static Logic Policy:** Prohibits business logic in static classes.
8.  **SOLID Principles:** Validates single responsibility and proper encapsulation.
9.  **Logging & Observability:** Mandatory `ILogger<T>` injection.
10. **Fail-Fast Configuration:** Early validation of configuration/options.
11. **Documentation:** Mandatory XML doc comments for all public members.
12. **Static Analysis:** Compliance with Roslyn analyzers and `.editorconfig`.
13. **Warning Suppression Policy:** Blocks use of `#pragma warning disable`, `NoWarn`, `[SuppressMessage]`, GlobalSuppressions, or analyzer severity downgrades as a way to avoid fixing required diagnostics unless a justified exception is documented. Generated Entity Framework migration files under `Migrations/` are explicitly allowed to keep localized suppressions when needed for compatibility with future model or property changes.
14. **Reusability Audit:** Flags duplicated implementation patterns that should be extracted into generic reusable abstractions instead of being re-authored in multiple classes.

## Reporting Format

Violations are reported using a strict, machine-readable format to facilitate quick remediation:

> * **[File Path:Line Number]**
>   * **Violation:** Description of the issue.
>   * **Suggested Fix:** How to fix it.

## Installation & Integration

### Recommended Strategy
The **[Compliance Audit Orchestrator](../compliance-audit-orchestrator/)** is the primary way to use this skill. It automatically detects C# changes and invokes this audit.

### Manual Usage
To trigger this specific audit manually:
> "Use the compliance-audit-csharp skill."
