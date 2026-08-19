# Agent Note：TUI Claude Code 对齐的交互打磨

Status: implemented

中文 | [English](2026-08-18-tui-interaction-polish.md)

## 问题

恢复后的终端 UI 以固定细节呈现每个交互面：reasoning 块要么内联流式输出、要么整体消失；工具输出只能通过全局 Ctrl+O 可见性循环折叠；明暗配色只跟随终端启动时的上报；状态栏不携带权限与计划模式事实。产品要求 Claude Code 级的阅读体验——折叠的 thinking、可发现的工具输出折叠并带全屏详情视图、可切换的配色，以及常驻的权限/计划徽标。

## 决策

**折叠的 thinking 与单行摘要。** `collapseThinking`（默认 `true`）把每个 reasoning 块渲染为回复上方一行暗色 `✦ Thinking · N words` 摘要；Ctrl+T 内联展开或重新折叠最近的 assistant 步骤，Ctrl+R 保留原有的整体隐藏。折叠仅影响呈现：reasoning 块两种情况都同样到达模型，会话日志不变。

**全屏详情分页器。** Ctrl+F 在整视口 overlay 分页器中打开最近一次工具调用的完整正文（`ToolCardComponent.detailLines`，与 transcript 可见性无关的展开渲染），支持 ↑/↓、PgUp/PgDn、Home/End 与 Esc/q 关闭。折叠卡片保留 `… +N lines` 提示，现在同时指出分页器入口。

**可切换配色。** `theme.scheme` 在组合时固定 `dark`/`light`；实时 `/theme dark|light|auto` 命令原地切换调色板（`auto` 跟随终端上报配色，无上报时用 dark），状态提示反映当前配色。

**常驻权限与计划徽标。** 提示上下文行新增 `${permission}`（会话的权限预设，派生的 `custom` 状态隐藏）与 `${plan}`（计划模式激活时显示 `⧉ plan`，按 `plan/mode` 事件最后写入折叠）；`/status` 报告这两行。权限读取是可选 `ctx.get('permissionPresets')`——未挂载该服务的嵌入方保持徽标为空。

## 备选方案

**可聚焦的逐卡展开（Tab 导航）。** 拒绝：pi-tui 的焦点模型服务于单一组件；transcript 级焦点环会重新拥有全局可见性循环已覆盖的导航，而分页器回答了真正的阅读需求。

**把配色持久化到 settings。** 拒绝：为时过早——目前没有其他会话呈现选择会持久化；组合配置加实时命令同时覆盖编写方与临时需要。

**专用 reasoning 面板。** 拒绝：transcript 上的内联展开保持阅读位置，比侧面板更接近 Claude Code 的行为。

## 验证

`packages/bundle/tui/tests/tui.spec.ts` 覆盖折叠默认值与 Ctrl+T 展开/重新折叠、禁用时的内联渲染、`/theme` 切换与报告，以及分页器的开关循环；完整包测试套件（243 个测试）与 keyless 快照套件保持全绿。单文件 `dsh-cli` 可执行重建后重跑组装 headless 启动与交互式 TUI 冒烟。

## 后果

TUI 达到 Claude Code 对齐的阅读体验：带内联展开的折叠 thinking、可发现的工具输出折叠与全屏详情视图、实时明暗切换，以及常驻的权限/计划栏。两个新配置键是部署选择（`collapseThinking`、`theme.scheme`），三个新交互（Ctrl+T、Ctrl+F、`/theme`）进入 `/help` 界面。
