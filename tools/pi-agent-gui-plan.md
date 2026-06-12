# Pi 双端 GUI IDE 方案

## 结论

计划新建一个面向 Pi agent 的双端 GUI 工具，目标不是替代 VS Code 的成熟编辑器能力，而是在电脑端和手机端提供同一套可视化 agent 控制台。Pi 负责真正的 coding agent 能力，GUI 负责会话、工具过程、确认、模型和项目状态展示。

最终形态是一个可通过浏览器访问的 Pi IDE：电脑端浏览器提供宽屏工作台，手机端浏览器提供移动工作台，两端连接同一个 Pi agent runtime。VS Code 仍可作为主力代码编辑器和 diff/SCM 审查工具并行使用；Pi GUI 则提供跨设备的 agent 操作入口。

推荐先落地 Web GUI，而不是一开始做 Electron/Tauri 桌面应用。Web GUI 可以同时服务电脑和手机，沿用当前 Tailscale 访问习惯，也便于后续封装成桌面壳。

## 核心目标

- 电脑端有 GUI 界面，不要求用户只能在终端 TUI 中操作 Pi。
- 手机端通过 Tailscale 访问同一个 GUI 服务，可以远程给 Pi agent 发任务。
- 两端共享同一个 Pi agent runtime 或同一个受控 session broker，尽量避免电脑和手机各自启动互相不知道的 agent。
- GUI 能展示 agent 回复、工具调用、命令输出、文件修改摘要、运行状态和错误。
- 写文件、运行命令、切换 session 等高影响操作必须可审计、可中止、可确认。
- Pi 的模型、provider、session、skills、extensions 尽量沿用 Pi 自身机制，不在 GUI 中重新实现一套模型系统。

## 非目标

- 不把 Pi 改造成 VS Code 插件，也不依赖 VS Code/Copilot 私有接口。
- 第一版不实现完整代码编辑器、语言服务、断点调试、SCM 面板和 Problems 面板。
- 第一版不追求 TUI 与 Web GUI 同时实时操控同一个 Pi 进程；先由 GUI 独占一个 Pi RPC runtime，再通过 session 续接解决跨入口切换。
- 不在 GUI 中保存明文模型密钥。模型鉴权优先交给 Pi 的 provider/auth 配置。

## 推荐架构

```text
tools/pi-agent-gui/
  package.json
  start-tailscale.bat
  src/
    server.js              # HTTP/SSE 网关和静态资源服务
    piProcess.js           # 启动、停止、监控 pi --mode rpc
    piRpcClient.js         # JSONL RPC 读写、请求响应关联、事件分发
    sessions.js            # GUI 侧 session 元数据和最近连接状态
    projects.js            # 项目目录、启动参数、信任状态
    auth.js                # Tailscale/本机访问控制和可选 token
  media/
    index.html
    app.js
    style.css
```

### 运行模型

```text
电脑端浏览器 ─┐
              ├─ HTTP/SSE/WebSocket ─ Pi GUI Server ─ JSONL RPC ─ pi --mode rpc
手机端浏览器 ─┘
```

Pi GUI Server 是唯一直接控制 Pi RPC stdin/stdout 的进程。电脑端和手机端都只是浏览器客户端，避免两个 UI 同时写同一个 RPC 管道。

### 共享 Pi agent

共享不直接理解为“一个 TUI 和一个 RPC 同时接管同一进程”，而是分三层实现：

1. **第一版：共享 GUI runtime**
   - `start-tailscale.bat` 启动一个 Pi GUI Server。
   - Server 启动一个 `pi --mode rpc --name <project>` 子进程。
   - 电脑端和手机端都连接这个 Server。
   - 两端看到同一条消息流、同一批工具事件、同一个运行状态。

2. **第二版：共享 Pi session**
   - Server 记录当前 Pi session file/id。
   - 支持关闭 GUI 后用 `pi --session <id|path>` 或 GUI 再次恢复。
   - 支持从电脑端 Pi TUI 做完一段后，在 GUI 中选择同一个 session 续接。
   - 支持从 GUI 做完一段后，在电脑端 TUI 通过 `pi --session` 续接。

3. **第三版：Session Broker**
   - Server 管理多个 Pi runtime。
   - 每个 project/session 只允许一个活跃 writer。
   - 多端浏览器可以同时观察，输入需要排队或显式接管。
   - 提供锁、接管、只读观察、强制中止和恢复机制。

