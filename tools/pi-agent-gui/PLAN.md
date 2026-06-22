# Pi Agent GUI 项目计划

## 核心要点

Pi Agent GUI 的长期目标不是给 `pi --mode rpc` 套一层网页聊天壳，而是做一个充分利用 Pi Agent 开放能力的双端 GUI IDE。RPC 文本命令层只负责会话控制和流式通信；项目、Git、编辑器状态、上下文选择和模型配置应逐步下沉为 Pi 原生 extension/custom tool/SDK 能力，让 agent 能主动读取 GUI IDE 状态，而不是依赖用户消息里拼接上下文。

## 当前原型已经具备的基础

- 双端共享运行时：桌面和手机浏览器连接同一个 GUI server，由服务端持有一个 Pi RPC 进程。
- 会话控制：支持启动、停止、prompt、steer、follow-up、abort、新会话和 Pi RPC 事件流转发。
- 项目视图：已有文件树、文件预览、全文/名称/当前文件搜索和当前文件定位。
- Git 视图：已有 Git status、单文件 diff 预览、从变更跳到项目文件。
- 编辑能力：已有普通文件预览内编辑、保存、未保存/保存中/保存失败状态。
- 模型配置：已有浏览器内 Provider/model 配置读写和当前模型切换。
- 多端布局：已有桌面/手机自适应、分隔条、固定说明面板和中英双语切换。

## 当前 owner 矩阵

- Runtime owner：`src/server.js` 负责 HTTP API、Pi 进程生命周期、模型配置读写、项目/Git 只读能力和 bridge endpoint；`src/piRpcClient.js` 只负责 RPC 子进程与 JSON-line 请求事件。
- IDE state owner：`media/app.js` 负责从浏览器当前预览、diff、未保存状态和 Git 列表同步 `/api/bridge/ide-state`；该状态只用于 GUI 预览和 Pi tool 读取。
- Context selection owner：输入区上下文选择器以“已添加的上下文对象”为主语，主 UI 是可移除、可预览的 chip 列表；“添加上下文”菜单和拖拽文件负责新增对象。当前文件、当前 Diff、Git 变更、未保存状态是可添加对象或快捷项，不是常驻权限 checkbox。
- Agent context owner：`extension/ide-bridge.js` 注册 `get_ide_context`，是 agent 获取 GUI 当前状态的唯一已实现入口；发送路径不得重新拼 IDE 状态。
- Bridge tool owner：`extension/ide-bridge.js` 注册 `get_ide_context`、`read_ide_file`、`read_ide_diff`、`list_ide_changes` 和 `get_unsaved_buffers`；`src/server.js` 的 `/api/bridge/*` 端点统一执行项目路径安全、大小限制和上下文范围门禁。
- Message owner：`media/app.js#sendMessage` 和 `src/server.js#handleTextCommand` 只传递用户输入的 `message`，不附加文件、diff 或 Git 摘要。
- Session owner：`src/server.js` 负责把 `PI_AGENT_GUI_SESSION_ID`、`PI_AGENT_GUI_SESSION`、`PI_AGENT_GUI_SESSION_DIR`、`PI_AGENT_GUI_CONTINUE`、`PI_AGENT_GUI_RESUME` 和 `PI_AGENT_GUI_NO_SESSION` 转成 Pi 原生 session 启动参数，并通过 `/api/sessions` 列出本地 Pi session 文件、通过 `/api/sessions/selection` 保存下次启动会话选择；浏览器 `localStorage` 只适合语言、范围等个人偏好，不能作为桌面/手机共享消息历史来源。
- Edit checkpoint owner：`src/server.js` 维护本 GUI 进程内的文件编辑快照，`media/app.js` 在发送任务前创建检查点，并在消息区显示待确认编辑；确认只隐藏待处理提示，取消或旧消息回退会调用快照恢复文件。该能力不使用 `git reset`，也不改写 Pi 原生 session 文件；超大、不可读或不在项目内的文件必须跳过并提示用户检查变更面板。
- Human preview owner：输入区“预览 IDE 状态”只控制 `contextPreview` 是否展示给用户，不改变 prompt、steer 或 follow-up 请求体，也不替代上下文项选择器。
- Startup owner：`start-tailscale.bat` 是手机/Tailscale 的默认运行入口，负责 `0.0.0.0:3002`、approve 模式和旧 server 清理；`npm start` 保留本机开发默认值。
- Documentation owner：`README.md` 记录当前可运行方式，`PLAN.md` 记录后续方向，`CHANGELOG.md` 只记录本工具变更；三者不能保留与发送路径相反的旧叙述。

