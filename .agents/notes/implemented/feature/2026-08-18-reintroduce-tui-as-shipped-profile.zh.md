# Agent Note：将终端 UI 重新引入为已发布的 `tui` profile

Status: implemented

中文 | [English](2026-08-18-reintroduce-tui-as-shipped-profile.md)

## 问题

[TUI 移除](../simplification/2026-08-04-remove-tui-package.md)在隐式 `dsh` 入口退役后删除了 `@deepseek-ai/dsh-tui`，因为当时没有任何已发布的组合消费它，Web 成为唯一交互界面。现在终端优先的交互界面成为产品需求：`dsh --profile tui` 必须打开一个 Claude Code 风格的全屏终端 agent——流式对话记录、工具卡片、内联审批与提问对话框、斜杠命令、会话恢复——并且要建立在当前 profile/bundle 架构之上，而不是恢复被移除的隐式 `dsh` 启动器、被删除的 SDK 工具链选项，或从零重建另一个产品级前端。

## 决策

**恢复被移除的实现，并适配到 profile 宿主。** 被删除的 TUI 包以 `packages/bundle/tui` bundle 包（`@deepseek-ai/dsh-tui`）重新引入：`tui` profile（`dsh --profile tui`，与 `web`/`headless` 一样通过 `PROFILE_TEMPLATES` 首次使用时自动初始化）叠加 `@deepseek-ai/dsh-base` + `@deepseek-ai/dsh-tui`。pi-tui 补丁（`patches/@earendil-works__pi-tui@0.80.7.patch`）一并恢复。复用成熟的渲染器、对话框、恢复选择器、文件自动补全与模型选择器，省去了数周的终端工程重新推导；归档的实现笔记仍可作为设计历史参考。唯一刻意的重做是前门：被移除的 `apps/cli/src/tui.ts` 启动器（配置创建 `main` agent、启动器持有身份键）被替换为 bundle 内的 runner——它通过 `ctx.agents` 自行创建或恢复 agent，并由新的 `./startup` provider 解析 TUI 自己的 flag 族（`--resume`、`--continue`、`--workspace`、`--model`）。

**Web 宿主使用的同一组 seam，改为进程内应答。** 键盘提问对话框注册为 `ctx.userQuestions` provider（计划审查通过其 `plan-review` intent 到达），新的审批队列注册一个限定作用域的 `approval/request` 瀑布应答器，以内联对话框呈现（Enter/`y` 单次允许，Escape/`n` 拒绝，Ctrl+C 撤回）。模型选择走 `installModelSelection`；会话准入走当前的 `agent/pre-step` 瀑布，替代已移除的 `agent/prompt-submit`。恢复切换通过携带 `--resume <id>` 在所选会话的工作目录内重新 exec 本进程完成，因为进程 cwd 才是文件系统与 shell 工具解析的依据。

## 备选方案

**重建一个全新终端前端（ink、手写 ANSI 或其他框架）。** 拒绝：被移除的实现已经覆盖流式渲染、推理块、工具卡片渲染意图、提问、恢复、自动补全、计时、token 统计与 Windows 输入，并带有大规模行为测试套件；全新前端只能依据归档笔记重新推导这些决策，风险与成本更高。预发布阶段倾向于恢复经过验证的基础并适配当前宿主。

**保留被移除的启动器契约（配置创建 agent、启动器持有身份键）。** 拒绝：profile 宿主已经通过 `cmdlineArgs` 与基于注册表的 create/resume 路径（headless runner 的模式）传递调用事实；第二个身份通道会重复当前架构向应用传递调用信息的做法。

**再次以未发布形式保留 TUI。** 拒绝：理由与移除笔记记录的维护成本相同——一个没有组合生命周期验收的终端前端呈现的是不受支持的界面。

## 验证

`tui` profile 启动在设定尺寸的 PTY 下端到端验证（帮助、横幅、状态行、命令执行、终端干净还原），恢复的行为测试套件通过 headless terminal 在组装后的组合上回放真实会话日志并比对帧。`dsh --profile tui --help`、`--dump-config`、恢复的包测试以及 host 聚合 typecheck 共同把关该界面。

## 后果

`dsh --profile tui` 成为已发布的交互界面：单会话、进程级 agent，具备流式对话记录、工具卡片、内联审批与提问对话框、`/resume`/`/model`/`/status`/`/details` 命令、权限预设与持久会话存储。base bundle 自预设拆分以来"为 TUI 保留"的 agent 平面行，如今重新有了具名消费者。[移除笔记](../simplification/2026-08-04-remove-tui-package.md)保持活跃：其重新引入条件即本笔记的清单，只有其"没有终端 UI 包"的后果被取代。
