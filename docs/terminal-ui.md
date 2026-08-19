# Terminal UI

English | [中文](terminal-ui.zh.md)

The full-screen interactive terminal surface installs as an out-of-tree plugin bundle over [dsh-base](https://www.npmjs.com/package/@deepseek-ai/dsh-base): `dsh plugin --profile tui add @deepseek-ai/dsh-tui` then `dsh --profile tui` renders the single-session agent transcript on pi-tui, answers user questions and approvals through the shared [user-questions](https://www.npmjs.com/package/@deepseek-ai/dsh-user-questions) / [user-approval](https://www.npmjs.com/package/@deepseek-ai/dsh-user-approval) seams, and owns the session's agent lifecycle. The [package README](../README.md) owns keys, dialogs, configuration, and the model-experience contract; the [reintroduction note](../.agents/notes/implemented/feature/2026-08-18-reintroduce-tui-as-shipped-profile.md) owns the reintroduction decision.

Source: [`src/index.ts`](../src/index.ts)

## Composition

The bundle patch mounts the runner (`tui-runner`), its flag provider (`tui-startup`, parsing `--resume` / `--continue` / `--workspace` / `--model` through [dsh-cmdline](https://www.npmjs.com/package/@deepseek-ai/dsh-cmdline)), the prompt-registry row (`tui-prompt`), the storage and projection-cache ladder behind `/resume`, the session-reference resolver, the tmux context, and the ask-user tool. Everything else the surface consumes — agent registry, tools, commands, goals, plan mode, permission presets, sandbox, persistence — is a base-layer row. The runner creates or resumes the session's agent through `ctx.agents` itself and mounts the channel; a `/resume` handoff re-execs the process with `--resume <id>` in the selected session's workspace because process cwd is what filesystem and shell tools resolve against.

## Services

- `ctx.tui` (`TuiExtensionService`, provided while a channel is mounted) hosts plugin overlays: `openOverlay(request)` queues a component factory with layout constraints onto the shared FIFO modal queue. Overlay state is live-only — never logged or replayed.
- `ctx.tuiPrompt` (`TuiPromptService`, the `tui-prompt` row) registers named prompt-template values (`register(name, value?)` → `TuiPromptValueHandle`, `subscribe` → `TuiPromptUnsubscribe`, `get(name)`); templates such as `${model}` or `${cwd}` resolve through it.
- `ctx.tuiResumeHost` (`TuiResumeHost`, optional, embedder-provided) replaces the running app with the resumed session: `handoff(sessionId, cwd)` succeeds by replacing the process and never returns.

The runner reads three optional boot-context values an embedding launcher may provide — `tuiGoodbyeMessage` (one line printed after the terminal is released on exit), plus `mainSessionId` / `tuiInitialSkill` for embedders that bind a configured session identity or seed a first skill turn directly.

## Approval and questions

The channel registers one scoped `approval/request` waterfall answerer and one `ctx.userQuestions` provider. An ask renders as an inline dialog — Enter/`y` grants the single action, Escape/`n` rejects, Ctrl+C withdraws — while a plan review (`intent: { kind: 'plan-review' }`) renders the plan detail above the Approve / Keep planning decision. Requests for other agents fall through to the next answerer; teardown settles every pending ask as `cancelled`.

## Verification

The behavioral suites replay recorded session logs through the assembled composition on a headless terminal and diff frames; the real entry (`dsh --profile tui`) is exercised under a sized PTY for help, banner, command execution, and terminal restore.

## Cordis API

### `ctx.tui` — `TuiExtensionService` (abstract seam)

Optional terminal-local interaction service provided by one mounted TUI.

The concrete provider retains pi-tui, focus, and terminal lifecycle state. Plugins receive only effect-owned overlay sessions.

```ts cordis-catalog
/**
 * Queue an interactive overlay owned by the calling plugin fiber.
 *
 * The TUI displays one overlay at a time in FIFO order. Disposing the caller
 * removes a queued overlay or closes an active one before plugin teardown
 * settles. This live presentation is neither logged nor replayed.
 *
 * @param request - component factory, layout constraints, and cancellation.
 * @returns the effect-owned overlay session.
 * @throws when the TUI has begun shutting down.
 */
abstract openOverlay(request: TuiOverlayRequest): TuiOverlaySession
```

Source: [`src/index.ts:260`](../src/index.ts)

### `ctx.tuiPrompt` — `TuiPromptService`

Context-global mutable values interpolated by TUI theme prompt templates. A registration, mutation, or disposal schedules one coalesced notification to the renderer subscribed with TuiPromptService.subscribe, so a value that changes on its own schedule (not only in response to a UI event) still redraws. Notification is a direct in-service callback, not a Cordis event.

```ts cordis-catalog
/**
 * Register one globally unique template value under the calling Cordis effect.
 * @param name - Lowercase slash-separated template name.
 * @param initialValue - Initial trusted ANSI-capable fragment.
 * @returns A mutable handle whose disposal unregisters the name.
 */
register(name: string, initialValue?: string): TuiPromptValueHandle

/**
 * Read a registered fragment without evaluating plugin code.
 * @param name - Exact registered template name.
 * @returns The current fragment, or `undefined` when unknown or unavailable.
 */
get(name: string): string | undefined

/**
 * Observe registration and value changes. The listener runs after a coalesced
 * microtask following any burst of mutations; the renderer re-reads current
 * values on that callback. The subscription is owned by the calling Cordis
 * effect, so it is removed when the subscriber's fiber disposes; the returned
 * disposer removes it early. Listener failures are contained — a synchronous
 * throw or a rejected returned promise cannot starve the other observers.
 * @param listener - Invoked once per coalesced change burst. Delivery does
 *   not wait on a returned promise; its rejection is only observed and logged,
 *   never left unhandled, so an async listener cannot order later observers.
 * @returns A disposer that removes the subscription.
 */
subscribe(listener: () => unknown): TuiPromptUnsubscribe
```

Source: [`src/prompt.ts:104`](../src/prompt.ts)

### `ctx.tuiResumeHost` — `TuiResumeHost`

Process-lifecycle owner used by the shipped CLI for an atomic resume handoff.

```ts cordis-catalog
/**
 * Dispose the current app and replace it with a runtime for `sessionId` in
 * `cwd`. Success does not return. A host may reject before it commits
 * teardown; after commit it owns fatal reporting and process exit.
 * @param sessionId - validated persisted session selected by the user.
 * @param cwd - the selected session's own workspace, which the replacement
 *   process must run in: process cwd, not the restored session header, is what
 *   filesystem and shell tools resolve against. It may differ from the current
 *   workspace, so a host that cannot enter it must reject before committing
 *   teardown.
 * @returns never settles: success replaces the process, failure rejects
 *   before teardown commits.
 */
handoff(sessionId: SessionId, cwd: string): Promise<never>
```

Source: [`src/runtime.ts:13`](../src/runtime.ts)