## GUI 形态

### 电脑端工作台

电脑端使用宽屏布局，强调信息密度和审查能力：

- 左栏：项目列表、session 列表、模型、运行状态、工具权限。
- 主区：对话流、thinking、assistant 回复、工具调用过程。
- 右栏：当前变更摘要、命令输出、文件修改列表、错误和提醒。
- 底部：输入框、发送模式、Abort、Steer、Follow-up。

电脑端 GUI 不替代 VS Code 编辑器。Pi 修改文件后，用户仍可在 VS Code 中查看 diff、SCM 和具体代码。

### 手机端工作台

手机端使用单列或底部标签布局，强调远程操作效率：

- Chat：消息流、工具卡片、输入框。
- Activity：当前工具执行、命令输出、等待确认项。
- Changes：文件变更摘要和风险提示。
- Sessions：切换/新建/恢复 session。
- Settings：模型、项目、访问控制、显示设置。

手机端必须优先处理长输出折叠、确认弹窗、Abort 入口和断线重连。

## Pi RPC 能力映射

| GUI 能力 | Pi RPC/机制 |
|---|---|
| 发任务 | `prompt` |
| 运行中追加指令 | `steer` |
| 任务结束后继续 | `follow_up` |
| 中止当前任务 | `abort` |
| 当前状态 | `get_state` |
| 消息历史 | `get_messages` |
| 模型列表 | `get_available_models` |
| 切换模型 | `set_model` |
| 新建会话 | `new_session` |
| 切换会话 | `switch_session` |
| 分叉/复制会话 | `fork` / `clone` |
| 流式回复 | `message_update` |
| 工具过程 | `tool_execution_start/update/end` |
| 扩展交互 | `extension_ui_request/response` |
| 命令结果入上下文 | `bash` |

## API 草案

GUI Server 对浏览器提供：

- `GET /`：双端自适应 GUI。
- `GET /api/runtime`：Pi GUI Server 和 Pi 进程状态。
- `POST /api/runtime/start`：启动 Pi RPC runtime。
- `POST /api/runtime/stop`：停止 Pi RPC runtime。
- `GET /api/state`：读取 Pi session state。
- `GET /api/messages`：读取消息历史。
- `GET /api/models`：读取可用模型。
- `POST /api/model`：切换模型。
- `POST /api/prompt`：发送 prompt。
- `POST /api/steer`：发送 steer。
- `POST /api/follow-up`：发送 follow-up。
- `POST /api/abort`：中止当前任务。
- `POST /api/sessions`：新建 session。
- `POST /api/sessions/switch`：切换 session。
- `POST /api/extension-ui-response`：回应 Pi extension UI 请求。
- `GET /events`：SSE 推送 Pi RPC events、状态变化和 GUI server errors。

第一版优先使用 SSE，因为当前 mobile chat 已验证过手机浏览器和本地 Node 服务的访问形态。若后续需要双向低延迟和多端同步，再切 WebSocket。

## 权限与安全

- 默认绑定 `127.0.0.1`，Tailscale 模式显式绑定 `0.0.0.0`。
- Tailscale 模式可以延续用户偏好的无 token 体验，但页面必须清楚标记当前为远程可访问。
- 高风险操作由 Pi extension 或 GUI Server 增加确认层：写文件、删除文件、运行命令、安装依赖、切换 session、停止 runtime。
- `extension_ui_request` 必须在 GUI 中渲染为 select/confirm/input/editor，不允许静默自动确认。
- 不在日志中输出 API key、OAuth token、完整密钥配置或敏感环境变量。
- Server 应限制请求体大小、并发 prompt、长输出缓存和可访问目录。
- 后续可增加只读模式：启动 Pi 时限制工具为 `read,grep,find,ls`。

## 分阶段实施计划

### 阶段 0：Pi 本体验证

目标：确认 Pi 在 Windows、当前项目和目标模型下可用。

- 安装 `@earendil-works/pi-coding-agent`。
- 在 `card-html` 目录运行 `pi`，完成 provider 登录或 API key 配置。
- 验证只读任务：列项目结构、查看 git status、搜索文件、读取并总结文件。
- 验证 agent 任务：让 Pi 做一次只读审查，不修改文件。
- 记录可用模型、session 文件位置和 Windows 启动注意事项。

