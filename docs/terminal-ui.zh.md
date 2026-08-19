# 终端 UI

中文 | [English](terminal-ui.md)

全屏交互式终端界面以树外插件 bundle 的形式安装在 [dsh-base](https://www.npmjs.com/package/@deepseek-ai/dsh-base) 之上：`dsh plugin --profile tui add @deepseek-ai/dsh-tui` 之后，`dsh --profile tui` 在 pi-tui 上渲染单会话 agent 的对话记录，通过共享的 [user-questions](https://www.npmjs.com/package/@deepseek-ai/dsh-user-questions) / [user-approval](https://www.npmjs.com/package/@deepseek-ai/dsh-user-approval) seam 回答用户提问与审批，并拥有该会话的 agent 生命周期。[包 README](../README.md) 拥有按键、对话框、配置与模型体验契约；[重新引入笔记](../.agents/notes/implemented/feature/2026-08-18-reintroduce-tui-as-shipped-profile.md) 拥有重新引入决策。

源码：[`src/index.ts`](../src/index.ts)

## 组合

bundle 补丁挂载 runner（`tui-runner`）、其 flag provider（`tui-startup`，通过 [dsh-cmdline](https://www.npmjs.com/package/@deepseek-ai/dsh-cmdline) 解析 `--resume` / `--continue` / `--workspace` / `--model`）、prompt 注册表行（`tui-prompt`）、`/resume` 背后的 storage 与投影缓存阶梯、session-reference 解析器、tmux 上下文，以及 ask-user 工具。该界面消费的其余部分——agent 注册表、工具、命令、目标、计划模式、权限预设、沙箱、持久化——都是 base 层行。runner 通过 `ctx.agents` 自行创建或恢复会话 agent 并挂载频道；`/resume` 切换在所选会话的工作目录内携带 `--resume <id>` 重新 exec 进程，因为进程 cwd 才是文件系统与 shell 工具解析的依据。

## 服务

- `ctx.tui`（`TuiExtensionService`，频道挂载期间提供）承载插件 overlay：`openOverlay(request)` 把组件工厂连同布局约束排入共享 FIFO 模态队列。Overlay 状态仅存活于进程内——从不落盘或回放。
- `ctx.tuiPrompt`（`TuiPromptService`，即 `tui-prompt` 行）注册具名 prompt 模板值（`register(name, value?)` → `TuiPromptValueHandle`，`subscribe` → `TuiPromptUnsubscribe`，`get(name)`）；诸如 `${model}`、`${cwd}` 的模板通过它解析。
- `ctx.tuiResumeHost`（`TuiResumeHost`，可选，由嵌入方提供）以恢复的会话替换运行中的应用：`handoff(sessionId, cwd)` 以替换进程的方式成功，且永不返回。

已发布的 runner 读取三个可选的启动上下文值（由嵌入启动器提供）——`tuiGoodbyeMessage`（退出后终端释放时打印的一行），以及 `mainSessionId` / `tuiInitialSkill`，供直接绑定会话身份或植入首个技能轮次的嵌入方使用。

## 审批与提问

频道注册一个限定作用域的 `approval/request` 瀑布应答器与一个 `ctx.userQuestions` provider。审批以内联对话框呈现——Enter/`y` 单次允许，Escape/`n` 拒绝，Ctrl+C 撤回——计划审查（`intent: { kind: 'plan-review' }`）则在 Approve / Keep planning 决策之上渲染计划详情。其他 agent 的请求落到下一个应答器；拆除时每个待决请求以 `cancelled` 结清。

## 验证

恢复的行为测试套件在 headless terminal 上通过组装后的组合回放录制的会话日志并比对帧；真实入口（`dsh --profile tui`）在设定尺寸的 PTY 下验证帮助、横幅、命令执行与终端还原。

## Cordis API

## Cordis API

<a id="ctxtui--tuiextensionservice-abstract-seam"></a>

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

<a id="ctxtuiprompt--tuipromptservice"></a>

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

<a id="ctxtuiresumehost--tuiresumehost"></a>

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
