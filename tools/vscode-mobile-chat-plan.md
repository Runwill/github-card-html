# VS Code Mobile Chat 工具计划

## 结论

计划将旧的 OpenCode Mobile Chat 实验工具替换为一个面向 VS Code 的移动聊天工具。新工具不尝试接管 VS Code 桌面端原生 Copilot Chat 会话，而是由 VS Code 扩展维护一套独立的手机端会话系统，并复用 VS Code 暴露的模型、工作区、诊断、Git 和编辑能力。

当前已落地第一版原型骨架：`tools/vscode-mobile-chat/` 中包含 VS Code 扩展 manifest、本地 HTTP/SSE 网关、独立手机端会话存储、Copilot 模型调用层和移动端页面。

这是公开 API 边界下最稳妥的方向：VS Code 提供 Language Model API、Chat Participant API、工具注册 API、工作区 API、终端/任务/诊断/SCM 等能力，但没有公开提供“读取、切换、删除或遥控原生 Copilot Chat 会话”的完整接口。

## 会话设计原则

桌面端 VS Code 原生 Copilot Chat 会话和手机端会话应当分离。

- 桌面端原生会话继续由 VS Code/Copilot 管理。
- 手机端会话由本扩展自行保存、切换、删除和恢复。
- 手机端可以复用 VS Code 的模型能力和工作区上下文，但不把自己伪装成原生 Copilot Chat 的远程客户端。
- 所有手机端 API 都必须显式携带 `sessionId`，服务端不能再使用全局 `currentSessionId`。
- 刷新页面后优先恢复手机端上次选择的会话；会话不存在时再回退到最新手机端会话或创建新会话。

这样可以避免旧工具中的核心硬伤：多个标签页或设备互相覆盖当前会话、刷新后跳到别的会话、长会话被默认入口跳过、发送消息目标不稳定。

## 可用 VS Code 能力

### 可行能力

- 通过 `vscode.lm.selectChatModels({ vendor: 'copilot' })` 获取可用 Copilot 模型。
- 通过 `LanguageModelChat.sendRequest()` 发送聊天请求并读取流式文本响应。
- 通过 `vscode.chat.createChatParticipant()` 创建 VS Code Chat 面板内的自定义参与者。
- 通过 `vscode.lm.registerTool()` 注册语言模型工具，并由扩展自行执行工具调用。
- 通过工作区 API 读取文件、活动编辑器、选区、诊断和配置。
- 通过 WorkspaceEdit 或文件系统 API 应用受控代码修改。
- 通过任务、终端和 Git/SCM 能力展示运行状态、未提交变更和会话变更。
- 通过扩展宿主启动本地 HTTP/SSE/WebSocket 服务，向手机浏览器提供页面和实时消息。

### 不可依赖能力

- 不依赖读取原生 Copilot Chat 的完整历史会话。
- 不依赖删除或切换原生 Copilot Chat 会话。
- 不依赖调用 Copilot Chat 内部 agent 的私有接口。
- 不依赖 VS Code Chat 面板作为手机端状态源。

## 推荐架构

```text
tools/vscode-mobile-chat/
  package.json
  tsconfig.json
  src/
    extension.ts          # 激活、命令、配置、生命周期
    server.ts             # HTTP/SSE 或 WebSocket 网关
    sessions.ts           # 手机端会话存储
    lm.ts                 # VS Code Language Model 调用
    tools.ts              # read/search/diagnostics/git/edit/run 工具
    auth.ts               # 配对码、token、访问控制
  media/
    index.html
    app.js
    style.css
```

### Mobile Gateway

扩展启动本地服务，默认只绑定 `127.0.0.1`。局域网访问必须显式启用，并使用一次性配对码或 token。

建议接口：

- `GET /`：手机聊天页面。
- `GET /api/models`：列出可用 VS Code/Copilot 模型。
- `GET /api/sessions`：列出手机端会话。
- `POST /api/sessions`：创建手机端会话。
- `GET /api/sessions/:id/messages`：读取指定手机端会话消息。
- `POST /api/sessions/:id/messages`：向指定手机端会话发送消息。
- `DELETE /api/sessions/:id`：删除手机端会话。
- `GET /api/workspace/status`：获取工作区、Git 和诊断摘要。
- `GET /api/events` 或 WebSocket：推送流式回复、工具运行状态和错误。

### Session Store

会话存储放在扩展 `globalStorageUri` 或当前 workspace 的受控目录中。建议记录：

