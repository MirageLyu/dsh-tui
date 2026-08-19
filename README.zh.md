# @miragelyu/dsh-tui

[![CI](https://github.com/MirageLyu/dsh-tui/actions/workflows/ci.yml/badge.svg)](https://github.com/MirageLyu/dsh-tui/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@miragelyu/dsh-tui)](https://www.npmjs.com/package/@miragelyu/dsh-tui)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[English](README.md) | 中文

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) agent 的全屏交互式终端入口——一个 Claude Code 风格的 TUI，把 agent 的对话流、工具卡片、审批与提问集中到一个键盘驱动的界面。它是树外插件 bundle：一条命令装进任何 `dsh` 安装，同样一条命令拔除。

示例会话：

```text
 DEEPSEEK HARNESS
 session-3bbd889b-2576-40ab-81bf-1100072df188

 ▸ you  Add a --dry-run flag to scripts/build-dsh-cli.ts and document it

 assistant  thinking…
 ✦ Thinking · 42 words

 I'll add the flag, plumb it through the pipeline, and update the usage text.

 ⚙ bash  Running…
 $ sed -n '120,180p' scripts/build-dsh-cli.ts
 （工具输出在这里渲染，长内容折叠为预览）

 ▸ you  Looks good. Which call sites change?

 assistant  ✓ done — 3 call sites updated, usage text amended.

 /Volumes/T7/dsh-tui (main)  workspace-write  deepseek-v4-flash  ↑1.2k ↓480  cache 67%
 dsh > ▍
```

## 特性

- **流式对话**——助手回复、reasoning 块与每次工具调用随 agent 工作实时渲染；工具卡片遵循各自的渲染意图（`terminal`、`diff`、search/read/web 卡片）
- **思考折叠**——每个 reasoning 块折叠成一行 `✦ Thinking · N words`；Ctrl+T 就地展开，Ctrl+R 整体隐藏 reasoning
- **工具卡片折叠**——Ctrl+O 在预览 → 完整输出 → 隐藏之间循环；Ctrl+F 在分页全屏视图中打开最近一次工具调用的完整正文
- **就地审批与提问**——工具审批、`ask_user_question` 对话框与计划模式审查都就地作答（Enter/`y` 允许，Esc/`n` 拒绝，Ctrl+C 撤回），而不是退回普通提示
- **斜杠命令**——`/help`、`/model`、`/clear`、`/details`、`/theme`、`/palette`、`/reload`、`/resume`、`/status`、`/exit`，以及任何插件贡献的命令
- **会话恢复**——`/resume` 以全屏选择器浏览持久化会话，支持工作区范围与零 I/O 缓存标题；`--resume <id>` / `--continue` 从命令行恢复
- **模型选择**——`/model` 用键盘选择器过滤 provider/model 目录，并可循环切换 reasoning effort
- **`@` 自动补全**——文件/目录模糊补全，外加仅元数据的会话引用
- **主题与配色**——light/dark/auto 方案（`/theme`）、尊重终端方案的 16 色 ANSI 调色板（`/palette`）、状态行里的权限/计划模式徽标
- **可组合**——插件 overlay（`ctx.tui.openOverlay()`）、prompt 模板值（`ctx.tuiPrompt`）与嵌入方拥有的恢复切换（`ctx.tuiResumeHost`）

## 环境要求

- 一个 `dsh` 安装（见[版本兼容](#版本兼容)）
- Node 在 `dsh` 的 engines 范围内（`^22.19.0 || >=24.0.0`）
- stdin 与 stdout 均为 TTY——脚本与管道请改用 `dsh --profile headless "task"`

## 安装

```sh
dsh plugin --profile tui add @miragelyu/dsh-tui
```

该命令以 `@deepseek-ai/dsh-base` 初始化 `tui` profile，从 registry 安装本 bundle，并把它加入 profile 的 bundle 栈。从本地仓库安装：

```sh
dsh plugin --profile tui add link:/path/to/dsh-tui
```

拔除后 bundle 出栈，profile 回落到 `dsh-base`：

```sh
dsh plugin --profile tui remove @miragelyu/dsh-tui
```

## 快速开始

```sh
dsh --profile tui                        # 在当前目录开启新会话
dsh --profile tui --continue             # 恢复最近的会话
dsh --profile tui --resume <id>          # 按 id 恢复会话
dsh --profile tui --workspace ~/project  # 在另一工作区开启新会话
dsh --profile tui --model deepseek-official/deepseek-v4-flash
```

## 使用

### 键位

| 按键 | 作用 |
|---|---|
| Enter | 发送 |
| Ctrl+O | 工具卡片循环：预览 → 完整 → 隐藏 |
| Ctrl+F | 分页全屏查看最近一次工具调用的正文 |
| Ctrl+T | 就地展开/折叠最近一个 reasoning 块 |
| Ctrl+R | 切换 reasoning 可见性 |
| Ctrl+L | 重绘屏幕 |
| Ctrl+C / Esc | 取消运行中的轮次 |
| Ctrl+D | 空闲时退出 |
| `@` | 文件与会话引用自动补全 |

### 斜杠命令

| 命令 | 作用 |
|---|---|
| `/help` | 列出所有命令 |
| `/model [provider/model]` | 打开模型选择器或直接选择 |
| `/theme dark\|light\|auto` | 切换配色方案 |
| `/palette` | 打印每种颜色角色及其 SGR 组合 |
| `/details` | 切换工具卡片与 reasoning 显示 |
| `/resume` | 打开会话恢复选择器 |
| `/status` | 追加会话诊断卡片 |
| `/clear` | 清空对话视图 |
| `/reload` | 应用基于文件的配置变更（开发用） |
| `/exit` | 退出 |

### 启动参数

| 参数 | 含义 |
|---|---|
| `--resume <id>` | 按 id 恢复持久化会话 |
| `--continue` | 恢复最近持久化的会话 |
| `--workspace <dir>` | 新会话的工作区；默认取调用目录 |
| `--model <provider/model>` | 本会话的 provider/model 路由 |

## 配置

bundle 从 profile 的 patch 层读取配置（完整表格见[行为契约](docs/contract.zh.md)）：

| 键 | 默认值 | 含义 |
|---|---|---|
| `welcome` | — | 会话有标题之前的横幅副标题 |
| `sessionId` | `main` | 终端所驱动的会话身份 |
| `showReasoning` | `true` | 渲染 reasoning 块 |
| `collapseThinking` | `true` | 把 reasoning 折叠为一行摘要 |
| `maxToolOutputLines` | `6` | 折叠工具卡片预览保留的行数 |
| `color` | `true` | 应用内置 ANSI 调色板 |
| `scheme` | — | 固定 light/dark；缺省时跟随终端方案 |
| `title` | `DeepSeek Harness` | 终端窗口标题后缀 |

## 版本兼容

本仓库把已发布的 `@deepseek-ai/dsh-*` `0.1.0-rc.7` 家族（外加 `@deepseek-ai/cordis` 4.x 与 `@deepseek-ai/cordis-plugin-loader` 1.x）钉为受测的 seam 契约。bundle 在运行时从所在的 `dsh` 安装解析 peer，因此它兼容已发布 seam 版本与该家族一致的安装；用 `dsh --version` 核对。升级时整个家族一起升，绝不单独升一个包，发布前重跑全套测试。

## 文档

- [行为契约](docs/contract.zh.md)——完整交互界面、配置、配色与模型体验
- [终端 UI 服务](docs/terminal-ui.zh.md)——`ctx.tui` / `ctx.tuiPrompt` / `ctx.tuiResumeHost` 契约

## 开发

```sh
pnpm install        # 安装钉住的 seam 家族
pnpm typecheck      # 对 src 与 tests 做 tsc 检查
pnpm build          # 产出 lib/ 包
pnpm test           # 243 项行为测试
pnpm test:snapshot  # 36 项组装式录制会话快照（免密钥回放）
```

## 许可证

[MIT](LICENSE)