## 需要继续深入的部分

### 0. 设计门禁：先定义语义 owner，再实现控件

任何 Pi Agent GUI 新交互进入实现前，先写清三件事：用户正在选择/控制的对象是什么，agent/runtime 实际消费的 owner 是什么，哪些只是快捷预设或显示开关。若对象说不清，先改设计，不进入中间实现。

上下文相关控件必须区分：

- 上下文对象：用户明确添加给 agent 的具体资源，如某个文件 chip、当前 Diff、Git 变更集合、未保存状态。
- 添加入口：按钮菜单、文件选择和拖拽文件只负责新增上下文对象，不是权限模型本身。
- 快捷项：当前文件、当前 Diff、Git 变更、未保存状态可作为菜单项或快捷添加项，不做成常驻 checkbox 面板。
- 人类预览：只负责给用户看当前选择和 IDE 状态，不改变发送正文。
- Bridge 门禁：server/tool 根据上下文项执行读取许可，不反向决定 UI 文案。

验收标准：用户能在界面上看到已添加上下文 chip，并能通过点击添加、拖拽文件、移除和预览管理上下文；不能只看到“全部/当前/无”这类抽象范围，也不能把 `file/diff/git/unsaved` 这类 bridge 来源直接做成主 UI。

### 1. IDE 上下文：以 Pi 工具为唯一 agent 入口

现状：GUI 已停止把当前文件路径、diff 路径和 Git 变更摘要附加到用户消息；这些状态只作为 GUI IDE state 同步给 bridge/tool。

目标：实现 Pi-native IDE bridge extension，让 agent 可以按需调用工具获取 GUI 状态。

优先工具：

- `get_ide_context`：已实现，返回当前文件、当前 diff、Git 变更数量、未保存状态、GUI 当前焦点区域。
- `read_ide_file`：已实现，按相对路径读取项目文件，复用 GUI 的路径安全规则和大小限制。
- `read_ide_diff`：已实现，读取指定文件的 staged/unstaged diff。
- `list_ide_changes`：已实现，返回当前 Git 变更列表。
- `get_unsaved_buffers`：已实现未保存缓冲区摘要，避免 agent 误读磁盘旧内容；当前原型只暴露 dirty 元数据，未暴露未保存正文。

验收标准：用户可以只说“检查当前文件”或“修一下当前 diff”，agent 不需要收到文件正文，也能主动调用工具拿到正确上下文。

### 2. 项目视图：从浏览器功能升级为 agent 可见资源

现状：文件树和搜索只服务于人类 GUI 操作，Pi agent 并不知道 GUI 当前展开、选中或搜索结果。

目标：把项目树、当前选择、搜索结果暴露成工具能力。

后续工具：

- `list_project_tree`：按目录返回轻量树，支持深度和忽略规则。
- `search_project`：复用 GUI 搜索接口，但作为 agent 工具返回结构化命中。
- `get_selected_project_item`：返回 GUI 当前选中文件/目录/搜索命中。

验收标准：agent 可以围绕 GUI 中的选择执行任务，而不要求用户手动复制路径。

### 3. Git/源代码管理：从只读预览升级为工作流面板

现状：已有 Git status 和 diff 预览，但没有 stage/unstage/revert/commit，也没有让 Pi 以工具方式读取当前 SCM 状态。

