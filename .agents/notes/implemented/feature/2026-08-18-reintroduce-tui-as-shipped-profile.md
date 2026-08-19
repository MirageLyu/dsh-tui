# Agent Note: Reintroduce the terminal UI as the shipped `tui` profile

Status: implemented

English | [中文](2026-08-18-reintroduce-tui-as-shipped-profile.zh.md)

## Problem

The [TUI removal](https://github.com/deepseek-ai/deepseek-harness/blob/main/.agents/notes/implemented/simplification/2026-08-04-remove-tui-package.md) deleted `@deepseek-ai/dsh-tui` because no shipped composition consumed it after the implicit `dsh` entrypoint retired. Web remained the only interactive surface. A terminal-first interactive surface is now a product requirement: `dsh --profile tui` must open a full-screen Claude Code-style agent — streamed transcript, tool cards, inline approval and question dialogs, slash commands, resume — over the current profile/bundle architecture, without restoring the removed implicit `dsh` launcher, the deleted SDK toolchain option, or a second product-shaped frontend rebuilt from scratch.

## Decision

**Restore the removed implementation and adapt it to the profile host.** The deleted TUI package is reintroduced as the `packages/bundle/tui` bundle package (`@deepseek-ai/dsh-tui`): the `tui` profile (`dsh --profile tui`, auto-initialized like `web`/`headless` via `PROFILE_TEMPLATES`) stacks `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-tui`. The pi-tui patch (`patches/@earendil-works__pi-tui@0.80.7.patch`) is restored alongside. Reusing the mature renderer, dialogs, resume selector, file autocomplete, and model selector deletes weeks of re-derived terminal engineering, and the archived implementation notes remain available as design history. The one deliberate rework is the front door: the removed `apps/cli/src/tui.ts` launcher (config-created `main` agent, launcher-owned identity keys) is replaced by a runner inside the bundle that creates or resumes the agent through `ctx.agents` itself, driven by the TUI's own flag family parsed by the new `./startup` provider (`--resume`, `--continue`, `--workspace`, `--model`).

**The same seams the web host uses, answered in-process.** The keyboard question dialog registers as the `ctx.userQuestions` provider (plan reviews arrive through its `plan-review` intent), and a new approval queue registers a scoped `approval/request` waterfall answerer rendering an inline dialog (Enter/`y` allows once, Escape/`n` rejects, Ctrl+C withdraws). Model selection rides `installModelSelection`; session admission rides the current `agent/pre-step` waterfall instead of the removed `agent/prompt-submit`. The resume handoff re-execs the process with `--resume <id>` in the selected session's workspace, because process cwd is what filesystem and shell tools resolve against.

## Alternatives considered

**Rebuild a new terminal frontend (ink, hand-rolled ANSI, or another framework).** Rejected because the removed implementation already covers streaming, reasoning, tool-card render intents, questions, resume, autocomplete, timing, tokens, and Windows input, with an extensive behavioral test suite; a fresh frontend would re-derive those decisions from archived notes at higher risk and cost. The pre-release stance prefers restoring the proven foundation and adapting it to the current host.

**Keep the removed launcher contract (config-created agent, launcher-owned identity keys).** Rejected because the profile host already provides `cmdlineArgs` and the registry-based create/resume path (the headless runner's pattern); a second identity channel would duplicate how the current architecture hands invocation facts to apps.

**Ship the TUI unshipped again.** Rejected for the same maintenance-cost reasons the removal note recorded — a terminal frontend without a composed lifecycle acceptance presents an unsupported surface.

## Verification

The `tui` profile boot is exercised end to end under a sized PTY (help, banner, status line, command execution, clean terminal restore), and the restored behavioral suites replay real session logs through the assembled composition with a headless terminal and compare frames. `dsh --profile tui --help`, `--dump-config`, the restored package tests, and the host-aggregate typecheck gate the surface.

## Consequences

`dsh --profile tui` is a shipped interactive surface: a single-session, process-wide agent with streamed transcript, tool cards, inline approval and question dialogs, `/resume`/`/model`/`/status`/`/details` commands, permission presets, and durable session persistence. The base bundle's agent-plane rows (kept "for the TUI" since the preset split) now have their named consumer again. The [removal note](https://github.com/deepseek-ai/deepseek-harness/blob/main/.agents/notes/implemented/simplification/2026-08-04-remove-tui-package.md) stays active: its reintroduction conditions are this note's checklist, and only its "no terminal UI package" consequence is superseded.
