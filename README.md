# @miragelyu/dsh-tui

[![CI](https://github.com/MirageLyu/dsh-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/MirageLyu/dsh-tui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

English | [中文](README.zh.md)

The full-screen interactive terminal front door for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) agents — a Claude Code-style TUI that streams the agent transcript, tool cards, approvals, and questions into one keyboard-driven screen. It is an out-of-tree plugin bundle: install it into any `dsh` installation with one command, and unplug it the same way.

A sample session:

```text
 DEEPSEEK HARNESS
 session-3bbd889b-2576-40ab-81bf-1100072df188

 ▸ you  Add a --dry-run flag to scripts/build-dsh-cli.ts and document it

 assistant  thinking…
 ✦ Thinking · 42 words

 I'll add the flag, plumb it through the pipeline, and update the usage text.

 ⚙ bash  Running…
 $ sed -n '120,180p' scripts/build-dsh-cli.ts
 (tool output renders here, long bodies fold into a preview)

 ▸ you  Looks good. Which call sites change?

 assistant  ✓ done — 3 call sites updated, usage text amended.

 /Volumes/T7/dsh-tui (main)  workspace-write  deepseek-v4-flash  ↑1.2k ↓480  cache 67%
 dsh > ▍
```

## Features

- **Streamed transcript** — assistant replies, reasoning blocks, and every tool call render live as the agent works; tool cards follow each tool's render intent (`terminal`, `diff`, search/read/web cards)
- **Thinking collapse** — each reasoning block folds into a `✦ Thinking · N words` line; Ctrl+T expands it inline, Ctrl+R hides reasoning wholesale
- **Tool-card folding** — Ctrl+O cycles preview → full output → hidden; Ctrl+F opens the latest tool body in a full-screen pager
- **Inline approvals and questions** — tool approvals, `ask_user_question` dialogs, and plan-mode reviews answer in place (Enter/`y` allow, Esc/`n` reject, Ctrl+C withdraw) instead of falling back to plain prompts
- **Slash commands** — `/help`, `/model`, `/clear`, `/details`, `/theme`, `/palette`, `/reload`, `/resume`, `/status`, `/exit`, plus every command contributed by other plugins
- **Session resume** — `/resume` opens a full-screen picker over persisted sessions, with workspace scopes and zero-I/O cached titles; `--resume <id>` / `--continue` resume from the command line
- **Model selection** — `/model` filters the provider/model catalog in a keyboard selector with reasoning-effort cycling
- **`@` autocomplete** — fuzzy file/directory completion plus metadata-only session references
- **Theme and color** — light/dark/auto schemes (`/theme`), a 16-color ANSI palette that respects the terminal scheme (`/palette`), and permission/plan-mode badges in the status line
- **Composable** — plugin overlays via `ctx.tui.openOverlay()`, prompt-template values via `ctx.tuiPrompt`, and an embedder-owned resume handoff via `ctx.tuiResumeHost`

## Requirements

- A `dsh` installation (see [Version compatibility](#version-compatibility))
- Node in the `dsh` engines range (`^22.19.0 || >=24.0.0`)
- stdin and stdout on a TTY — scripts and pipes should use `dsh --profile headless "task"` instead

## Installation

```sh
dsh plugin --profile tui add @miragelyu/dsh-tui
```

This initializes a `tui` profile over `@deepseek-ai/dsh-base`, installs the bundle from the registry, and adds it to the profile's bundle stack. From a local checkout:

```sh
dsh plugin --profile tui add link:/path/to/dsh-tui
```

Unplugging removes the bundle and the profile falls back to `dsh-base`:

```sh
dsh plugin --profile tui remove @miragelyu/dsh-tui
```

## Quick start

```sh
dsh --profile tui                        # fresh session in this directory
dsh --profile tui --continue             # resume the most recent session
dsh --profile tui --resume <id>          # resume a specific session
dsh --profile tui --workspace ~/project  # fresh session in another workspace
dsh --profile tui --model deepseek-official/deepseek-v4-flash
```

## Usage

### Keybindings

| Keys | Action |
|---|---|
| Enter | send |
| Ctrl+O | cycle tool cards: preview → full → hidden |
| Ctrl+F | full-screen pager for the latest tool body |
| Ctrl+T | expand/collapse the latest reasoning block inline |
| Ctrl+R | toggle reasoning visibility |
| Ctrl+L | redraw the screen |
| Ctrl+C / Esc | cancel the running turn |
| Ctrl+D | quit while idle |
| `@` | file and session-reference autocomplete |

### Slash commands

| Command | Action |
|---|---|
| `/help` | list every command |
| `/model [provider/model]` | open the model selector or select directly |
| `/theme dark\|light\|auto` | switch the color scheme |
| `/palette` | print every color role and its SGR pair |
| `/details` | toggle tool-card and reasoning display |
| `/resume` | open the session-resume picker |
| `/status` | append a session diagnostics card |
| `/clear` | clear the transcript view |
| `/reload` | apply file-backed config changes (dev) |
| `/exit` | quit |

### Startup flags

| Flag | Meaning |
|---|---|
| `--resume <id>` | resume a persisted session by id |
| `--continue` | resume the most recently persisted session |
| `--workspace <dir>` | workspace for a fresh session; defaults to the invoking directory |
| `--model <provider/model>` | provider/model route for this session |

## Configuration

The bundle reads its configuration from the profile's patch layer (see [the contract](docs/contract.md) for the complete table):

| Key | Default | Meaning |
|---|---|---|
| `welcome` | — | banner subtitle until the session has a title |
| `sessionId` | `main` | session identity the terminal drives |
| `showReasoning` | `true` | render reasoning blocks |
| `collapseThinking` | `true` | fold reasoning into one summary line |
| `maxToolOutputLines` | `6` | lines retained in a collapsed tool-card preview |
| `color` | `true` | apply the built-in ANSI palette |
| `scheme` | — | pin light/dark; absent, the terminal scheme wins |
| `title` | `DeepSeek Harness` | terminal window title suffix |

## Version compatibility

This repository pins the published `@deepseek-ai/dsh-*` `0.1.0-rc.7` family (plus `@deepseek-ai/cordis` 4.x and `@deepseek-ai/cordis-plugin-loader` 1.x) as its tested seam contract. The bundle resolves its peers from the running `dsh` installation, so it works with installations whose published seam versions match that family; check with `dsh --version`. Bump the family together, never one package at a time, and re-run the suites before releasing.

## Documentation

- [Behavioral contract](docs/contract.md) ([中文](docs/contract.zh.md)) — the full interaction surface, config, color, and model experience
- [Terminal UI services](docs/terminal-ui.md) — `ctx.tui` / `ctx.tuiPrompt` / `ctx.tuiResumeHost` contracts

## Development

```sh
pnpm install        # install the pinned seam family
pnpm typecheck      # tsc over src and tests
pnpm build          # lib/ bundles
pnpm test           # 243 behavioral specs
pnpm test:snapshot  # 36 assembled recorded-session snapshots (keyless replay)
```

## License

[MIT](LICENSE)
