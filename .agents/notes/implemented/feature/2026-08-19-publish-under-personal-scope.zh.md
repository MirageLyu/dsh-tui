# Agent Note：以维护者的个人 npm scope 发布 TUI

Status: implemented

[English](2026-08-19-publish-under-personal-scope.md) | 中文

## 问题

从 monorepo 继承的包名 `@deepseek-ai/dsh-tui` 只能由在 npm `@deepseek-ai` scope 上拥有发布权限的人发布。本仓库的维护者无法加入该组织，因此继承名会永久阻断 npm 发布。

## 决策

**把包改名为 `@miragelyu/dsh-tui` 并从本仓库发布。** npm scope 对应维护者的 npm 账号，任何账号都可以在自己的 scope 下发布。bundle 机制与 scope 无关：`dsh plugin --profile <name> add <package>` 按包名解析并挂载，无论其 scope 是什么；bundle 声明的每个 seam peer 仍从运行中的 dsh 安装解析。改名涉及清单、`cordis.patch.yml` 的行名（Loader 解析 `@miragelyu/dsh-tui/startup`、`/prompt` 与主入口）、invariant 注册、`@module` JSDoc 标签，以及 README 与文档中的安装命令。

## 考虑过的替代方案

**保留 `@deepseek-ai/dsh-tui` 名称并等待组织权限。** 否决：不存在获得该权限的路径，包将无限期无法发布。

**以无 scope 名称（`dsh-tui`）发布。** 否决：无 scope 名称先到先得且易被抢注；账号 scope 有保证，且保留家族前缀的可读性。

**通过其他 registry 发布。** 否决：`dsh plugin` 按配置的 registry 转发给 pnpm，而 npm 仍是默认；私有 registry 增加设置成本，却不解决 scope 问题。

## 验证

改名后的包通过完整本地套件（typecheck、build、243 项测试、36 项快照），并通过真实的 `dsh plugin --profile tui add link:…` + `dsh --profile tui` 冒烟启动，证明改名后的 `cordis.patch.yml` 行能经 Loader 解析。CI 在三个平台上运行矩阵。发布本身使用 release 工作流的 `NPM_TOKEN` secret，填入维护者的 npm token。

## 后果

可安装名称为 `@miragelyu/dsh-tui`；deepseek-harness 仓库的启动器文档引用该名称。历史性的重新引入笔记在决策文本中保留 monorepo 时代的名称，因为它记录的是当时该仓库的状态。若该包日后迁入 `@deepseek-ai` scope，改名可按同样的机械步骤反向进行。