目标：先把 SCM 读能力交给 Pi，再谨慎增加写操作。

路线：

- 第一阶段：`list_ide_changes`、`read_ide_diff`、`read_git_status` 只读化。
- 第二阶段：增加 stage/unstage/discard 前的确认 UI，不允许静默破坏用户变更。
- 第三阶段：提供提交消息草拟、变更分组、review 摘要。

验收标准：手机端可完成“看变更 -> 让 agent 解释/修复 -> 复查 diff”的闭环；危险写操作必须显式确认。

### 4. 编辑器状态：从文件保存升级为真正的 open editors

现状：GUI 只有单个预览/编辑文件状态，未保存内容不会进入 Pi 的文件读取工具。

目标：建立 GUI editor state store，支持多个打开文件、当前活动文件、选择范围和未保存 buffer。

后续能力：

- 打开文件列表。
- 当前选区/光标附近上下文。
- 未保存 buffer 的只读工具访问。
- 保存前 diff 预览。

验收标准：agent 能识别“我正在看的这个未保存版本”，不会只按磁盘文件给出过时判断。

### 5. 模型配置：从写 models.json 升级为 Pi provider extension

现状：GUI 直接读写 `models.json`，并通过 RPC `set_model` 切换模型。

目标：保留简单配置入口，同时研究用 Pi extension 的 `registerProvider` 动态注册/覆盖 provider，减少手写配置文件带来的兼容风险。

验收标准：GUI 配置保存后可以让 Pi 立即识别新 provider/model；敏感 key 继续优先使用环境变量引用，不在页面回显明文。

### 6. Extension UI：从服务端桥接升级为 Pi 交互的一等入口

现状：服务端已有 `/api/extension-ui-response`，但 GUI 还没有系统化承接 Pi extension 的 select/confirm/input/custom UI。

目标：把 Pi extension UI 请求映射到浏览器弹层、确认框、输入框和固定面板，让手机端也能完整响应 Pi 的交互。

验收标准：Pi extension 在 RPC 模式请求确认或输入时，GUI 可以稳定展示并回传结果。

### 7. 启动方式：从 CLI 子进程升级为可选 SDK embedding

现状：GUI server 通过子进程启动 `pi --mode rpc`，协议边界清晰，但扩展注入和深度状态共享受限。

目标：短期继续 RPC；当 extension/custom tool 证明可行后，评估 SDK embedding，把 `createAgentSession({ customTools })` 直接放进 GUI server。

决策标准：

- 如果 CLI extension 能稳定加载 GUI bridge 工具，继续使用 RPC。
- 如果需要更强状态共享、低延迟或更细粒度事件控制，切换到 SDK embedding。

### 8. 会话与消息：从运行时快照升级为可恢复 session

现状：GUI 通过 Pi RPC `get_messages` 读取当前运行时消息，通过 `new_session` 创建新会话；`src/piRpcClient.js` 只负责子进程/RPC 转发，不保存消息。Sessions 面板会从 Pi session 目录列出最近 session 文件，并保存下次启动 runtime 使用的 `--session` / `--session-id` / `--continue` / `--resume` / `--no-session` 参数。Pi 当前公开能力主要是启动时恢复/指定 session，因此运行中切换会话暂不伪造，只保留 RPC 新建会话。

用户消息的“检查点”和“编辑重发”属于 GUI 级分支视图：前端会裁剪当前可见消息、回填旧用户消息或保留到选中检查点，再用现有 prompt 流程重新发送；但 Pi RPC 暂未暴露原生 rewind / truncate / checkpoint API，因此该能力不直接改写 Pi session 文件，也不声称运行时历史已被真实截断。后续如果 Pi 提供稳定的检查点或 session mutation 能力，再把这个 UI 接到原生 owner。

