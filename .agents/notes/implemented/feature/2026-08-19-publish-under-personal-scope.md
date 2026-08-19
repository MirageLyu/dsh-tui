# Agent Note: Publish the TUI under the maintainer's personal npm scope

Status: implemented

English | [中文](2026-08-19-publish-under-personal-scope.zh.md)

## Problem

The package name inherited from the monorepo, `@deepseek-ai/dsh-tui`, can only be published by someone with publish rights on the `@deepseek-ai` npm scope. The maintainer of this repository cannot join that organization, so the inherited name would block npm publication forever.

## Decision

**Rename the package to `@miragelyu/dsh-tui` and publish from this repository.** The npm scope mirrors the maintainer's npm account, which any account can publish under. The bundle mechanism is scope-agnostic: `dsh plugin --profile <name> add <package>` resolves and mounts by package name, whatever its scope, and every seam package the bundle peers on still resolves from the running dsh installation. The rename touches the manifest, the `cordis.patch.yml` row names (the Loader resolves `@miragelyu/dsh-tui/startup`, `/prompt`, and the main entry), the invariant registration, the `@module` JSDoc tags, and the install commands in the READMEs and docs.

## Alternatives considered

**Keep the `@deepseek-ai/dsh-tui` name and wait for org access.** Rejected: no path to that access exists, so the package would remain unpublished indefinitely.

**Publish unscoped (`dsh-tui`).** Rejected: unscoped names are first-come-first-served and squatting-prone; the account scope is guaranteed and keeps the family prefix readable.

**Publish through a different registry.** Rejected: `dsh plugin` forwards to pnpm against the configured registry, and npm remains the default; a private registry adds setup without removing the scope problem.

## Verification

The renamed package passes the full local suite (typecheck, build, 243 specs, 36 snapshots) and boots through a real `dsh plugin --profile tui add link:…` + `dsh --profile tui` smoke, proving the renamed `cordis.patch.yml` rows resolve through the Loader. CI runs the matrix on all three platforms. Publication itself uses the release workflow's `NPM_TOKEN` secret set to the maintainer's npm token.

## Consequences

The installable name is `@miragelyu/dsh-tui`; the deepseek-harness repository references that name in its launcher documentation. The historical reintroduction note keeps the monorepo-era name in its decision text, because it records the state of that repository at the time. If the package later moves into the `@deepseek-ai` scope, the rename reverses by the same mechanical steps.
