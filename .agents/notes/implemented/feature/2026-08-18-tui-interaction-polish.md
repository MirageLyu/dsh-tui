# Agent Note: TUI Claude Code-parity interaction polish

Status: implemented

English | [中文](2026-08-18-tui-interaction-polish.zh.md)

## Problem

The restored terminal UI rendered every interaction surface at fixed detail: reasoning blocks streamed inline or vanished wholesale, tool-card output could only fold through the global Ctrl+O visibility cycle, the light/dark scheme followed only the terminal's startup report, and the status chrome carried no permission or plan-mode facts. The product asked for Claude Code-grade reading ergonomics — folded thinking, discoverable tool-output folding with a full-screen detail view, switchable color scheme, and standing permission/plan badges.

## Decision

**Folded thinking with one summary line.** `collapseThinking` (default `true`) renders each reasoning block as a dim `✦ Thinking · N words` line above the response; Ctrl+T expands or refolds the most recent assistant step inline, while Ctrl+R keeps the existing wholesale hide. The fold is presentation-only: reasoning blocks reach the model identically either way, and the session log is unchanged.

**Full-screen detail pager.** Ctrl+F opens the most recent tool call's complete body (`ToolCardComponent.detailLines`, the expanded rendering independent of transcript visibility) in a whole-viewport overlay pager with ↑/↓, PgUp/PgDn, Home/End, and Esc/q close. Collapsed cards keep their `… +N lines` hint, which now names the pager route.

**Switchable scheme.** `theme.scheme` pins `dark`/`light` at composition; the live `/theme dark|light|auto` command switches the palette in place (`auto` follows the terminal's reported scheme, dark when unreported), and the status prompt reflects the current scheme.

**Standing permission and plan badges.** The prompt context line gains `${permission}` (the session's permission preset, hidden for the derived `custom` state) and `${plan}` (`⧉ plan` while plan mode is active, folded last-wins from `plan/mode` events); `/status` reports both rows. The permission read is an optional `ctx.get('permissionPresets')` — embedders without the service keep the badge empty.

## Alternatives considered

**Focusable per-card expansion (Tab navigation).** Rejected: pi-tui's focus model serves one component; a transcript-wide focus ring would re-own navigation the global visibility cycle already covers, and the pager answers the actual reading need.

**Persist the scheme in settings.** Rejected as premature: no other session presentation choice persists today; the composition config plus the live command cover both authored and ad-hoc needs.

**A dedicated reasoning panel.** Rejected: inline expansion over the transcript keeps reading position, matching Claude Code's behavior more closely than a side panel.

## Verification

`packages/bundle/tui/tests/tui.spec.ts` covers the collapse default and Ctrl+T fold/unfold, inline rendering when disabled, `/theme` switching and reporting, and the pager's open/close cycle; the full package suite (243 tests) and the keyless snapshot suites stay green. The single-file `dsh-cli` executable rebuild re-runs the assembled headless boot and the interactive TUI smoke.

## Consequences

The TUI reads at Claude Code parity: folded thinking with an inline expand, discoverable tool-output folding with a full-screen detail view, a live light/dark switch, and standing permission/plan chrome. The two new configuration keys are deployment choices (`collapseThinking`, `theme.scheme`), and the three new interactions (Ctrl+T, Ctrl+F, `/theme`) join the `/help` surface.
