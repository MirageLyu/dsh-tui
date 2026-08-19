# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Prereleases use the `0.x.y-rc.n` scheme inherited from the harness release line.

## [Unreleased]

- GitHub Actions CI matrix: Ubuntu, macOS, and Windows.
- Issue/PR templates, contributing and security policies, changelog.

## [0.1.0-rc.5] - 2026-08-19

The first release from this repository: the full-screen terminal UI extracted from the `deepseek-ai/deepseek-harness` monorepo as the standalone out-of-tree plugin `@miragelyu/dsh-tui`.

### Added

- Full-screen interactive terminal front door over the `@deepseek-ai/dsh-base` + `@miragelyu/dsh-tui` bundle stack, installed with `dsh plugin --profile tui add @miragelyu/dsh-tui`.
- Streamed agent transcript with per-tool render intents (terminal, diff, and generic cards).
- Thinking collapse (`✦ Thinking · N words`), tool-card preview/full/hidden folding, and a full-screen tool-body pager.
- Inline approval dialogs and `ask_user_question` answering through the shared seams; plan-mode reviews render in the same overlay queue.
- Slash commands: `/help`, `/model`, `/clear`, `/details`, `/theme`, `/palette`, `/reload`, `/resume`, `/status`, `/exit`, plus dynamic commands from other plugins.
- `/resume` full-screen picker with workspace scopes and a durable projection-cache ladder; `--resume` / `--continue` / `--workspace` / `--model` startup flags.
- `@` file and session-reference autocomplete; fuzzy bounded workspace search.
- 16-color ANSI theme with light/dark/auto schemes, permission and plan-mode status badges.
- Plugin overlay service (`ctx.tui`), prompt-template registry (`ctx.tuiPrompt`), and embedder resume handoff (`ctx.tuiResumeHost`).

### Changed

- Pins the published `@deepseek-ai/dsh-*` `0.1.0-rc.7` seam family; peers resolve from the running dsh installation.