### 阶段 1：最小 Pi RPC Bridge

目标：浏览器可以控制一个 Pi RPC runtime。

- 新建 `tools/pi-agent-gui/`。
- 实现 Node HTTP server 和静态页面。
- 实现 `pi --mode rpc` 子进程启动和退出处理。
- 实现严格 LF JSONL parser，不使用会误切 Unicode separator 的通用行读取逻辑。
- 实现 `prompt`、`abort`、`get_state`、`get_messages`。
- 用 SSE 转发 `message_update`、`agent_start/end` 和错误。

### 阶段 2：双端 GUI 原型

目标：电脑和手机能同时连接同一个 GUI runtime。

- 做响应式 Web UI：桌面双/三栏，手机单列标签。
- 支持模型列表和模型切换。
- 支持流式文本、thinking 折叠、错误展示。
- 支持 tool call 卡片，展示工具名、参数摘要、输出和完成状态。
- 支持多浏览器客户端同步当前消息流。
- 支持断线重连后恢复 state/messages。

### 阶段 3：共享 session 与 Tailscale 启动

目标：贴合当前手机访问习惯，并允许电脑/手机续接同一工作。

- 增加 `start-tailscale.bat`，一键启动 Pi GUI Server 和端口。
- 默认端口建议 `3002`，验证稳定后再决定是否替换旧 `3001`。
- 记录当前 project、session id/path、runtime name。
- 支持新建、切换、恢复 session。
- 支持最近 session 自动恢复。
- 支持电脑端打开同一页面作为 GUI IDE。

### 阶段 4：交互确认与变更可视化

目标：把 agent 操作做成可审计的 IDE 体验。

- 实现 `extension_ui_request` 的 select/confirm/input/editor。
- 对 bash 输出和工具输出做折叠、搜索和复制。
- 解析工具结果中的文件路径，生成 Changes 面板。
- 提供 Git status 摘要和修改文件列表。
- 写操作完成后提示用户回到 VS Code 审查 diff。

### 阶段 5：IDE 化增强

目标：形成“Pi IDE”而不复制完整 VS Code。

- 项目选择器和多项目 runtime 管理。
- Session tree/fork/clone 可视化。
- 只读/写入/命令执行权限模式。
- 任务模板、常用 prompt、skills 快捷入口。
- 可选 Electron/Tauri 桌面壳，复用同一套 Web UI。

## 验收标准

- 电脑端浏览器和手机端浏览器能同时看到同一个 Pi runtime 的消息与工具事件。
- 手机端发送 prompt 后，电脑端 GUI 能看到同一轮运行；反向也成立。
- agent 运行中可以 Abort，并且两端状态同步。
- 断线刷新后能恢复当前 state/messages，不丢失正在进行或刚结束的结果。
- 模型列表来自 Pi，不重复维护一套 VS Code mobile chat 模型配置。
- 工具调用至少能展示工具名、参数摘要、输出和成功/失败状态。
- `extension_ui_request` 不被静默忽略；需要用户选择的请求会在 GUI 中出现。
- GUI Server 不直接记录或展示模型密钥。
- Pi 修改文件后，VS Code 中可以看到对应文件变更和 Git diff。

## 与 VS Code Mobile Chat 的关系

| 维度 | VS Code Mobile Chat | Pi Agent GUI |
|---|---|---|
| 核心定位 | 手机聊天桥 | 双端 agent GUI IDE |
| Agent 能力 | 需要自行实现 | Pi 已提供 agent runtime 和工具 |
| 桌面 GUI | 依赖 VS Code 本体 | 浏览器 GUI，VS Code 可并行审查 |
| 手机 GUI | 已有轻量 chat | 目标是完整 agent 控制台 |
| 模型来源 | VS Code LM API + custom endpoint | Pi provider/model 系统 |
| 会话来源 | mobile chat 自维护 | Pi session + GUI session metadata |
| 工具过程 | 当前缺失 | Pi RPC 原生事件流 |
| 推荐用途 | 轻量手机 chat | 真正远程 coding agent |

后续如果 Pi Agent GUI 达到日常可用，可以将 VS Code Mobile Chat 保留为轻量聊天工具，也可以把 3001 入口迁移给 Pi Agent GUI，并归档旧工具。
