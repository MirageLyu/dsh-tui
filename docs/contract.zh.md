# 行为契约

本文档是终端界面的详细行为契约：组合行、交互界面、配置、配色、模型体验与已知限制。仓库门面——安装、快速开始、键位与特性总览——见 [README.zh.md](../README.zh.md)；服务契约与 Cordis API 见 [docs/terminal-ui.zh.md](terminal-ui.zh.md)。

本 bundle 持有交互式终端展示、输入与单会话 agent 生命周期。它注入 `agents`、`sessions`、[`commands`](https://www.npmjs.com/package/@deepseek-ai/dsh-commands)、`llm`、`systemPrompt`、`tokenMeter`、`tools`、`userQuestions` 与 `approval`，可选读取 `skills` 服务（仅在已挂载时存在），并根据启动器参数（`--resume`、`--continue`、`--workspace`、`--model`）自行创建或恢复会话的 agent。持久化与模型侧 [`ask_user_question`](https://www.npmjs.com/package/@deepseek-ai/dsh-tool-ask-user) 工具仍是独立组合行，同一频道应答的共享 [`user-approval`](https://www.npmjs.com/package/@deepseek-ai/dsh-user-approval) 服务亦然。

终端启动成功后，该包提供终端本地的 `ctx.tui` 扩展服务。注入它的插件可以调用 `openOverlay()`，传入组件工厂与受约束的布局选项；宿主暴露视口、语义主题（包括终端安全的 DeepSeek `brand` 处理）、显示文本转义、重绘、关闭与生命周期信号，但不暴露 pi-tui 树、终端、焦点控制器或 overlay 句柄。插件 overlay、模型选择器、审批对话框与用户提问共享一个 FIFO 模态队列。每个请求都是调用方插件 fiber 的一个 effect，因此卸载会在清理完成前移除排队的工作或关闭可见的工作；终端关闭会先卸载依赖方再停止 pi-tui。Overlay 状态不落盘、不回放。组件代码受信任，可以渲染 ANSI 样式，但不受信任的文本必须经过 `host.display()`。

TUI 从追加源会话事件重建恢复后的历史，渲染 Markdown 回复与 reasoning，把每个工具的 `presentCall` / `presentResult` 意图应用到终端、diff 或通用卡片，把常驻的 `todo/write` 计划保持在编辑器上方（下一次 `turn/start` 时清除），在对话记录/状态区与编辑器之间就地呈现 `ctx.userQuestions` 提问，并通过同一 overlay 队列应答 `approval/request` 瀑布请求：审批对话框显示工具名、请求方的理由与确切的 call id，Enter/`y` 单次允许，Escape/`n` 拒绝，Ctrl+C 撤回请求。计划模式审查经由用户提问 provider 的 `plan-review` 意图到达该频道，因此同一面板渲染计划及其 Approve / Keep planning 决策。提问面板显示进度、编号选项、换行标签与单独缩进的描述；它同时服从 `maxQuestionOptions` 与 `questionDialogMaxHeight`，用 `↑ N more` / `↓ N more` 标记被隐藏的选项，并用 Page Up / Page Down 翻页浏览长提问/详情内容，再处理单个超大的选中块，同时保持编辑器可见。最近一次记录的会话标题成为头部副标题，标题出现之前显示 `welcome`，终端窗口标题变为 `<会话标题> — <配置的标题>`。持久的 `llm/retry` 事件会撤回失败步骤的实时块，并在对话记录中渲染排定的重试次数、延迟与失败；成功、耗尽与取消随后通过普通会话事件结算。页脚把每个已记录模型步骤的用量合计一次（含失败尝试），并对没有用量块的日志以已提交消息用量作为回退。空闲视图把 token-meter 压力与当前路由的 `ctx.llm.resolveModelInfo()` 上下文对比，适配器没有容量元数据时显示 `context unknown`，还显示工具卡片模式、当前模型与显式选择的 reasoning effort；agent 运行期间，这些摘要被经过时间指示与 `esc interrupt` 替代。界面替换从不重写已渲染的对话记录：被遮蔽的会话仍可读，落地的压缩检查点会在其日志位置添加一行 dim 的 `… earlier context was compacted …` 标记，于是终端报告模型从何处起看不到那段历史，而不是抹掉它。仅替换模型的副本——被剪枝的工具结果、重新生成的助手消息——不渲染任何内容。

嵌入方可以在其逻辑工作区标签与会话宿主目录不一致时提供 `TuiRuntime.formatCwd`。该覆盖只改变页脚标签；工具仍使用会话 `cwd`。

在模型输出、会话事件、工具呈现器、提问、配置或诊断到达 pi-tui 的 ANSI 感知渲染器或终端标题之前，TUI 会把除换行外的 C0/C1 控制字符渲染为可见的 `\xNN` 文本。这些来源无法添加终端控制序列；TUI 与 pi-tui 保持对终端渲染与样式的所有权。

在 token 边界输入 `@` 会在会话工作目录下搜索文件与目录。裸模糊查询使用可复用的有界工作区索引；含 `/` 的查询直接列出该目录，选中文件夹会保持补全开启以便下钻。含空格的路径以 `@"path with spaces"` 形式插入。选中文件只插入其路径与一个尾随空格：TUI 不会读取它、附加隐藏上下文，或把它替换为引用对象。注册了模型侧 `read` 工具时，TUI 会添加一条固定的 system prompt 指令，告诉模型在需要内容时读取显式路径。

挂载可选的 `ctx.sessionReferenceResolver` 时，同一 `@` 菜单还会提供仅元数据的会话候选，插入 `@[label](dsh-session:<payload>)`，并在派发前准备选中的快照。会话引用保持结构化，因为模型没有类文件系统工具来事后取回会话快照。准备期间禁用重复提交，失败时恢复编辑器输入。异步准备完成后，TUI 依据状态选择 `agent.steer()` 或 `agent.followup()`，因此空闲时的 followup 仍走 `agent/pre-step` 准入瀑布，而轮次中的 steering 在检查点处汇合、不经该钩子。

Agent 运行时，普通编辑器提交调用 `agent.steer()`；其他时候调用 `agent.followup()`。提交行以斜杠开头时改为进入 `ctx.commands`：已知命令直接执行，未知命令产生警告，两条路径都不会自动到达模型。命令生产方可以显式调度 agent 工作；[`dsh-plan-mode`](https://www.npmjs.com/package/@deepseek-ai/dsh-plan-mode#model-and-human-interactions) 使用该契约实现 `/plan [message]`。TUI 将 `/help`、`/model`、`/clear`、`/details`、`/theme`、`/palette`、`/reload`、`/resume`、`/status` 和 `/exit` 注册为 agent 作用域定义；其他所有有效命令都会动态加入自动补全与 `/help`，`/skill:` 补全也相同。编辑器上方的状态行报告 TUI 从会话事件派生的轮次阶段——等待首个 token、思考、响应或执行工具——显示该阶段经过时间与运行中的步骤总数，每秒刷新，并以 `Enter sends steering, Esc cancels` 提示结尾；steering 消息等待到达模型期间，会在提示前插入 `N queued ·` 徽标，每条排空后清除。实时独立压缩括号开启期间，提示上方显示固定的 `Context being compacted <elapsed>` 行，空闲提示符光标变成占一个终端字符单元并呼吸的 `⊙`，终端进度保持活跃直至闭合；该行与字形共享括号的同一个刷新定时器。该实时状态从不从日志重建；闭合失败会向对话记录添加 `Compaction failed: <error>`，而恢复会话遇到的陈旧孤立 start 永不激活指示器（压缩进度可见性）。Ctrl+C 或 Escape 取消运行中的轮次。工具卡片与注入上下文卡片把长正文折叠为可配置的头尾预览；Ctrl+O 让工具卡片在折叠预览、完整输出、隐藏三态间循环——隐藏阶段把工具卡片从对话记录中完全去掉，而上下文卡片保持预览，因为注入的指令不属于工具流量。隐藏阶段还会把每个轮次的 assistant 步骤折叠为一条消息：第一个有可见文本或 reasoning 的步骤保留该轮次唯一的 `Assistant` 标题，之后的步骤渲染为无标题续段，没有可见正文的步骤不渲染任何内容；离开隐藏阶段恢复每步各自的标题。注入上下文卡片把消息渲染为文本，并去掉生产方的外层提醒外框，因此折叠与去外框都不依赖载荷语法。Ctrl+R 切换 reasoning 可见性，Ctrl+T 把最近 assistant 步骤的 thinking 内联折叠，Ctrl+F 在分页全屏视图中打开最近一次工具调用的完整正文（↑/↓、PgUp/PgDn、Home/End；Esc 或 q 关闭），Ctrl+L 重绘，Ctrl+D 在空闲时退出。`/details` 命名的正是这两个快捷键循环的同一份状态：不带参数时打开一个居中的键盘开关，每个维度一个条目——`Tool cards` 与 `Reasoning`——显示实时值，Tab 循环高亮条目并立即应用变更（对话框背后的对话记录即预览），Enter、Esc 或 Ctrl+C 关闭；`/details collapsed|expanded|hidden` 让工具卡片直接跳到该阶段，`/details reasoning [on|off]` 设置——或裸 `reasoning` 切换——reasoning 块显示；参数可在一次调用中组合，未知参数以用法行报错，组合调用先应用 reasoning，使其对话记录重建不会丢掉卡片通知。

`/model` 把建议性的 `ctx.llm` 目录打开为键盘选择器：列表上方的过滤框按大小写不敏感的子串在每行的 `provider/model` 标签、模型名与描述上收窄行，高亮行在过滤后存活时保持选中；Up/Down 移动，Shift+Tab 按显示顺序循环当前模型的适配器宣告的 reasoning effort，Enter 选中模型与 effort，Escape 先清空非空过滤，第二次 Escape 关闭。适配器未宣告默认 effort 时，循环还包括 `Default`，它清除显式选择并保留 provider 默认值；没有可选 effort 元数据的模型忽略 Shift+Tab。选择器渲染确切宣告的 effort 列表——存在 `off` 时也包括——绝不合成、钳制或在模型之间转移 effort。`/model <model>` 仍直接选择无歧义的模型 id，而 `/model <provider>/<model>` 选择精确目标并在适配器有默认值时使用它。配置的目标或最近记录的请求头初始化选择器，未列出的当前模型保持可见，因为目录只是建议。选择仅对本 TUI 会话有效。Prompt 组装为一步快照目标，替换 `{{provider}}` 与 `{{model}}`，并经 `agent/request` 应用相同的 provider/model/reasoning-effort 目标；组装期间的切换因此从后续步骤开始生效。请求头持久记录真正到达模型的目标，未使用的选择仅存于进程内。

`/reload`（实验性，仅开发用）重读每个文件支持的 loader 配置树并把差异应用到运行中的应用——即 HMR 监视器的配置路径，手动触发；它需要上下文中的 cordis Loader，没有时降级为警告，仅在 agent 空闲时运行，并在 reload 进行中时拒绝重入。模块源码热更新仍归监视器所有。挂载了 `skills` 服务时，`/skill:<name> [instructions]` 把该技能的说明作为用户轮次载入会话；自动补全列出用户可调用的技能，精确调用会拒绝用户策略禁用的技能。

页脚把会话上报的用量合计为 `↑<未缓存输入> ↓<输出>`，任何输入计费后追加 `cache <rate>%`——计费 prompt token（未缓存输入加缓存读与写）中由 provider 缓存服务的比例，四舍五入到百分位。它还把 token-meter 压力与当前路由的 `ctx.llm.resolveModelInfo()` 上下文对比（适配器无容量元数据时省略上下文占比），并显示当前模型与工具卡片模式；页脚过窄时右侧先裁剪。

`/status` 向对话记录追加一张时点诊断卡片，agent 运行期间始终可用。它报告会话 id、标题、工作目录、所选 provider/model、所选 reasoning effort 或默认行为、reasoning 块可见性、agent 状态、事件/轮次/步骤/工具调用计数、精确的输入/输出/缓存 token 桶、KV 缓存命中率、token-meter 的上下文用量与容量、创建时间与最近事件时间。缺失的标题、模型、缓存输入或上下文容量会被标注而不是推断。卡片仅存在于终端，不与紧凑页脚重复。

`/resume` 打开全视口的键盘选择器而非居中对话框。选择器在命令运行后立即打开，并在会话扫描尚未完成时即取得输入焦点，行到达前显示加载占位；Escape 取消进行中的扫描，与取消已载入列表的方式相同。两个范围覆盖同一候选集：当前工作区（默认打开）与全部工作区（Tab 切换）。搜索框下方的范围行标注活动范围与另一范围的数量，全部工作区范围内每行还报告自己的工作区。切换会清空搜索与选择，使高亮行始终属于可见列表。

其聚焦搜索框紧跟搜索符号开始，并发出 pi-tui 的光标标记，使终端 IME 组合始终锚定在框内。行不读取完整日志：挂载可选投影缓存时，标题来自实时投影注册表或持久检查点行，冷读只折叠自检查点以来的日志尾部（写回后下次扫描零 I/O，受 `resumeScanConcurrency` 约束）；没有缓存的组合回退为一次有界的批量标题读取。候选按元数据活动排序——存活会话最近的内存事件时间，否则持久化产物的 mtime，再回退到创建时间——可按标题或会话 id 搜索，全部工作区范围还可按工作区标签搜索；每行报告该时间戳、current/live/persisted 状态与 id。Up/Down 与 Page Up/Page Down 导航，Enter 恢复，Escape 先清空非空搜索、第二次 Escape 取消，Ctrl+C 直接取消。当前会话、本运行时已存活的会话、不可读日志或没有可运行工作区记录的会话保持可见但禁用；与当前不同的工作区是范围而非禁用理由，因为恢复会进入该目录。

选中后重复这些检查，完整读取并回放校验所选日志，其记录的 provider 没有当前适配器时拒绝，并要求当前 agent 空闲后才冲刷当前会话。随后 TUI 停止终端界面，并调用可选的宿主所有 `TuiRuntime.handoffResume`，传入所选 id 与预检时重读的工作区：进程 cwd——而非恢复的会话头——才是文件系统与 shell 工具解析的依据，因此宿主必须进入该目录。在提供 `process.execve` 的地方，随附的 `dsh` 宿主在处置应用并替换进程前 chdir 进入该目录，并在终端仍可恢复时拒绝不可达目录。恢复还原同一 `SessionId`、对话记录、标题、todos 与持久 goal；goal 激活保持解除武装，TUI 请求人工确认或 `/goal resume`。随附 runner 通过在所选会话工作区内以 `--resume <id>` 重新 exec `dsh --profile tui` 进程实现切换：进程 cwd——而非恢复的会话头——才是文件系统与 shell 工具解析的依据。

启动参数是 TUI 自己的参数族（由 `./startup` provider 解析，而非 `dsh` 启动器）：

| 参数 | 含义 |
|---|---|
| `--resume <session-id>` | 按 id 恢复持久化会话，而非新建 |
| `--continue` | 恢复最近持久化的会话 |
| `--workspace <dir>` | 新会话的绝对工作区；默认取调用目录 |
| `--model <provider/model>` | 本会话的 provider/model 路由；裸值保留默认 provider；默认取存储的选择 |

`dsh --profile tui --help` 打印该参数族。嵌入方可以在启动上下文上提供 `TUI_GOODBYE_MESSAGE_KEY`，在终端释放后打印一行由启动器拥有的文本；TUI 在渲染前转义终端控制字符，且绝不执行该文本。

## 配置

| 键 | 默认值 | 含义 |
|---|---|---|
| `welcome` | — | 会话有记录标题之前的横幅副标题行；未设置时横幅无副标题扫入 |
| `sessionId` | `main` | 终端所驱动的精确共享 agent/会话身份 |
| `showReasoning` | `true` | 渲染 reasoning 块 |
| `collapseThinking` | `true` | 把每个 reasoning 块折叠为一行 `✦ Thinking · N words` 摘要；Ctrl+T 内联展开最近一个 assistant 步骤 |
| `maxToolOutputLines` | `6` | 折叠工具卡片头尾预览保留的输出行数 |
| `maxDiffEditLength` | `1000` | 精确 diff 探索的最大增删行数，超出后退化为整侧对比 |
| `maxQuestionOptions` | `8` | 同时可见的最大选项块数；行边界可能进一步压低 |
| `maxModelOptions` | `8` | 模型选择器可见模型数 |
| `maxResumeOptions` | `8` | 恢复选择器可见会话数 |
| `questionDialogWidth` | `200` | 提问面板宽度（列），受终端钳制 |
| `questionDialogMaxHeight` | `20` | 提问面板最大行数，进一步受约束以保留编辑器 |
| `modelDialogWidth` | `76` | 模型选择器宽度（列） |
| `modelDialogMaxHeight` | `20` | 模型选择器最大行数 |
| `detailsDialogWidth` | `72` | 对话详情选择器宽度（列） |
| `fileSearchMaxResults` | `20` | 一次 `@` 查询显示的最大文件与目录候选数 |
| `fileSearchMaxEntries` | `10000` | 裸模糊查询所用有界工作区索引保留的最大路径数 |
| `fileSearchExcludedDirectories` | `['.git', 'node_modules']` | 遍历与直接补全中省略的目录基名 |
| `showHardwareCursor` | `false` | 在 pi-tui 的 IME 标记处显示硬件光标 |
| `color` | `true` | 应用内置 ANSI 调色板（见[配色](#配色)） |
| `scheme` | — | 固定 light/dark 方案；缺省时以终端上报的方案为准。`/theme dark|light|auto` 切换实时会话 |
| `title` | `DeepSeek Harness` | 终端窗口标题的产品后缀。 |

```sh
dsh plugin --profile tui add @deepseek-ai/dsh-tui   # 一次性安装
dsh --profile tui                        # 在当前目录开启新会话
dsh --profile tui --continue             # 恢复最近的会话
dsh --profile tui --resume <id>          # 按 id 恢复会话
```

`dsh plugin` 以 `@deepseek-ai/dsh-base` 初始化 `tui` profile，并从 registry 安装本 bundle；其他树外插件用 `dsh plugin --profile tui add <package>` 加入，`dsh plugin --profile tui remove @deepseek-ai/dsh-tui` 拔除本界面。`dsh --profile tui --dump-config` 打印组合后的树。

任一进程流不是 TTY 时，启动在挂载前失败。组合应用必须把 TUI 挂载在其配置创建的 agent 之前，前门才能观察到 `agent-loop/config-start-failed`；精确匹配的会话失败在全屏模式开始前写入并以状态 1 退出，而不是留下空白终端。处置时停止扩展准入，卸载 `ctx.tui` provider 及其依赖插件，中止运行中的命令，移除 TUI 定义，停止 loader，拒绝待决提问，排空终端输入，恢复终端状态，注销事件监听器与用户交互 provider，且绝不退出 HMR 期间的替代进程。用户退出会处置应用根，使同级资源关闭，然后退出；五秒回退防止一个卡死的处置器困住进程。

## 配色

TUI 发出的每个通用 SGR 码都位于一张表中——`components/theme.ts` 的 `paletteSpec`——`createPalette` 从中派生包装器，`/palette` 打印它；任何组件都不自行书写转义序列。表内只有标准 16 色 ANSI 前景与 SGR 属性，每个终端都会把它们重映射到当前配色方案，因此 TUI 在浅色与深色背景下同样可读。启动横幅渐变与官方标志的精确 `#4D6BFE` 墨色是仅有的两处有意真彩品牌例外。正文使用终端默认前景，而非固定色值。

每种视觉含义只有一个角色：`dim` 是唯一的凹陷色调，`accent` 是唯一的交互强调，`brand` 是 DeepSeek 标志的标准 ANSI 回退，`success` 与 `error` 同时充当 diff 的增行与删行。颜色与属性分别类型化，因此 `bold(accent(x))` 能编译而 `accent(error(x))` 不能——SGR 没有颜色栈，一种颜色嵌套进另一种会在内层关闭时静默丢弃外层颜色。属性占据独立的 SGR 组，可与任意颜色按任意顺序组合。运行 `/palette` 即可看到每个角色在你终端上的渲染及其 SGR 组合。

分组区域（用户提示、助手回复、工具卡片）以角色色的粗体下划线角色头与空行间隔分隔，而非填充块或每行前缀，因此鼠标拖选复制的是消息文本本身，没有引导竖条或缩进；工具卡片的状态（pending、error、success）显示在其着色的下划线标题符号与标题中。工具卡片内部，整个正文——呈现器标题、终端 `$` 命令与 cwd、工具自身输出——以同一 dim 色调渲染，因此只有状态色标题携带颜色，正文读作一个凹陷块，而非竞相争艳的色块；注入上下文卡片的文本与其标题同色。两侧可用的 diff 卡片为精确的增 `+` 删 `-` 行着色并计数，未变上下文保持 dim 且不计数。精确比较超出 `maxDiffEditLength` 时，卡片把每个旧侧行渲染为删除、每个新侧行渲染为新增，页脚标记 approximate，并为后续重绘缓存该回退。`oldText` 不可用时——包括待决写入与回放回退以及新建——每个非空新侧行都显示并计为新增；该计数并不证明这些行在原文件中不存在。空的新内容不产生合成的 `+ ` 行。`[signal …]` 标记保持着色，因为那里的颜色本身就是含义而非强调。提问面板以粗体 accent 文本强调活动行，选择器使用反显。这些处理都仅限前景，因此从不与终端背景冲突。设置 `color: false` 可去除全部样式。

## 模型体验

### 思考折叠

#### 模型看到什么

对模型没有任何变化：`collapseThinking` 与内联折叠仅影响呈现。折叠的 reasoning 块在回复文本上方渲染为一行 dim 的 `✦ Thinking · N words` 摘要；Ctrl+T 内联展开或重新折叠最近一个 assistant 步骤，Ctrl+R 仍整体隐藏 reasoning。

#### Token 影响

无——reasoning 块无论如何都会到达模型；变化的只是终端呈现。

#### KV 缓存影响

无影响：折叠仅影响呈现，不改变 provider 缓存的内容。

### 交互式提示输入

#### 模型看到什么

每次非空普通编辑器提交成为一个文本块；目标 agent 空闲时通过 `agent.followup()` 发送，运行时通过 `agent.steer()` 发送。会话 mention 变为可读的 `@label` 文本，加上由 [`dsh-session-reference`](https://www.npmjs.com/package/@deepseek-ai/dsh-session-reference) 定义的持久不受信任上下文；其完整 JSON 隐藏在紧凑引用卡片之后。斜杠命令与键位绑定仅存在于 TUI；命令结果仍是终端通知。命令生产方可以调度单独的 agent 输入，例如 `/plan [message]` 接受的可选消息。

#### Token 影响

提交的文本按 agent loop 的正常会话历史与压缩规则保留。头部、记录的标题、卡片、Markdown 渲染、状态行、计划与帮助文本不增加 token。

#### KV 缓存影响

仅追加；新可见内容跟随可复用的请求前缀，不会使现有 KV 缓存条目失效。

### 文件引用自动补全

#### 模型看到什么

选中的文件仍是普通用户文本，如 `@src/index.ts` 或 `@"docs/design notes.md"`；自动补全不添加内容块、持久上下文或特殊引用载荷。注册了 `read` 时，本 TUI agent 的每个请求还包含下面这条固定的 system prompt 小节。由模型决定任务是否需要文件内容，并在需要时通过普通工具循环调用 `read`；路径本身不能证明文件被检查过。

##### 精确的 system prompt 文本

```markdown
Paths prefixed with @ are files explicitly referenced by the user. Use the read tool when their contents are needed; do not claim to have inspected a file before reading it.
```

#### Token 影响

自动补全本身不增加 token。选中的路径只贡献其普通用户文本 token；只要 `read` 可用，固定指令就贡献 system prompt token。文件内容仅在模型选择的 `read` 调用返回它们之后才消耗上下文。

#### KV 缓存影响

固定指令属于稳定的 system prompt 前缀，可跨轮次复用。每个选中路径都是仅追加的用户文本；之后的 `read` 结果通过普通工具对话记录追加所请求的内容。

### 会话模型选择

#### 模型看到什么

`/model` 命令文本与键盘选择器输入不落盘、不发送。新步骤在 prompt 变量中获得所选 provider/model 路由，在请求路由中获得所选 provider/model/reasoning-effort 目标。

#### Token 影响

选择器不添加消息。目标变更可能改变插值后的 system prompt 文本，并把后续请求发往所选模型。

#### KV 缓存影响

更换 provider 或模型即进入该目标的缓存域；不假设跨不同目标复用缓存。

### 手工技能调用

#### 模型看到什么

`/skill:<name> [instructions]` 提交加载指定技能并投递一个文本块：一个 `<skill name="…">` 元素包裹技能说明——provider 暴露资源基址时，其前还有一行定位技能相对资源——其后是用户输入的尾随说明。投递遵循与普通输入相同的空闲时 followup / 运行时 steer 规则。是命令而非模型选择技能：自动补全与精确调用应用 `invocation.userInvocable`，而 `invocation.modelInvocable` 不限制该界面。用户禁用的技能从自动补全中省略，并在精确名称加载前被拒绝；加载后的定义会针对策略竞态重新检查。自动补全保留最近一次完整技能快照，并在 `skills/change` 后重新获取；不完整观察保留旧菜单，完整的空观察清空菜单，斜杠名称草稿打开期间到达的目录会立即重新查询该草稿。技能服务是可选 peer；该策略检查只使用其类型契约，不引入运行时包依赖。

#### Token 影响

渲染的技能块与尾随说明按 agent loop 的正常会话历史与压缩规则作为一个用户轮次保留；重复调用会再次追加正文。

#### KV 缓存影响

仅追加；新可见内容跟随可复用的请求前缀，不会使现有 KV 缓存条目失效。

### 交互式用户提问应答

#### 模型看到什么

消费方调用 `ctx.userQuestions.ask()` 时，本 provider 按顺序呈现每个提问，并返回选中的选项标签、`custom` 文本，多选提问则两者都返回。待决的自定义文本在切回选项后仍然保留，并在之后以选项模式提交时与勾选的标签合并。中止、取消或界面处置经 `dsh-tool-ask-user` 变为 `Error: ask_user_question was interrupted before the user answered`。

#### Token 影响

等待与终端 overlay 不增加 token；解析出的答案或错误仅通过调用方工具或插件的结果对模型可见。

#### KV 缓存影响

仅追加；新可见内容跟随可复用的请求前缀，不会使现有 KV 缓存条目失效。

## 已知限制与延后工作

- **恢复没有跨进程会话锁**——选择器拒绝其自身运行时已知存活的会话，但另一进程仍可在切换前或切换中恢复同一持久化 id。全部工作区范围使这一情形一步可达，因为另一个宿主在其他目录驱动的会话现在是可选的。需要并发宿主的部署必须在 TUI 之外协调所有权。
- **一个已配置的会话拥有对话记录与编辑器**——其他 agent 的提问仍可使用共享 overlay provider，但会话渲染与提示输入仍绑定于 `sessionId`。
- **工具卡片是文本终端呈现**——终端、diff 与通用卡片使用工具拥有的标题/内容，但会话内容目前没有图片块用于内联图片渲染。
- **非 TTY 运行有意不支持**——需要自动化的应用组合必须组合一次性或服务器前门（`dsh-cli-demo`、`dsh-acp`），而不是指望内部回退。
- **手工 `/skill:` 调用总是重载完整技能正文**——TUI 不检测会话中已存在的技能，因此重复调用会再次追加其说明。
- **文件发现是宿主工作区发现**——自动补全读取 TUI 进程的会话 `cwd`，而选中文本随后由配置的 `read` 工具解释。挂载远程或虚拟文件系统的部署必须保持这些命名空间一致，或提供另一补全面。
- **文件搜索使用显式目录排除，而非 ignore 文件**——`.git` 与 `node_modules` 默认排除，部署可配置更多基名，但 `.gitignore` 与 `.ignore` 不被解释。目录符号链接不被遍历。