- `id`、`title`、`createdAt`、`updatedAt`。
- `workspaceId` 或 workspace folder 指纹。
- `modelId`。
- `messages`：`user`、`assistant`、`tool_call`、`tool_result`、`error`。
- 本次会话文件变更基线，用于展示会话 diff。
- 工具权限配置：只读、允许写文件、允许运行命令。

### Agent Runtime

扩展把手机端消息转换为 `LanguageModelChatMessage[]`，调用选定模型，并把工具调用结果继续回灌给模型。

首批工具建议只读：

- `get_workspace_summary`
- `get_active_editor`
- `get_selection`
- `read_file`
- `search_workspace`
- `get_diagnostics`
- `get_git_status`

第二批再加入写操作：

- `apply_patch`
- `workspace_edit`
- `run_task`
- `run_terminal_command`

写操作和命令执行默认需要手机端确认；高风险命令还需要 VS Code 端确认。

## 分阶段实施计划

### 阶段 1：最小可用原型

目标：手机能连到 VS Code，选择模型，发送消息并收到流式回复。

状态：已完成原型骨架，需在 VS Code Extension Host 中实际联调 Copilot 授权与模型响应。

- 新建 VS Code 扩展工程。
- 增加命令 `Mobile Chat: Start Server` 和 `Mobile Chat: Stop Server`。
- 实现本地 HTTP 服务和静态手机页面。
- 实现 `/api/models` 和单会话 `/api/chat`。
- 使用 `vscode.lm.selectChatModels({ vendor: 'copilot' })` 和 `sendRequest()`。
- 处理用户授权、无模型、配额限制和取消请求。

### 阶段 2：稳定会话系统

目标：彻底解决会话同步和发送目标问题。

- 所有 API 显式带 `sessionId`。
- 前端通过 `localStorage` 保存当前手机端会话 ID。
- 服务端不保存全局当前会话。
- 会话持久化到扩展 storage。
- 支持会话创建、切换、删除、重命名和刷新恢复。
- 长会话不跳走；改为摘要、裁剪或提示新建会话。

### 阶段 3：接入 VS Code 工作区上下文

目标：让手机端对话具备 IDE 上下文。

- 注入 workspace 名称、活动文件、选区和诊断摘要。
- 增加 Git 状态和未提交文件列表。
- 增加只读工具调用卡片。
- 支持用户在手机端选择是否附带当前文件或选区。

### 阶段 4：受控代码修改

目标：允许手机端触发安全可审计的代码修改。

- 实现 patch/workspace edit 工具。
- 修改前展示文件列表和摘要，要求确认。
- 修改后记录会话 diff。
- 支持打开受影响文件、定位修改区域。
- 命令执行只开放白名单任务或需要确认。

### 阶段 5：可靠性与安全收口

目标：可以长期日常使用。

- 默认仅本机绑定；局域网访问必须显式打开。
- 一次性配对码、token、过期和撤销机制。
- 请求体大小限制、并发限制、取消请求。
- SSE/WebSocket 断线重连。
- 所有消息渲染先转义再格式化。
- CSP、无内联脚本或最小化内联脚本。
- 记录可排查日志，但不保存敏感 token 或完整隐私内容。

## 与旧 OpenCode 工具的差异

| 能力 | 旧 OpenCode 工具 | VS Code 新工具 |
|---|---|---|
| 模型来源 | OpenCode provider API | VS Code Language Model API |
| 会话来源 | OpenCode session API | 扩展自维护手机端会话 |
| 当前会话 | 服务端全局变量 | 每个请求显式 `sessionId` |
| 手机刷新恢复 | 重新选择 OpenCode 最新会话 | 恢复手机端上次会话 |
| 工作区能力 | OpenCode API | VS Code workspace/diagnostics/SCM/tasks API |
| 原生 Copilot Chat 历史 | 不涉及 | 不读取、不接管 |
| 写文件 | 依赖 OpenCode agent | 扩展实现受控工具 |
| 安全边界 | 硬编码密码和局域网暴露 | 配对码/token/默认本机绑定 |

## 验收标准

- 手机端刷新后仍停留在同一手机端会话。
- 两个手机或两个标签页同时使用时，发送目标互不影响。
- 长会话不会被默认入口跳过。
- 模型调用失败时显示明确错误原因。
- 所有消息内容不会作为未转义 HTML 注入页面。
- 写操作必须能展示变更摘要并要求确认。
- 不依赖 VS Code/Copilot 私有接口。