文件编辑回退由 GUI server 的编辑检查点承担：发送任务前记录当前 Git 变更文件快照，后续编辑出现后在主消息区显示“确认编辑 / 取消编辑”。确认保留当前磁盘内容但保留服务端检查点供旧消息回退使用；取消或编辑旧消息重发时按快照恢复文件。这个机制是保守恢复，不做仓库级 reset，因此无法自动处理超过大小限制、二进制、不可读或检查点外的异常文件；这类文件必须在结果中列为跳过并交给用户复查。

Pi CLI 已提供原生会话入口：`--continue`、`--resume`、`--session <path|id>`、`--session-id <id>`、`--session-dir <dir>`、`--no-session`，以及 `PI_CODING_AGENT_SESSION_DIR`。GUI 后续应优先接这些能力，而不是让每个浏览器自己缓存消息。

路线：

- 第一阶段：已实现启动 runtime 前由 GUI server 选择并记录当前 Pi session mode/path/id/session-dir，`/api/messages` 继续以 Pi `get_messages` 为主源。
- 第二阶段：已实现 `/api/sessions` list/new 和启动选择保存；后续只有在 Pi 明确暴露运行中 switch 能力后，再增加运行中切换。
- 第三阶段：必要时增加 GUI server 侧 session mirror，只作为 Pi session 的恢复索引或离线快照，并标明来源与更新时间。

验收标准：刷新浏览器、换设备或重启 GUI server 后，用户看到的是同一个 Pi session 的历史；不同浏览器不会各自形成一份互相冲突的消息历史。

## 分阶段实施

### Phase 1：Pi-native IDE bridge

- 已新增 `tools/pi-agent-gui/extension/`，实现 Pi extension 原型。
- 已注册 `get_ide_context`，返回当前项目根、活动文件、活动 diff、未保存状态和 Git 变更摘要。
- 已新增 bridge endpoint，供 extension 读取 GUI state。
- 已在启动 Pi 时加载该 extension；发送路径不再保留 prompt 引用 fallback。
- 已补 `read_ide_file`、`read_ide_diff`、`list_ide_changes` 和 `get_unsaved_buffers`，并由 server 端按上下文范围统一做门禁。

### Phase 2：上下文选择、预览与发送解耦

- 移除“附带 IDE 引用正文式提示”。
- 将上下文区域改成“添加上下文对象 + chip 列表 + 拖拽添加”的目标形态；当前文件、当前 Diff、Git 变更、未保存状态作为可添加项进入菜单，不作为常驻 checkbox 主 UI。
- 在系统提示或工具描述中明确：需要当前 GUI 状态时优先调用 IDE bridge 工具。

### Phase 3：SCM 与编辑器闭环

- 增加 open editors / unsaved buffers store。
- 增加只读 SCM 工具和 GUI 确认式写操作。
- 增加 agent 修改后的 diff 复查入口。

### Phase 4：SDK embedding 评估

- 对比 CLI extension 与 SDK embedding 的能力、稳定性和维护成本。
- 如果 SDK 方案能显著减少桥接层复杂度，再迁移 runtime owner。

## 非目标

- 不把文件正文和 diff 正文长期塞进用户 prompt。
- 不让 GUI 只停留在 chat UI。
- 不默认开放危险 Git 写操作。
- 不为了接近 VS Code 外观而牺牲手机端 Tailscale 直连体验。

## 近期下一步

1. 把当前 checkbox 中间形态替换为“已添加上下文 chip + 添加菜单 + 文件拖拽”目标形态。
2. 验证真实 prompt 中 agent 能主动调用 `get_ide_context`、`read_ide_file`、`read_ide_diff` 和 `list_ide_changes`。
3. 基于 Pi RPC 实际能力补齐会话列表、恢复、切换和新会话 UI，避免浏览器侧缓存成为消息来源。
4. 为旧历史消息增加清理或新会话提示，避免早期拼接过上下文的消息继续混淆测试。
5. 评估 SDK embedding 是否能减少 CLI extension 与 GUI server 之间的桥接层。