const CONTEXT_ITEM_KEYS = ['file', 'folder', 'diff', 'git', 'unsaved'];
const DEFAULT_CONTEXT_ITEMS = [];
const DEFAULT_CONTEXT_CHIPS = [];
const CONTEXT_CHIP_SCHEMA_VERSION = 'objects-v1';
const VIRTUAL_PREVIEW_BYTES = 12 * 1024;
const VIRTUAL_PREVIEW_INITIAL_LINES = 220;
const VIRTUAL_PREVIEW_SCAN_CHUNK_LINES = 90;
const VIRTUAL_PREVIEW_OVERSCAN_LINES = 80;
const state = {
  runtime: null,
  sessionInfo: null,
  models: [],
  modelConfig: null,
  messages: [],
  messageSource: '',
  messagesReadOnly: false,
  messagesTruncated: false,
  messagesLoadedOnce: false,
  conversationNotices: [],
  activeAssistant: null,
  agentStatus: '',
  historyActivities: [],
  tools: new Map(),
  handledResponseIds: new Set(),
  terminalOutput: [],
  terminalOutputRenderRaf: 0,
  messagesRenderRaf: 0,
  pendingMessagesRenderOptions: null,
  activityRenderRaf: 0,
  copiedMessageId: '',
  messageDraft: null,
  messageBranch: null,
  editCheckpoint: null,
  editCheckpointByMessage: {},
  projectTree: null,
  searchResults: null,
  activeSearchHit: null,
  gitStatus: null,
  currentFile: null,
  previewMode: 'empty',
  previewEditing: false,
  previewDirty: false,
  stepReferenceQuery: '',
  previewSaveState: 'idle',
  previewSaveError: '',
  previewVirtual: null,
  previewVirtualRaf: 0,
  previewVirtualScanRaf: 0,
  activeChangePath: '',
  activeEditCheckpointPreview: null,
  previewHighlightTimer: 0,
  ideSyncTimer: 0,
  ideSyncStatus: '',
  contextChips: parseStoredContextChips(localStorage.getItem('pi-agent-gui-context-chips')),
  collapsedFolders: new Set(),
  helpKey: 'help.default',
  language: localStorage.getItem('pi-agent-gui-language') || 'zh'
};

const DEFAULT_MODEL_CONTEXT_WINDOW = '128000';
const DEFAULT_MODEL_MAX_TOKENS = '16000';
const DEFAULT_PROVIDER_ID = 'lupo-gpt-03x';
const DEFAULT_PROVIDER_BASE_URL = 'https://ai.lupoapi.com/v1';
const DEFAULT_PROVIDER_MODEL_ID = 'gpt-5.5';
const DEFAULT_PROVIDER_MODEL_NAME = 'GPT-5.5';

const i18n = {
  zh: {
    'language.label': '语言',
    'runtime.loading': '正在读取运行状态...',
    'runtime.runningSummary': '共享 Pi 代理进程正在运行',
    'runtime.stoppedSummary': 'Pi 代理进程已停止',
    'runtime.status': '状态',
    'runtime.project': '项目',
    'runtime.model': '模型',
    'runtime.session': '会话',
    'runtime.terminalOutput': 'Pi 运行跟踪',
    'runtime.terminalEmpty': '暂无输出',
    'runtime.terminalCount': '最近 {count} 行',
    'runtime.traceReady': 'GUI 已连接，等待运行时事件。',
    'status.running': '运行中',
    'status.stopped': '已停止',
    'status.unknown': '未知',
    'tabs.runtime': '运行',
    'tabs.project': '项目',
    'tabs.changes': '变更',
    'tabs.model': '模型',
    'tabs.sessions': '会话',
    'tabs.config': '配置',
    'tabs.activity': '活动',
    'config.title': '配置 Provider',
    'config.provider': 'Provider',
    'config.api': 'API',
    'config.baseUrl': 'Base URL',
    'config.apiKey': 'API Key（可直接粘贴）',
    'config.modelId': '模型 ID',
    'config.displayName': '显示名称',
    'config.context': '上下文',
    'config.maxTokens': '最大输出',
    'config.reasoning': '推理模型',
    'config.noDeveloperRole': '禁用 developer role',
    'config.noReasoningEffort': '禁用 reasoning effort',
    'actions.start': '启动',
    'actions.abort': '停止',
    'actions.setModel': '设为当前模型',
    'actions.saveProvider': '保存 Provider',
    'actions.deleteProvider': '删除 Provider',
    'actions.search': '搜索',
    'actions.reload': '重载',
    'actions.saveFile': '保存',
    'actions.openFile': '打开文件',
    'actions.copy': '复制',
    'actions.checkpoint': '检查点',
    'actions.editResend': '编辑重发',
    'actions.cancelEdit': '取消编辑',
    'actions.acceptEdits': '确认编辑',
    'actions.restoreEdits': '取消编辑',
    'actions.send': '发送',
    'actions.revealCurrentFile': '定位当前文件',
    'actions.saveSession': '用于下次启动',
    'actions.newSession': '新建会话',
    'sendMode.prompt': '任务',
    'sendMode.steer': '插话',
    'sendMode.followUp': '后续',
    'models.none': '暂无模型配置',
    'project.empty': '暂无可显示文件。',
    'project.truncated': '文件树已截断，建议从更具体目录查看。',
    'project.searchPlaceholder': '输入关键词',
    'project.searchCurrent': '当前',
    'project.searchName': '名称',
    'project.searchContent': '全文',
    'project.searchEmpty': '没有搜索结果。',
    'project.searchHint': '输入至少 2 个字符搜索项目。',
    'project.searchNeedFile': '先打开一个文件，再搜索当前预览文件。',
    'project.searchTruncated': '搜索结果已截断，请输入更精确的关键词。',
    'project.searchDirectory': '文件夹',
    'project.fileNameMatch': '文件名匹配',
    'project.folderNameMatch': '文件夹名匹配',
    'changes.empty': '当前没有 Git 变更。',
    'context.include': '预览 IDE 状态',
    'context.none': '无当前文件或 Git 变更',
    'context.add': '添加上下文',
    'context.added': '已在上下文中',
    'context.presetNone': '清空',
    'context.itemFile': '当前文件',
    'context.itemDiff': '当前 Diff',
    'context.itemGit': 'Git 变更',
    'context.itemUnsaved': '未保存文件',
    'context.itemUnavailable': '当前不可用',
    'context.dropHint': '拖入项目文件或文件夹可添加上下文',
    'context.searchPlaceholder': '搜索文件、文件夹或上下文',
    'context.pickerCurrent': '当前',
    'context.pickerFiles': '文件与文件夹',
    'context.pickerChanges': '变更',
    'context.pickerEmpty': '没有匹配的上下文对象',
    'context.currentFileDetail': '当前预览文件',
    'context.currentDiffDetail': '当前预览 Diff',
    'context.gitDetail': '源代码管理变更集合',
    'context.unsavedDetail': '当前编辑区未保存内容',
    'context.gitFileDetail': 'Git 变更文件',
    'context.folderDetail': '项目文件夹',
    'context.remove': '移除 {name}',
    'context.file': '文件：{path}',
    'context.folder': '文件夹：{path}',
    'context.diff': 'Diff：{path}',
    'context.git': 'Git：{count} 个变更',
    'context.dirty': '未保存',
    'preview.title': '预览',
    'preview.empty': '选择文件或变更后，会在这里预览内容。',
    'preview.fileMeta': '{path} · {size} bytes',
    'preview.diffMeta': '{path} · diff',
    'preview.editDiffMeta': '{path} · 本次编辑 diff',
    'preview.savedMeta': '{path} · 已保存 · {size} bytes',
    'preview.dirty': '未保存',
    'preview.saving': '保存中...',
    'preview.saveFailed': '保存失败：{message}',
    'preview.discardConfirm': '当前文件有未保存修改。要丢弃这些修改并继续吗？',
    'preview.truncated': '\n\n[内容已截断]',
    'messages.configPath': '配置文件：{path}',
    'messages.saved': '已保存到 Pi 配置。当前正在运行的 Pi 代理进程不会自动换用新配置；请停止后重新启动，或用“设为当前模型”切换本次会话。',
    'messages.loadedSavedKey': '已加载保存的 Provider。Key 已保存但不会回显；留空保存会继续保留原 Key。',
    'placeholders.savedApiKey': 'Key 已保存，留空保留原 Key',
    'messages.deleted': 'Provider 已删除。当前正在运行的 Pi 代理进程不会自动卸载已加载模型；请停止后重新启动。',
    'messages.providerRequired': '请先填写 Provider。',
    'messages.copied': '已复制',
    'messages.copyFailed': '复制失败',
    'messages.checkpointReady': '已回到这条用户消息的检查点。输入新内容后发送会撤回界面中后续内容并继续。',
    'messages.editingCheckpoint': '正在编辑旧消息：这条消息之后的界面内容已暂时隐藏。发送时才会撤回后续文件编辑并重新开始，取消可恢复当前视图。',
    'messages.cancelEdit': '已取消旧消息编辑。',
    'messages.editCheckpointCreated': '已为文件编辑建立检查点，后续变更可在这里确认或取消。',
    'messages.editCheckpointPending': '文件编辑待确认：{count} 个文件有变更。',
    'messages.editCheckpointPanelTitle': '待确认文件编辑',
    'messages.editCheckpointFileDiff': '查看本次编辑差异：{path}',
    'messages.editCheckpointAccepted': '已确认本轮文件编辑。',
    'messages.editCheckpointRestored': '已撤回 {count} 个文件编辑。',
    'messages.editCheckpointSkipped': '有 {count} 个文件未自动撤回，请在变更面板检查。',
    'messages.editCheckpointFailed': '文件编辑检查点处理失败：{message}',
    'messages.checkpointReadOnly': '所选历史来自只读 session 文件，不能从这里编辑重发。',
    'messages.checkpointConfirm': '要从这条消息重新开始吗？界面中这条消息之后的内容会被撤回，Pi 原生历史文件不会被直接改写。',
    'messages.checkpointFileConfirm': '要从这条消息重新开始吗？界面中这条消息之后的内容会被撤回，且后续文件编辑会恢复到检查点。',
    'messages.checkpointRunningConfirm': 'Pi 正在生成回复。继续会先中止当前回复，再从这条消息重新发送。是否继续？',
    'messages.empty': '没有可显示的消息。',
    'messages.sessionHistory': '正在显示所选会话文件的历史消息。启动 Pi 代理进程后会显示运行中的会话。',
    'messages.sessionHistoryTruncated': '这个会话较长，这里只显示最近的消息。',
    'messages.thinking': '思考过程',
    'messages.toolCall': '工具调用',
    'messages.toolResult': '工具结果',
    'messages.stepsCompleted': '已完成 {count} 个步骤',
    'messages.stepsRunning': '正在执行 {count} 个步骤',
    'messages.stepsFailed': '有 {count} 个步骤失败',
    'messages.stepFallback': '步骤',
    'messages.stepStatusRunning': '运行中',
    'messages.stepStatusFailed': '失败',
    'messages.stepStatusComplete': '完成',
    'messages.stepRaw': '原始内容',
    'messages.stepMore': '还有 {count} 项',
    'messages.statusGenerating': '正在思考',
    'messages.statusTool': '正在{tool}',
    'messages.statusFinished': '已完成',
    'messages.statusFailed': '发送失败：{message}',
    'messages.historyToolCall': '历史工具调用',
    'messages.historyToolResult': '历史工具结果',
    'messages.runtimeStopped': 'Pi 代理进程已停止。',
    'messages.runtimeStopFailed': '停止 Pi 代理进程失败：{message}',
    'messages.modelSet': '当前 Pi 会话模型已切换为 {model}。',
    'messages.modelSetFailed': '切换模型失败：{message}',
    'messages.bridgeSynced': '上下文已同步给 Pi bridge。',
    'messages.bridgeSyncFailed': '上下文同步给 Pi bridge 失败：{message}',
    'messages.assistant': 'Assistant',
    'messages.user': 'User',
    'messages.system': 'System',
    'messages.error': 'Error',
    'messages.model': '模型：{model}',
    'activity.agentStarted': 'Agent 已开始',
    'activity.agentFinished': 'Agent 已完成',
    'activity.history': '历史',
    'stepReference.title': '步骤类型参考',
    'stepReference.searchPlaceholder': '搜索 search / check / edit',
    'stepReference.empty': '没有匹配的步骤类型。',
    'stepReference.reading': '读取与上下文',
    'stepReference.searching': '搜索与查找',
    'stepReference.editing': '编辑与变更',
    'stepReference.running': '运行命令',
    'stepReference.checking': '检查与验证',
    'stepReference.browser': '页面与浏览器',
    'sessions.startMode': '启动方式',
    'sessions.sessionValue': '会话路径或 ID',
    'sessions.sessionDir': '会话目录',
    'sessions.sessionValuePlaceholder': '从下方选择会话，或粘贴路径/ID',
    'sessions.sessionDirPlaceholder': 'Pi 默认会话目录',
    'sessions.modeDefault': '默认',
    'sessions.modeContinue': '继续上次',
    'sessions.modeResume': '由 Pi 选择',
    'sessions.modeSession': '指定会话',
    'sessions.modeSessionId': '精确会话 ID',
    'sessions.modeNone': '不使用会话',
    'sessions.empty': '没有找到本地 Pi 会话。',
    'sessions.selected': '已选择下次启动会话。',
    'sessions.runningLocked': 'Pi 代理进程运行中，启动会话选择会在停止后才能修改。',
    'sessions.previewTitle': '所选会话最近消息',
    'sessions.previewEmpty': '这个会话文件里还没有可预览的消息。',
    'sessions.previewCount': '共 {count} 条消息，显示最近 {shown} 条。',
    'sessions.newCreated': '已请求 Pi 新建会话。',
    'sessions.loadFailed': '读取会话失败：{message}',
    'sessions.saveFailed': '保存会话选择失败：{message}',
    'composer.placeholder': '向共享 Pi agent 发送任务',
    'placeholders.optional': '可选',
    'placeholders.apiKey': '直接粘贴 key，或填 $OPENAI_API_KEY',
    'help.title': '说明',
    'help.default': '悬浮、点击或聚焦到控件时，这里会显示功能解释。',
    'help.language': '切换界面语言，说明栏和主要控件文案会同步切换。',
    'help.start': '启动共享 Pi 代理进程。启动后手机和电脑会连接到同一个 agent 会话。',
    'help.abort': '停止共享 Pi 代理进程，不会删除配置或历史文件。',
    'help.runtimeTab': '查看共享 Pi 代理进程的启动状态、当前项目和当前模型。',
    'help.projectTab': '浏览当前项目文件树，点击文件后在右侧预览内容。',
    'help.projectSearch': '输入关键词后按当前范围搜索：当前只查右侧预览，名称只查文件/文件夹名，全文会扫描项目内容。',
    'help.projectSearchScope': '选择搜索范围。当前适合在预览内定位，名称适合找文件或文件夹，全文适合查项目内容。',
    'help.projectSearchButton': '执行所选范围搜索；文件结果会打开到右侧，当前文件结果会滚动到对应行。',
    'help.revealCurrentFile': '展开项目树中当前预览文件的父文件夹，并滚动到对应文件行。',
    'help.currentFile': '当前右侧正在预览或编辑的文件。蓝色边线表示它在项目树中的位置。',
    'help.fileIcon': '文件类型标识：js/ts 表示脚本，css 表示样式，<> 表示 HTML，{} 表示 JSON，md 表示 Markdown，img/svg 表示图片。',
    'help.folderIcon': '文件夹标识；左侧箭头表示当前文件夹是展开还是折叠。',
    'help.changeStatus': 'Git 双列状态：左列是暂存区，右列是工作区。M 是修改，A 是新增，D 是删除，R 是重命名，?? 是未跟踪；MM 表示同一文件既有暂存修改也有未暂存修改。',
    'help.previewMinimap': '预览概览条：左侧细轨显示代码结构，右侧窄轨显示搜索、diff 增删或错误位置，浅色框表示当前可见区域。',
    'help.changesTab': '查看当前 Git 变更列表，点击文件后在右侧预览 diff。',
    'help.openChangedFile': '打开这个变更对应的项目文件，并在项目树中定位。',
    'help.modelTab': '查看 Pi 当前可用模型，并把选中的模型设为本次 agent 会话使用的模型。',
    'help.sessionsTab': '查看本机 Pi 会话文件、最近消息，并选择下次启动 Pi 代理进程时要继续的会话。',
    'help.configTab': '在浏览器中维护 Pi 的模型 Provider 配置，保存后 Pi 重新加载即可使用。',
    'help.activityTab': '查看 agent 启动、结束和工具调用等运行活动。',
    'help.terminalOutput': '显示 Pi 请求、RPC 事件和子进程 stdout/stderr，方便定位 GUI 空白阶段实际发生了什么。',
    'help.stepReference': '查看会话步骤会如何归类显示，可搜索底层工具名或中文动作名称。',
    'help.stepReferenceSearch': '输入 search、check、edit 等关键词，查找它们在会话中显示成哪类步骤。',
    'help.modelSelect': '这里列出 Pi 从模型配置中识别到的可用模型。',
    'help.setModel': '把下拉框里的模型切换为 Pi agent 当前使用的模型。',
    'help.sessionMode': '选择 Pi 代理进程下次启动时如何处理 Pi 会话；运行中不能直接切换启动会话。',
    'help.sessionValue': '指定会话模式使用这个值。点击下方最近会话会自动填入对应 session 文件路径。',
    'help.sessionDir': '可选。留空时使用 Pi 默认会话目录；填写后会从该目录读取和恢复 session。',
    'help.saveSession': '保存下次启动 Pi 代理进程使用的会话参数。当前进程运行中时不会切换正在运行的会话。',
    'help.newSession': '在正在运行的 Pi 代理进程中请求新建会话；这使用 Pi RPC，不依赖浏览器缓存。',
    'help.provider': 'Provider 是模型服务的名称，例如 openai、openrouter 或本地服务名。',
    'help.api': '选择该 Provider 使用的 API 协议，需与服务商兼容接口匹配。',
    'help.baseUrl': '填写 Pi/OpenAI SDK 实际请求的 API 根地址。VS Code custom endpoint 可只填站点根地址；这里需要能直接拼出 /chat/completions 的地址，例如 https://ai.lupoapi.com/v1。',
    'help.apiKey': '可以直接粘贴 API Key，保存后会写入 Pi 的 models.json 但不会在页面回显；也可以填 $OPENAI_API_KEY 这类环境变量引用。',
    'help.modelId': '填写服务商真实模型 ID，Pi 会用它向 Provider 发起请求。',
    'help.modelName': '可选显示名，只影响界面展示，不改变实际请求的模型 ID。',
    'help.contextWindow': '模型上下文窗口大小，用来告诉 Pi 可保留多少上下文。',
    'help.maxTokens': '单次回复允许的最大输出 token 数。',
    'help.reasoning': '写入 Pi models.json 的 model.reasoning=true。Pi 源码用它判断 supportsThinking()，并在 OpenAI compatible 请求中决定是否启用推理相关参数。',
    'help.noDeveloperRole': '写入 compat.supportsDeveloperRole=false。Pi 的 openai-completions 实现会把推理模型的系统提示从 developer role 改为 system role。',
    'help.noReasoningEffort': '写入 compat.supportsReasoningEffort=false。Pi 的 openai-completions 实现会跳过 reasoning_effort 字段，避免中转接口不支持该参数时报错。',
    'help.saveProvider': '保存当前 Provider 和模型配置到 Pi 的 models.json。',
    'help.deleteProvider': '删除当前 Provider 配置；删除前请确认 Provider 名称正确。',
    'help.reloadFile': '重新从磁盘读取当前文件，会丢弃右侧编辑区尚未保存的修改。',
    'help.saveFile': '把右侧编辑区内容保存回当前项目文件。只会写入当前项目目录内的已存在文件。',
    'help.previewEditor': '显示带高亮的文件、diff 或错误内容。普通文件点击预览区后会在同一高亮层进入编辑并保存。',
    'help.resizeSidebar': '拖动这里调整侧边栏宽度，方便在文件树和编辑区之间分配空间。',
    'help.resizePreview': '桌面端拖动这里调整预览编辑区和 agent 对话区宽度；手机端调整预览高度。',
    'help.resizeComposer': '拖动这里调整对话区和输入区的高度，适合在长提示词和阅读回复之间分配空间。',
    'help.contextPanel': '点击或拖入文件、文件夹添加上下文；已添加项会作为 chip 留在这里。',
    'help.contextScope': '这里管理已添加给 agent 的上下文对象；它不是消息正文，发送内容仍只来自输入框。',
    'help.contextAdd': '搜索并添加具体上下文对象，例如当前文件、当前 Diff、项目文件、文件夹或 Git 变更；也可以把项目树条目拖到这里。',
    'help.contextPicker': '点击空白处搜索并添加上下文；已添加 chip 可逐个移除。',
    'help.sendMode': '任务会开启新的 agent 目标；插话用于中途补充指令；后续用于继续上一轮。',
    'help.messageInput': '输入要交给共享 Pi agent 的任务、补充说明或后续要求。',
    'help.messageDraft': '正在编辑旧用户消息。发送会撤回界面中该检查点之后的内容，再用当前输入重新发起。',
    'help.sendButton': '把当前输入按所选发送模式提交给共享 Pi agent。'
  },
  en: {
    'language.label': 'Language',
    'runtime.loading': 'Loading runtime...',
    'runtime.runningSummary': 'Shared Pi runtime is running',
    'runtime.stoppedSummary': 'Runtime is stopped',
    'runtime.status': 'Status',
    'runtime.project': 'Project',
    'runtime.model': 'Model',
    'runtime.session': 'Session',
    'runtime.terminalOutput': 'Pi runtime trace',
    'runtime.terminalEmpty': 'No output yet',
    'runtime.terminalCount': 'Last {count} lines',
    'runtime.traceReady': 'GUI connected. Waiting for runtime events.',
    'status.running': 'Running',
    'status.stopped': 'Stopped',
    'status.unknown': 'Unknown',
    'tabs.runtime': 'Agent',
    'tabs.project': 'Project',
    'tabs.changes': 'Changes',
    'tabs.model': 'Model',
    'tabs.sessions': 'Sessions',
    'tabs.config': 'Config',
    'tabs.activity': 'Activity',
    'config.title': 'Configure provider',
    'config.provider': 'Provider',
    'config.api': 'API',
    'config.baseUrl': 'Base URL',
    'config.apiKey': 'API key (paste allowed)',
    'config.modelId': 'Model ID',
    'config.displayName': 'Display name',
    'config.context': 'Context',
    'config.maxTokens': 'Max tokens',
    'config.reasoning': 'Reasoning model',
    'config.noDeveloperRole': 'Disable developer role',
    'config.noReasoningEffort': 'Disable reasoning effort',
    'actions.start': 'Start',
    'actions.abort': 'Stop',
    'actions.setModel': 'Set model',
    'actions.saveProvider': 'Save provider',
    'actions.deleteProvider': 'Delete provider',
    'actions.search': 'Search',
    'actions.reload': 'Reload',
    'actions.saveFile': 'Save',
    'actions.openFile': 'Open file',
    'actions.copy': 'Copy',
    'actions.checkpoint': 'Checkpoint',
    'actions.editResend': 'Edit resend',
    'actions.cancelEdit': 'Cancel edit',
    'actions.acceptEdits': 'Accept edits',
    'actions.restoreEdits': 'Discard edits',
    'actions.send': 'Send',
    'actions.revealCurrentFile': 'Reveal current file',
    'actions.saveSession': 'Use on next start',
    'actions.newSession': 'New session',
    'sendMode.prompt': 'Prompt',
    'sendMode.steer': 'Steer',
    'sendMode.followUp': 'Follow-up',
    'models.none': 'No models configured',
    'project.empty': 'No files to display.',
    'project.truncated': 'The file tree was truncated. Open a narrower folder when available.',
    'project.searchPlaceholder': 'Enter keywords',
    'project.searchCurrent': 'Current',
    'project.searchName': 'Names',
    'project.searchContent': 'Content',
    'project.searchEmpty': 'No search results.',
    'project.searchHint': 'Enter at least 2 characters to search the project.',
    'project.searchNeedFile': 'Open a file before searching the current preview.',
    'project.searchTruncated': 'Search results were truncated. Try a more specific query.',
    'project.searchDirectory': 'Folder',
    'project.fileNameMatch': 'File name match',
    'project.folderNameMatch': 'Folder name match',
    'changes.empty': 'No Git changes right now.',
    'context.include': 'Preview IDE state',
    'context.none': 'No current file or Git changes',
    'context.add': 'Add context',
    'context.added': 'Added to context',
    'context.presetNone': 'Clear',
    'context.itemFile': 'Current file',
    'context.itemDiff': 'Current diff',
    'context.itemGit': 'Git changes',
    'context.itemUnsaved': 'Unsaved file',
    'context.itemUnavailable': 'Not available now',
    'context.dropHint': 'Drop project files or folders here to add context',
    'context.searchPlaceholder': 'Search files, folders, or context',
    'context.pickerCurrent': 'Current',
    'context.pickerFiles': 'Files and folders',
    'context.pickerChanges': 'Changes',
    'context.pickerEmpty': 'No matching context objects',
    'context.currentFileDetail': 'Current preview file',
    'context.currentDiffDetail': 'Current preview diff',
    'context.gitDetail': 'Source control change set',
    'context.unsavedDetail': 'Unsaved editor content',
    'context.gitFileDetail': 'Changed file',
    'context.folderDetail': 'Project folder',
    'context.remove': 'Remove {name}',
    'context.file': 'File: {path}',
    'context.folder': 'Folder: {path}',
    'context.diff': 'Diff: {path}',
    'context.git': 'Git: {count} changes',
    'context.dirty': 'unsaved',
    'preview.title': 'Preview',
    'preview.empty': 'Select a file or change to preview it here.',
    'preview.fileMeta': '{path} · {size} bytes',
    'preview.diffMeta': '{path} · diff',
    'preview.editDiffMeta': '{path} · this edit diff',
    'preview.savedMeta': '{path} · saved · {size} bytes',
    'preview.dirty': 'Unsaved',
    'preview.saving': 'Saving...',
    'preview.saveFailed': 'Save failed: {message}',
    'preview.discardConfirm': 'The current file has unsaved changes. Discard them and continue?',
    'preview.truncated': '\n\n[Content truncated]',
    'messages.configPath': 'Config: {path}',
    'messages.saved': 'Saved to Pi config. The running Pi runtime will not automatically switch to the new config; stop and start it again, or use Set model for this session.',
    'messages.loadedSavedKey': 'Loaded saved provider. The key is saved but not echoed; leave it blank to keep the existing key when saving.',
    'placeholders.savedApiKey': 'Key saved; leave blank to keep it',
    'messages.deleted': 'Provider deleted. The running Pi runtime will not automatically unload already loaded models; stop and start it again.',
    'messages.providerRequired': 'Provider is required.',
    'messages.copied': 'Copied',
    'messages.copyFailed': 'Copy failed',
    'messages.checkpointReady': 'Returned to this user-message checkpoint. Type a new message and send to withdraw later visible content and continue.',
    'messages.editingCheckpoint': 'Editing an earlier message. Visible content after it is temporarily hidden. File edits are reverted only when you send; cancel restores this view.',
    'messages.cancelEdit': 'Cancelled earlier-message editing.',
    'messages.editCheckpointCreated': 'Created a file-edit checkpoint. Later changes can be accepted or discarded here.',
    'messages.editCheckpointPending': 'File edits pending: {count} changed files.',
    'messages.editCheckpointPanelTitle': 'Pending file edits',
    'messages.editCheckpointFileDiff': 'View this edit diff: {path}',
    'messages.editCheckpointAccepted': 'Accepted this round of file edits.',
    'messages.editCheckpointRestored': 'Reverted {count} file edits.',
    'messages.editCheckpointSkipped': '{count} files were not reverted automatically. Check the Changes panel.',
    'messages.editCheckpointFailed': 'File edit checkpoint failed: {message}',
    'messages.checkpointReadOnly': 'The selected history is from a read-only session file, so it cannot be edited and resent here.',
    'messages.checkpointConfirm': 'Start again from this message? Visible content after it will be withdrawn. The native Pi history file will not be rewritten directly.',
    'messages.checkpointFileConfirm': 'Start again from this message? Visible content after it will be withdrawn, and later file edits will be restored to the checkpoint.',
    'messages.checkpointRunningConfirm': 'Pi is generating a reply. Continuing will abort the current reply first, then resend from this message. Continue?',
    'messages.empty': 'No messages to display.',
    'messages.sessionHistory': 'Showing history from the selected session file. Start the Pi agent process to show the running conversation.',
    'messages.sessionHistoryTruncated': 'This session is long, so only the most recent messages are shown here.',
    'messages.thinking': 'Thinking',
    'messages.toolCall': 'Tool call',
    'messages.toolResult': 'Tool result',
    'messages.stepsCompleted': 'Completed {count} steps',
    'messages.stepsRunning': 'Running {count} steps',
    'messages.stepsFailed': '{count} steps failed',
    'messages.stepFallback': 'Step',
    'messages.stepStatusRunning': 'Running',
    'messages.stepStatusFailed': 'Failed',
    'messages.stepStatusComplete': 'Done',
    'messages.stepRaw': 'Raw',
    'messages.stepMore': '{count} more',
    'messages.statusGenerating': 'Thinking',
    'messages.statusTool': 'Working on {tool}',
    'messages.statusFinished': 'Finished',
    'messages.statusFailed': 'Send failed: {message}',
    'messages.historyToolCall': 'History tool call',
    'messages.historyToolResult': 'History tool result',
    'messages.runtimeStopped': 'Pi runtime stopped.',
    'messages.runtimeStopFailed': 'Failed to stop Pi runtime: {message}',
    'messages.modelSet': 'Current Pi session model switched to {model}.',
    'messages.modelSetFailed': 'Failed to switch model: {message}',
    'messages.bridgeSynced': 'Context synced to Pi bridge.',
    'messages.bridgeSyncFailed': 'Failed to sync context to Pi bridge: {message}',
    'messages.assistant': 'Assistant',
    'messages.user': 'User',
    'messages.system': 'System',
    'messages.error': 'Error',
    'messages.model': 'Model: {model}',
    'activity.agentStarted': 'Agent started',
    'activity.agentFinished': 'Agent finished',
    'activity.history': 'history',
    'stepReference.title': 'Step type reference',
    'stepReference.searchPlaceholder': 'Search search / check / edit',
    'stepReference.empty': 'No matching step types.',
    'stepReference.reading': 'Reading and context',
    'stepReference.searching': 'Search and discovery',
    'stepReference.editing': 'Edits and changes',
    'stepReference.running': 'Command runs',
    'stepReference.checking': 'Checks and validation',
    'stepReference.browser': 'Pages and browser',
    'sessions.startMode': 'Start mode',
    'sessions.sessionValue': 'Session path or ID',
    'sessions.sessionDir': 'Session directory',
    'sessions.sessionValuePlaceholder': 'Select below, or paste a path/ID',
    'sessions.sessionDirPlaceholder': 'Pi default session directory',
    'sessions.modeDefault': 'Default',
    'sessions.modeContinue': 'Continue previous',
    'sessions.modeResume': 'Let Pi choose',
    'sessions.modeSession': 'Specific session',
    'sessions.modeSessionId': 'Exact session ID',
    'sessions.modeNone': 'No session',
    'sessions.empty': 'No local Pi sessions found.',
    'sessions.selected': 'Session selection saved for the next start.',
    'sessions.runningLocked': 'Runtime is running. Stop it before changing startup session selection.',
    'sessions.previewTitle': 'Selected session preview',
    'sessions.previewEmpty': 'This session file has no previewable messages yet.',
    'sessions.previewCount': '{count} messages total, showing the latest {shown}.',
    'sessions.newCreated': 'Requested a new Pi session.',
    'sessions.loadFailed': 'Failed to load sessions: {message}',
    'sessions.saveFailed': 'Failed to save session selection: {message}',
    'composer.placeholder': 'Send a task to the shared Pi agent',
    'placeholders.optional': 'optional',
    'placeholders.apiKey': 'Paste a key, or use $OPENAI_API_KEY',
    'help.title': 'Help',
    'help.default': 'Hover, tap, or focus a control to show its explanation here.',
    'help.language': 'Switch the UI language. The help panel and main control labels update together.',
    'help.start': 'Start the shared Pi runtime so phone and desktop connect to the same agent session.',
    'help.abort': 'Stop the shared Pi runtime without deleting configuration or history files.',
    'help.runtimeTab': 'View the shared Pi runtime status, target project, and active model.',
    'help.projectTab': 'Browse the current project file tree and preview selected files on the right.',
    'help.projectSearch': 'Enter a keyword and search within the selected scope: current preview, project file/folder names, or full project content.',
    'help.projectSearchScope': 'Choose the search scope. Current finds lines in the preview, Names finds files/folders, Content scans project text.',
    'help.projectSearchButton': 'Run the selected search. File results open on the right, and current-file results scroll to their line.',
    'help.revealCurrentFile': 'Expand parent folders in the project tree and scroll to the file currently open in the preview.',
    'help.currentFile': 'The file currently open in the preview or editor. The blue edge marks its location in the project tree.',
    'help.fileIcon': 'File type marker: js/ts are scripts, css is style, <> is HTML, {} is JSON, md is Markdown, and img/svg are images.',
    'help.folderIcon': 'Folder marker. The arrow shows whether the folder is expanded or collapsed.',
    'help.changeStatus': 'Git two-column status: left is staged, right is working tree. M means modified, A added, D deleted, R renamed, ?? untracked; MM means both staged and unstaged edits exist.',
    'help.previewMinimap': 'Preview overview bar: the left track shows code structure, the right track shows search, diff, or error positions, and the pale frame is the visible viewport.',
    'help.changesTab': 'Review current Git changes and preview file diffs on the right.',
    'help.openChangedFile': 'Open this changed project file and reveal it in the project tree.',
    'help.modelTab': 'View available Pi models and set the selected model for this agent session.',
    'help.sessionsTab': 'View local Pi session files and choose the session used the next time the runtime starts.',
    'help.configTab': 'Maintain Pi model provider settings in the browser, then reload Pi to use them.',
    'help.activityTab': 'Watch agent starts, finishes, and tool activity from the shared runtime.',
    'help.terminalOutput': 'Shows Pi requests, RPC events, and child-process stdout/stderr so blank GUI phases can be matched to real runtime progress.',
    'help.stepReference': 'See how conversation steps are grouped and labeled. Search by raw tool names or action labels.',
    'help.stepReferenceSearch': 'Enter keywords like search, check, or edit to see how they appear in the conversation.',
    'help.modelSelect': 'This list shows models that Pi discovered from the model configuration.',
    'help.setModel': 'Switch Pi agent to the model currently selected in the list.',
    'help.sessionMode': 'Choose how Pi should handle sessions on the next runtime start. Startup sessions cannot be switched while the runtime is already running.',
    'help.sessionValue': 'Used by specific-session modes. Selecting a recent session fills this with that session file path.',
    'help.sessionDir': 'Optional. Leave blank to use Pi default session storage; set it to read and resume from another session directory.',
    'help.saveSession': 'Save the session arguments for the next runtime start. It does not switch the currently running runtime.',
    'help.newSession': 'Ask the running Pi runtime to create a new session through Pi RPC; browser storage is not used.',
    'help.provider': 'Provider is the model service name, such as openai, openrouter, or a local endpoint.',
    'help.api': 'Choose the API protocol used by this provider. It must match the provider endpoint.',
    'help.baseUrl': 'Enter the API root used by the Pi/OpenAI SDK. VS Code custom endpoints may accept the site root; this field must compose directly with /chat/completions, for example https://ai.lupoapi.com/v1.',
    'help.apiKey': 'Paste an API key for the easiest setup. It is saved into Pi models.json but not echoed back in the page; you can also use an environment reference like $OPENAI_API_KEY.',
    'help.modelId': 'Enter the provider model ID that Pi should send with requests.',
    'help.modelName': 'Optional display name. It only changes the UI label, not the real model ID.',
    'help.contextWindow': 'The model context window size, used by Pi to estimate how much context can be kept.',
    'help.maxTokens': 'The maximum output token count allowed for one response.',
    'help.reasoning': 'Writes model.reasoning=true to Pi models.json. Pi uses it for supportsThinking() and OpenAI-compatible reasoning behavior.',
    'help.noDeveloperRole': 'Writes compat.supportsDeveloperRole=false. Pi openai-completions then sends system prompts as system role instead of developer role for reasoning models.',
    'help.noReasoningEffort': 'Writes compat.supportsReasoningEffort=false. Pi openai-completions then skips the reasoning_effort request field for incompatible gateways.',
    'help.saveProvider': 'Save the current provider and model settings into Pi models.json.',
    'help.deleteProvider': 'Delete the current provider configuration. Check the provider name first.',
    'help.reloadFile': 'Reload the current file from disk. This discards unsaved editor changes.',
    'help.saveFile': 'Save the editor content back to the current project file. It only writes existing files inside the project.',
    'help.previewEditor': 'Shows highlighted files, diffs, or errors. Click a regular file preview to edit in the same highlighted layer and save it.',
    'help.resizeSidebar': 'Drag this divider to resize the sidebar and give the file tree or editor more room.',
    'help.resizePreview': 'On desktop, drag this divider to resize the preview editor and agent conversation columns. On mobile, it resizes preview height.',
    'help.resizeComposer': 'Drag this divider to resize the conversation and composer areas when writing longer prompts or reading replies.',
    'help.contextPanel': 'Click or drop files and folders to add context. Added items stay here as chips.',
    'help.contextScope': 'Manage context objects added for the agent. This is not message text; the sent message still only contains what you type.',
    'help.contextAdd': 'Search and add context objects such as the current file, current diff, project files, folders, or Git changes. You can also drop project-tree items here.',
    'help.contextPicker': 'Click empty space to search and add context. Added chips can be removed one by one.',
    'help.sendMode': 'Prompt starts a new goal; Steer adds mid-run guidance; Follow-up continues the previous turn.',
    'help.messageInput': 'Type the task, steering note, or follow-up you want to send to the shared Pi agent.',
    'help.messageDraft': 'Editing an earlier user message. Sending withdraws visible content after that checkpoint and starts again with the current input.',
    'help.sendButton': 'Submit the current input to the shared Pi agent using the selected send mode.'
  }
};

const elements = {
  appShell: document.getElementById('appShell'),
  runtimeSummary: document.getElementById('runtimeSummary'),
  helpText: document.getElementById('helpText'),
  languageSelect: document.getElementById('languageSelect'),
  railButtons: Array.from(document.querySelectorAll('.rail-button')),
  tabButtons: Array.from(document.querySelectorAll('.tab-button')),
  panelSections: Array.from(document.querySelectorAll('.panel-section')),
  runtimeStatus: document.getElementById('runtimeStatus'),
  targetProject: document.getElementById('targetProject'),
  currentModel: document.getElementById('currentModel'),
  currentSession: document.getElementById('currentSession'),
  sessionForm: document.getElementById('sessionForm'),
  sessionModeSelect: document.getElementById('sessionModeSelect'),
  sessionValueInput: document.getElementById('sessionValueInput'),
  sessionDirInput: document.getElementById('sessionDirInput'),
  saveSessionSelectionButton: document.getElementById('saveSessionSelectionButton'),
  newSessionButton: document.getElementById('newSessionButton'),
  sessionStatus: document.getElementById('sessionStatus'),
  sessionsList: document.getElementById('sessionsList'),
  projectSearchForm: document.getElementById('projectSearchForm'),
  projectSearchScope: document.getElementById('projectSearchScope'),
  projectSearchInput: document.getElementById('projectSearchInput'),
  revealCurrentFileButton: document.getElementById('revealCurrentFileButton'),
  projectSearchResults: document.getElementById('projectSearchResults'),
  projectTree: document.getElementById('projectTree'),
  projectStatus: document.getElementById('projectStatus'),
  changesList: document.getElementById('changesList'),
  changesStatus: document.getElementById('changesStatus'),
  previewTitle: document.getElementById('previewTitle'),
  previewIcon: document.getElementById('previewIcon'),
  previewMeta: document.getElementById('previewMeta'),
  previewPanel: document.getElementById('previewPanel'),
  previewCode: document.getElementById('previewCode'),
  previewEditor: document.getElementById('previewEditor'),
  previewMinimap: document.getElementById('previewMinimap'),
  reloadFileButton: document.getElementById('reloadFileButton'),
  saveFileButton: document.getElementById('saveFileButton'),
  startButton: document.getElementById('startButton'),
  abortButton: document.getElementById('abortButton'),
  modelSelect: document.getElementById('modelSelect'),
  setModelButton: document.getElementById('setModelButton'),
  modelConfigForm: document.getElementById('modelConfigForm'),
  providerIdInput: document.getElementById('providerIdInput'),
  apiTypeSelect: document.getElementById('apiTypeSelect'),
  baseUrlInput: document.getElementById('baseUrlInput'),
  apiKeyInput: document.getElementById('apiKeyInput'),
  modelIdInput: document.getElementById('modelIdInput'),
  modelNameInput: document.getElementById('modelNameInput'),
  contextWindowInput: document.getElementById('contextWindowInput'),
  maxTokensInput: document.getElementById('maxTokensInput'),
  reasoningInput: document.getElementById('reasoningInput'),
  disableDeveloperRoleInput: document.getElementById('disableDeveloperRoleInput'),
  disableReasoningEffortInput: document.getElementById('disableReasoningEffortInput'),
  deleteProviderButton: document.getElementById('deleteProviderButton'),
  modelConfigStatus: document.getElementById('modelConfigStatus'),
  activityList: document.getElementById('activityList'),
  pendingEditCheckpoint: document.getElementById('pendingEditCheckpoint'),
  terminalOutput: document.getElementById('terminalOutput'),
  terminalOutputMeta: document.getElementById('terminalOutputMeta'),
  stepReferenceSearch: document.getElementById('stepReferenceSearch'),
  stepReferenceList: document.getElementById('stepReferenceList'),
  conversationNotices: document.getElementById('conversationNotices'),
  messages: document.getElementById('messages'),
  composer: document.getElementById('composer'),
  chatPanel: document.getElementById('chatPanel'),
  sidebarResizeHandle: document.getElementById('sidebarResizeHandle'),
  previewResizeHandle: document.getElementById('previewResizeHandle'),
  composerResizeHandle: document.getElementById('composerResizeHandle'),
  contextPanel: document.getElementById('contextPanel'),
  contextAddMenu: document.querySelector('.context-add-menu'),
  contextSearchInput: document.getElementById('contextSearchInput'),
  contextObjectList: document.getElementById('contextObjectList'),
  contextPicker: document.getElementById('contextPicker'),
  contextChips: document.getElementById('contextChips'),
  sendMode: document.getElementById('sendMode'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton')
};

init().catch((error) => addSystemMessage(error.message || String(error), true));

async function init() {
  updateAppViewportHeight();
  applyLanguage();
  hydrateContextChips();
  applyProviderDefaults();
  bindEvents();
  connectEvents();
  await loadRuntime();
  await loadSessions();
  await Promise.allSettled([loadProjectTree(), loadGitStatus()]);
  await loadModelConfig();
  await loadModels().catch(() => {});
  if (isRuntimeRunning()) {
    await Promise.allSettled([loadState(), loadMessages()]);
  } else {
    await loadMessages().catch(() => {});
  }
}

function updateAppViewportHeight() {
  const viewportHeight = Math.min(window.visualViewport?.height || window.innerHeight, window.innerHeight);
  if (!viewportHeight) {
    return;
  }
  document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
  clampWorkbenchSizes();
  updateContextPanelSize();
}

function clampWorkbenchSizes() {
  clampMainPanelSize();
  clampMobilePreviewSize();
  clampComposerSize();
}

function clampMainPanelSize() {
  const currentBlockSize = parseFloat(elements.appShell.style.getPropertyValue('--side-panel-size'));
  if (Number.isFinite(currentBlockSize)) {
    const { min, max } = getMainPanelBlockBounds();
    const nextSize = clamp(currentBlockSize, min, max);
    if (Math.round(nextSize) !== Math.round(currentBlockSize)) {
      elements.appShell.style.setProperty('--side-panel-size', `${Math.round(nextSize)}px`);
    }
  }

  const currentInlineSize = parseFloat(elements.appShell.style.getPropertyValue('--sidebar-size'));
  if (Number.isFinite(currentInlineSize)) {
    const { min, max } = getSidebarInlineBounds();
    const nextSize = clamp(currentInlineSize, min, max);
    if (Math.round(nextSize) !== Math.round(currentInlineSize)) {
      elements.appShell.style.setProperty('--sidebar-size', `${Math.round(nextSize)}px`);
    }
  }
}

function clampMobilePreviewSize() {
  if (!window.matchMedia('(max-width: 760px)').matches) {
    return;
  }
  const currentSize = parseFloat(elements.appShell.style.getPropertyValue('--preview-size'));
  if (!Number.isFinite(currentSize)) {
    return;
  }
  const { min, max } = getMobilePreviewBounds();
  const nextSize = clamp(currentSize, min, max);
  if (Math.round(nextSize) !== Math.round(currentSize)) {
    elements.appShell.style.setProperty('--preview-size', `${Math.round(nextSize)}px`);
  }
}

function clampComposerSize() {
  const currentSize = parseFloat(elements.appShell.style.getPropertyValue('--composer-size'));
  if (!Number.isFinite(currentSize)) {
    return;
  }
  const { min, max } = getComposerBounds();
  const nextSize = clamp(currentSize, min, max);
  if (Math.round(nextSize) !== Math.round(currentSize)) {
    elements.appShell.style.setProperty('--composer-size', `${Math.round(nextSize)}px`);
  }
  updateContextPanelSize();
}

function bindEvents() {
  window.addEventListener('resize', updateAppViewportHeight);
  window.addEventListener('orientationchange', updateAppViewportHeight);
  window.visualViewport?.addEventListener('resize', updateAppViewportHeight);
  elements.languageSelect.addEventListener('change', setLanguage);
  for (const button of elements.railButtons) {
    button.addEventListener('click', () => activatePanel(button.dataset.panelTarget));
  }
  for (const button of elements.tabButtons) {
    button.addEventListener('click', () => activatePanel(button.dataset.panelTarget));
  }
  elements.projectSearchForm.addEventListener('submit', searchProject);
  elements.projectSearchInput.addEventListener('keydown', handleProjectSearchKeydown);
  elements.projectSearchScope.addEventListener('change', updateProjectSearchPlaceholder);
  elements.revealCurrentFileButton.addEventListener('click', () => revealCurrentFileInTree({ scroll: true }));
  elements.projectSearchResults.addEventListener('click', handleSearchResultClick);
  elements.projectTree.addEventListener('click', handleProjectTreeClick);
  elements.projectTree.addEventListener('dragstart', handleProjectTreeDragStart);
  elements.changesList.addEventListener('click', handleChangesClick);
  elements.messages.addEventListener('click', handleMessageActionClick);
  elements.messages.addEventListener('click', handleEditCheckpointFileClick);
  elements.messages.addEventListener('click', handleMessagePathClick);
  elements.conversationNotices.addEventListener('click', handleMessageActionClick);
  elements.conversationNotices.addEventListener('click', handleEditCheckpointFileClick);
  elements.pendingEditCheckpoint?.addEventListener('click', handleMessageActionClick);
  elements.pendingEditCheckpoint?.addEventListener('click', handleEditCheckpointFileClick);
  elements.previewEditor.addEventListener('input', markPreviewDirty);
  elements.previewCode.addEventListener('input', markPreviewDirty);
  elements.previewCode.addEventListener('click', beginPreviewEdit);
  elements.previewCode.addEventListener('keydown', handlePreviewCodeKeydown);
  elements.previewCode.addEventListener('scroll', handlePreviewCodeScroll);
  elements.previewEditor.addEventListener('scroll', updatePreviewMinimapViewport);
  elements.previewMinimap.setAttribute('data-help', 'help.previewMinimap');
  elements.reloadFileButton.addEventListener('click', reloadCurrentFile);
  elements.saveFileButton.addEventListener('click', saveCurrentFile);
  document.addEventListener('pointerover', updateHelpFromEvent);
  document.addEventListener('focusin', updateHelpFromEvent);
  document.addEventListener('click', updateHelpFromEvent);
  document.addEventListener('input', updateHelpFromEvent);
  document.addEventListener('change', updateHelpFromEvent);
  document.addEventListener('keydown', updateHelpFromEvent);
  elements.startButton.addEventListener('click', startRuntime);
  elements.abortButton.addEventListener('click', abortRuntime);
  elements.sessionForm.addEventListener('submit', saveSessionSelection);
  elements.saveSessionSelectionButton.addEventListener('click', saveSessionSelection);
  elements.newSessionButton.addEventListener('click', createNewSession);
  elements.sessionsList.addEventListener('click', handleSessionListClick);
  elements.setModelButton.addEventListener('click', setModel);
  elements.modelConfigForm.addEventListener('submit', saveModelConfig);
  elements.providerIdInput.addEventListener('change', fillProviderFromConfig);
  elements.deleteProviderButton.addEventListener('click', deleteProviderConfig);
  elements.contextPicker.addEventListener('pointerdown', openContextAddMenuFromPicker);
  elements.contextPicker.addEventListener('keydown', handleContextPickerKeydown);
  elements.contextSearchInput.addEventListener('input', renderContextObjectList);
  elements.stepReferenceSearch.addEventListener('input', handleStepReferenceSearch);
  elements.contextAddMenu.addEventListener('click', handleContextAddMenuClick);
  elements.contextChips.addEventListener('pointerdown', handleContextChipPointerDown);
  elements.contextPanel.addEventListener('dragover', handleContextDragOver);
  elements.contextPanel.addEventListener('dragleave', handleContextDragLeave);
  elements.contextPanel.addEventListener('drop', handleContextDrop);
  document.addEventListener('click', closeContextAddMenuFromOutside);
  elements.composer.addEventListener('submit', sendMessage);
  bindResizeHandle(elements.sidebarResizeHandle, resizeSidebar);
  bindResizeHandle(elements.previewResizeHandle, resizePreview);
  bindResizeHandle(elements.composerResizeHandle, resizeComposer);
}

function connectEvents() {
  const source = new EventSource('/events');
  source.addEventListener('runtime:status', (event) => {
    if (!state.runtime) {
      state.runtime = { pi: JSON.parse(event.data) };
    } else {
      state.runtime.pi = JSON.parse(event.data);
    }
    renderRuntime();
  });
  source.addEventListener('runtime:terminal', (event) => appendTerminalOutput(JSON.parse(event.data)));
  source.addEventListener('runtime:error', (event) => addSystemMessage(JSON.parse(event.data).message, true));
  source.addEventListener('pi:event', (event) => handlePiEvent(JSON.parse(event.data)));
}

async function loadRuntime() {
  state.runtime = await api('/api/runtime');
  state.terminalOutput = Array.isArray(state.runtime.terminalOutput) ? state.runtime.terminalOutput.slice(-300) : [];
  if (!state.terminalOutput.length) {
    appendTerminalOutput({ stream: 'trace', text: t('runtime.traceReady') });
  }
  renderRuntime();
  renderTerminalOutput();
}

async function loadSessions() {
  try {
    state.sessionInfo = await api('/api/sessions');
    renderSessions();
  } catch (error) {
    elements.sessionStatus.textContent = t('sessions.loadFailed', { message: error.message || String(error) });
  }
}

async function startRuntime() {
  try {
    appendTerminalOutput({ stream: 'trace', text: '[runtime] start requested from GUI' });
    await api('/api/runtime/start', { method: 'POST' });
    await loadRuntime();
    await Promise.allSettled([loadState(), loadModels(), loadMessages(), loadSessions()]);
  } catch (error) {
    addSystemMessage(error.message || String(error), true);
  }
}

async function saveSessionSelection(event) {
  event.preventDefault();
  const mode = elements.sessionModeSelect.value;
  const value = elements.sessionValueInput.value.trim();
  const payload = {
    mode,
    session: mode === 'session' ? value : '',
    sessionId: mode === 'session-id' ? value : '',
    sessionDir: elements.sessionDirInput.value.trim()
  };
  try {
    const result = await api('/api/sessions/selection', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    state.sessionInfo = { ...(state.sessionInfo || {}), selected: result.session };
    elements.sessionStatus.textContent = t('sessions.selected');
    await Promise.allSettled([loadRuntime(), loadSessions(), loadMessages()]);
  } catch (error) {
    elements.sessionStatus.textContent = t('sessions.saveFailed', { message: error.message || String(error) });
  }
}

async function createNewSession() {
  try {
    await api('/api/sessions', { method: 'POST' });
    elements.sessionStatus.textContent = t('sessions.newCreated');
    await Promise.allSettled([loadRuntime(), loadMessages(), loadSessions()]);
  } catch (error) {
    elements.sessionStatus.textContent = t('sessions.saveFailed', { message: error.message || String(error) });
  }
}

function handleSessionListClick(event) {
  const button = event.target.closest('[data-session-file]');
  if (!button) {
    return;
  }
  elements.sessionModeSelect.value = 'session';
  elements.sessionValueInput.value = button.dataset.sessionFile;
  state.sessionInfo = {
    ...(state.sessionInfo || {}),
    selected: {
      mode: 'session',
      session: button.dataset.sessionFile,
      sessionId: null,
      sessionDir: elements.sessionDirInput.value.trim() || null,
      resume: false,
      continue: false,
      noSession: false
    }
  };
  elements.sessionStatus.textContent = '';
  renderSessions();
  loadMessages({ session: button.dataset.sessionFile }).catch((error) => addSystemMessage(error.message || String(error), true));
}

async function abortRuntime() {
  try {
    await api('/api/runtime/stop', { method: 'POST' });
    state.activeAssistant = null;
    state.agentStatus = '';
    state.tools.clear();
    addActivity('runtime', t('messages.runtimeStopped'));
    await Promise.allSettled([loadRuntime(), loadSessions(), loadMessages({ preserveScroll: true })]);
  } catch (error) {
    addSystemMessage(t('messages.runtimeStopFailed', { message: error.message || String(error) }), true, { preserveScroll: true });
    await loadRuntime().catch(() => {});
  }
}

async function loadState() {
  const data = await api('/api/state');
  const model = data.model;
  elements.currentModel.textContent = model ? `${model.provider}/${model.id}` : '-';
}

async function loadModels() {
  const data = await api('/api/models');
  state.models = data.models || [];
  if (!state.models.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = t('models.none');
    elements.modelSelect.replaceChildren(option);
    updateModelControls();
    return;
  }
  elements.modelSelect.replaceChildren(...state.models.map((model) => {
    const option = document.createElement('option');
    option.value = `${model.provider}\u0000${model.id}`;
    option.textContent = model.name ? `${model.name} (${model.provider})` : `${model.provider}/${model.id}`;
    return option;
  }));
  updateModelControls();
}

async function loadModelConfig() {
  state.modelConfig = await api('/api/model-config');
  elements.modelConfigStatus.textContent = state.modelConfig.path ? t('messages.configPath', { path: state.modelConfig.path }) : '';
  hydrateModelConfigForm();
}

async function loadProjectTree() {
  try {
    state.projectTree = await api('/api/project/tree');
    renderProjectTree();
  } catch (error) {
    elements.projectStatus.textContent = error.message || String(error);
  }
}

async function loadGitStatus() {
  try {
    state.gitStatus = await api('/api/git/status');
    await refreshEditCheckpointNotice();
    renderGitStatus();
    updateContextDisplay();
    syncIdeState();
  } catch (error) {
    elements.changesStatus.textContent = error.message || String(error);
  }
}

async function searchProject(event) {
  event.preventDefault();
  const query = elements.projectSearchInput.value.trim();
  if (query.length < 2) {
    state.searchResults = { results: [], truncated: false };
    elements.projectSearchResults.textContent = t('project.searchHint');
    return;
  }
  const scope = elements.projectSearchScope.value;
  state.activeSearchHit = null;
  try {
    if (scope === 'current') {
      state.searchResults = searchCurrentFile(query);
    } else {
      state.searchResults = await api(`/api/project/search?q=${encodeURIComponent(query)}&scope=${encodeURIComponent(scope)}`);
    }
    renderSearchResults();
  } catch (error) {
    elements.projectSearchResults.textContent = error.message || String(error);
  }
}

function searchCurrentFile(query) {
  if (!state.currentFile || state.previewMode !== 'file') {
    return { scope: 'current', query, results: [], truncated: false, message: t('project.searchNeedFile') };
  }
  const lowerQuery = query.toLowerCase();
  const lines = String(getPreviewText() || state.currentFile.content || '').split('\n');
  const results = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].toLowerCase().includes(lowerQuery)) {
      results.push({ path: state.currentFile.path, type: 'current', line: index + 1, preview: createSearchPreviewSnippet(lines[index], query) || state.currentFile.path });
    }
    if (results.length >= 80) {
      return { scope: 'current', query, results, truncated: true };
    }
  }
  return { scope: 'current', query, results, truncated: false };
}

function handleProjectSearchKeydown(event) {
  if (event.key !== 'Enter' || event.isComposing) {
    return;
  }
  event.preventDefault();
  elements.projectSearchForm.requestSubmit();
}

async function handleSearchResultClick(event) {
  const folderButton = event.target.closest('[data-folder-path]');
  if (folderButton) {
    expandFoldersForPath(folderButton.dataset.folderPath);
    renderProjectTree();
    scrollTreePathIntoView(folderButton.dataset.folderPath, 'folder');
    return;
  }
  const button = event.target.closest('[data-file-path]');
  if (button) {
    await openProjectFile(button.dataset.filePath, getSearchTargetFromElement(button));
    return;
  }
  const lineButton = event.target.closest('[data-result-line]');
  if (lineButton) {
    focusSearchHit(getSearchTargetFromElement(lineButton));
    return;
  }
}

function getSearchTargetFromElement(element) {
  const line = Number(element.dataset.resultLine || 0);
  return {
    query: element.dataset.searchQuery || '',
    line: Number.isFinite(line) && line > 0 ? line : null
  };
}

function focusSearchHit(target) {
  state.activeSearchHit = target && target.query ? target : null;
  if (state.currentFile && state.previewMode === 'file') {
    renderPreviewContent(getPreviewText() || state.currentFile.content || '', state.currentFile.path, 'file');
  }
  if (target && target.line) {
    requestAnimationFrame(() => scrollPreviewToLine(target.line));
  }
}

async function handleProjectTreeClick(event) {
  const folderButton = event.target.closest('[data-folder-path]');
  if (folderButton) {
    toggleFolder(folderButton.dataset.folderPath);
    return;
  }
  const button = event.target.closest('[data-file-path]');
  if (!button) {
    return;
  }
  await openProjectFile(button.dataset.filePath);
}

async function openProjectFile(filePath, searchTarget = null, options = {}) {
  if (!options.skipDirtyConfirm && !confirmDiscardPreviewChanges()) {
    return;
  }
  try {
    const file = await api(`/api/project/file?path=${encodeURIComponent(filePath)}`);
    state.activeSearchHit = searchTarget && searchTarget.query ? searchTarget : null;
    showEditableFile(file);
    if (searchTarget && searchTarget.line) {
      requestAnimationFrame(() => scrollPreviewToLine(searchTarget.line));
    }
  } catch (error) {
    showPreviewError(error);
  }
}

async function handleChangesClick(event) {
  const openButton = event.target.closest('[data-change-open-path]');
  if (openButton) {
    activatePanel('projectPanel');
    await openProjectFile(openButton.dataset.changeOpenPath);
    return;
  }
  const button = event.target.closest('[data-change-path]');
  if (!button) {
    return;
  }
  if (!confirmDiscardPreviewChanges()) {
    return;
  }
  try {
    const diff = await api(`/api/git/diff?path=${encodeURIComponent(button.dataset.changePath)}`);
    setPreviewActive(true);
    state.currentFile = null;
    state.activeChangePath = normalizeGitPath(diff.path || button.dataset.changePath);
    state.previewMode = 'diff';
    state.previewEditing = false;
    state.previewDirty = false;
    state.previewSaveState = 'idle';
    state.previewSaveError = '';
    elements.previewTitle.textContent = diff.path;
    elements.previewMeta.textContent = t('preview.diffMeta', { path: diff.path });
    setPreviewIcon(diff.path);
    renderPreviewContent(diff.diff || t('changes.empty'), diff.path, 'diff');
    renderGitStatus();
    updatePreviewActions();
    updateContextDisplay();
    syncIdeState();
  } catch (error) {
    showPreviewError(error);
  }
}

async function handleMessagePathClick(event) {
  const button = event.target.closest('[data-message-path]');
  if (!button) {
    return;
  }
  if (button.dataset.editCheckpointPath) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  activatePanel('projectPanel');
  if (button.dataset.messagePathType === 'folder') {
    revealProjectFolderInTree(button.dataset.messagePath, { scroll: true });
    return;
  }
  const line = parseMessagePathLine(button.dataset.messagePathLine);
  await openProjectFile(button.dataset.messagePath, line ? { line, query: '' } : null);
}

async function handleEditCheckpointFileClick(event) {
  const button = event.target.closest('[data-edit-checkpoint-path]');
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  if (!confirmDiscardPreviewChanges()) {
    return;
  }
  const checkpointId = button.dataset.editCheckpointId;
  const filePath = button.dataset.editCheckpointPath;
  try {
    const diff = await api(`/api/edit-checkpoints/${encodeURIComponent(checkpointId)}/diff?path=${encodeURIComponent(filePath)}`);
    setPreviewActive(true);
    activatePanel('projectPanel');
    state.currentFile = null;
    state.activeChangePath = normalizeGitPath(diff.path || filePath);
    state.activeEditCheckpointPreview = { checkpointId, path: state.activeChangePath };
    state.previewMode = 'diff';
    state.previewEditing = false;
    state.previewDirty = false;
    state.previewSaveState = 'idle';
    state.previewSaveError = '';
    elements.previewTitle.textContent = diff.path;
    elements.previewMeta.textContent = t('preview.editDiffMeta', { path: diff.path });
    setPreviewIcon(diff.path);
    renderPreviewContent(diff.diff || t('changes.empty'), diff.path, 'diff');
    renderGitStatus();
    updatePreviewActions();
    updateContextDisplay();
    syncIdeState();
  } catch (error) {
    showPreviewError(error);
  }
}

function parseMessagePathLine(text) {
  const match = String(text || '').match(/^#L(\d+)/);
  return match ? Number(match[1]) : null;
}

async function reloadCurrentFile() {
  if (!state.currentFile) {
    return;
  }
  if (!confirmDiscardPreviewChanges()) {
    return;
  }
  await openProjectFile(state.currentFile.path, null, { skipDirtyConfirm: true });
}

async function saveCurrentFile() {
  if (!state.currentFile || state.previewMode !== 'file') {
    return;
  }
  if (state.previewSaveState === 'saving') {
    return;
  }
  const targetPath = state.currentFile.path;
  const savedContent = getPreviewText();
  state.previewSaveState = 'saving';
  state.previewSaveError = '';
  updatePreviewMeta();
  updatePreviewActions();
  try {
    const result = await api(`/api/project/file?path=${encodeURIComponent(targetPath)}`, {
      method: 'PUT',
      body: JSON.stringify({ content: savedContent })
    });
    state.currentFile = { ...state.currentFile, size: result.size, content: savedContent, truncated: false };
    state.previewEditing = false;
    state.previewDirty = false;
    state.previewSaveState = 'saved';
    state.previewSaveError = '';
    renderPreviewContent(savedContent, state.currentFile.path, 'file');
    updatePreviewMeta();
    updatePreviewActions();
    updateContextDisplay();
    syncIdeState();
    await refreshProjectFileStateAfterSave(targetPath);
    await refreshEditCheckpointNotice({ createIfMissing: true });
  } catch (error) {
    state.previewSaveState = 'error';
    state.previewSaveError = error.message || String(error);
    state.previewDirty = true;
    state.previewEditing = true;
    syncPreviewClass();
    updatePreviewMeta();
    updatePreviewActions();
    addSystemMessage(state.previewSaveError, true);
  }
}

function markPreviewDirty() {
  if (state.previewMode !== 'file') {
    return;
  }
  state.previewEditing = true;
  state.previewDirty = true;
  state.previewSaveState = 'idle';
  state.previewSaveError = '';
  syncPreviewClass();
  schedulePreviewHighlightRefresh();
  updatePreviewMeta();
  updatePreviewActions();
  updateContextDisplay();
  syncIdeState({ delay: 400 });
}

async function saveModelConfig(event) {
  event.preventDefault();
  applyModelTokenDefaults();
  const payload = {
    providerId: elements.providerIdInput.value,
    api: elements.apiTypeSelect.value,
    baseUrl: elements.baseUrlInput.value,
    apiKey: elements.apiKeyInput.value,
    modelId: elements.modelIdInput.value,
    modelName: elements.modelNameInput.value,
    contextWindow: elements.contextWindowInput.value || DEFAULT_MODEL_CONTEXT_WINDOW,
    maxTokens: elements.maxTokensInput.value || DEFAULT_MODEL_MAX_TOKENS,
    reasoning: elements.reasoningInput.checked,
    disableDeveloperRole: elements.disableDeveloperRoleInput.checked,
    disableReasoningEffort: elements.disableReasoningEffortInput.checked
  };
  try {
    state.modelConfig = await api('/api/model-config/providers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    elements.apiKeyInput.value = payload.apiKey.startsWith('$') ? payload.apiKey : '';
    elements.modelConfigStatus.textContent = t('messages.saved');
    await loadModels().catch(() => {});
  } catch (error) {
    elements.modelConfigStatus.textContent = error.message || String(error);
  }
}

async function deleteProviderConfig() {
  const providerId = elements.providerIdInput.value.trim();
  if (!providerId) {
    elements.modelConfigStatus.textContent = t('messages.providerRequired');
    return;
  }
  try {
    state.modelConfig = await api(`/api/model-config/providers/${encodeURIComponent(providerId)}`, {
      method: 'DELETE'
    });
    elements.modelConfigForm.reset();
    applyProviderDefaults();
    elements.modelConfigStatus.textContent = t('messages.deleted');
    await loadModels().catch(() => {});
  } catch (error) {
    elements.modelConfigStatus.textContent = error.message || String(error);
  }
}

function fillProviderFromConfig() {
  const provider = state.modelConfig && state.modelConfig.providers
    ? state.modelConfig.providers[elements.providerIdInput.value.trim()]
    : null;
  if (!provider) {
    return;
  }
  const firstModel = Array.isArray(provider.models) ? provider.models[0] : null;
  elements.apiTypeSelect.value = provider.api || 'openai-completions';
  elements.baseUrlInput.value = provider.baseUrl || '';
  elements.apiKeyInput.value = provider.apiKey && String(provider.apiKey).startsWith('$') ? provider.apiKey : '';
  elements.modelIdInput.value = firstModel ? firstModel.id || '' : '';
  elements.modelNameInput.value = firstModel ? firstModel.name || '' : '';
  elements.contextWindowInput.value = firstModel && firstModel.contextWindow ? firstModel.contextWindow : DEFAULT_MODEL_CONTEXT_WINDOW;
  elements.maxTokensInput.value = firstModel && firstModel.maxTokens ? firstModel.maxTokens : DEFAULT_MODEL_MAX_TOKENS;
  elements.reasoningInput.checked = Boolean(firstModel && firstModel.reasoning);
  elements.disableDeveloperRoleInput.checked = Boolean(provider.compat && provider.compat.supportsDeveloperRole === false);
  elements.disableReasoningEffortInput.checked = Boolean(provider.compat && provider.compat.supportsReasoningEffort === false);
  updateSavedApiKeyHint(provider);
}

function hydrateModelConfigForm() {
  if (!state.modelConfig || !state.modelConfig.providers) {
    applyProviderDefaults();
    return;
  }
  const providers = state.modelConfig.providers;
  const currentProviderId = elements.providerIdInput.value.trim();
  const providerId = providers[currentProviderId]
    ? currentProviderId
    : providers[DEFAULT_PROVIDER_ID]
      ? DEFAULT_PROVIDER_ID
      : Object.keys(providers)[0];
  if (!providerId) {
    applyProviderDefaults();
    return;
  }
  elements.providerIdInput.value = providerId;
  fillProviderFromConfig();
}

function updateSavedApiKeyHint(provider) {
  if (provider && provider.hasLiteralApiKey) {
    elements.apiKeyInput.placeholder = t('placeholders.savedApiKey');
    elements.modelConfigStatus.textContent = t('messages.loadedSavedKey');
  } else {
    elements.apiKeyInput.placeholder = t('placeholders.apiKey');
  }
}

function applyModelTokenDefaults() {
  if (!elements.contextWindowInput.value) {
    elements.contextWindowInput.value = DEFAULT_MODEL_CONTEXT_WINDOW;
  }
  if (!elements.maxTokensInput.value) {
    elements.maxTokensInput.value = DEFAULT_MODEL_MAX_TOKENS;
  }
}

function applyProviderDefaults() {
  if (!elements.providerIdInput.value) {
    elements.providerIdInput.value = DEFAULT_PROVIDER_ID;
  }
  if (!elements.baseUrlInput.value) {
    elements.baseUrlInput.value = DEFAULT_PROVIDER_BASE_URL;
  }
  if (!elements.modelIdInput.value) {
    elements.modelIdInput.value = DEFAULT_PROVIDER_MODEL_ID;
  }
  if (!elements.modelNameInput.value) {
    elements.modelNameInput.value = DEFAULT_PROVIDER_MODEL_NAME;
  }
  applyModelTokenDefaults();
  elements.reasoningInput.checked = true;
  elements.disableDeveloperRoleInput.checked = true;
  elements.disableReasoningEffortInput.checked = true;
}

async function loadMessages(options = {}) {
  const query = options.session ? `?session=${encodeURIComponent(options.session)}` : '';
  const firstLoad = !state.messagesLoadedOnce;
  const data = await api(`/api/messages${query}`);
  const loadedMessages = Array.isArray(data.messages) ? data.messages : [];
  if (options.session || options.forceReload) {
    state.messageDraft = null;
    state.messageBranch = null;
  }
  const nextMessages = shouldPreserveMessageDraftView(options) ? state.messages : applyMessageBranch(loadedMessages);
  state.messages = mergeLoadedMessagesWithActiveAssistant(nextMessages);
  state.historyActivities = Array.isArray(data.activities) ? data.activities : deriveActivitiesFromMessages(state.messages);
  state.messageSource = data.source || '';
  state.messagesReadOnly = Boolean(data.readOnly);
  state.messagesTruncated = Boolean(data.truncated);
  state.messagesLoadedOnce = true;
  renderMessages({
    preserveScroll: options.preserveScroll !== false && !firstLoad,
    stickToBottom: Boolean(options.stickToBottom || (firstLoad && state.messages.length))
  });
  renderActivity();
}

function shouldPreserveMessageDraftView(options = {}) {
  return Boolean(state.messageDraft && !options.session && !options.forceReload);
}

function applyMessageBranch(loadedMessages) {
  if (!state.messageBranch || !Array.isArray(state.messageBranch.baseMessages)) {
    return loadedMessages;
  }
  const nextMessages = loadedMessages.slice(state.messageBranch.cutIndex);
  const localMessages = Array.isArray(state.messageBranch.localMessages)
    ? state.messageBranch.localMessages.filter((message) => !nextMessages.some((nextMessage) => isSameVisibleMessage(message, nextMessage)))
    : [];
  return [...state.messageBranch.baseMessages, ...localMessages, ...nextMessages];
}

function isSameVisibleMessage(left, right) {
  return normalizeMessageRole(left && left.role) === normalizeMessageRole(right && right.role) && getMessageText(left).trim() === getMessageText(right).trim();
}

function mergeLoadedMessagesWithActiveAssistant(loadedMessages) {
  if (!state.activeAssistant || !state.activeAssistant.inProgress) {
    state.activeAssistant = null;
    return loadedMessages;
  }
  const stableMessages = loadedMessages.filter((message) => normalizeMessageRole(message.role) !== 'assistant' || hasAssistantVisibleOutput(message) || message.inProgress || message.error);
  const hasRecentAssistant = stableMessages.some((message) => normalizeMessageRole(message.role) === 'assistant' && hasAssistantVisibleOutput(message));
  if (hasRecentAssistant) {
    state.activeAssistant = null;
    return stableMessages;
  }
  return [...stableMessages, state.activeAssistant];
}

async function setModel() {
  const [provider, modelId] = elements.modelSelect.value.split('\u0000');
  if (!provider || !modelId) {
    return;
  }
  try {
    await api('/api/model', {
      method: 'POST',
      body: JSON.stringify({ provider, modelId })
    });
    elements.modelConfigStatus.textContent = t('messages.modelSet', { model: `${provider}/${modelId}` });
    await Promise.allSettled([loadState(), loadModels()]);
  } catch (error) {
    const message = t('messages.modelSetFailed', { message: error.message || String(error) });
    elements.modelConfigStatus.textContent = message;
    addSystemMessage(message, true);
  }
}

async function sendMessage(event) {
  event.preventDefault();
  const message = elements.messageInput.value.trim();
  if (!message) {
    return;
  }
  const mode = elements.sendMode.value;
  const endpoint = getSendModeEndpoint(mode);
  if (!endpoint) {
    addSystemMessage(`Unknown send mode: ${mode}`, true);
    return;
  }
  const messageEditCheckpoint = await ensureEditCheckpoint({ prompt: message });
  rememberMessageEditCheckpoint(message, messageEditCheckpoint && messageEditCheckpoint.id);
  await applyMessageDraftBeforeSend(message);
  const optimisticMessage = addMessage({ role: 'user', content: message, timestamp: new Date().toISOString(), editCheckpointId: messageEditCheckpoint && messageEditCheckpoint.id }, { stickToBottom: true });
  trackBranchLocalMessage(optimisticMessage);
  beginActiveAssistantMessage(t('messages.statusGenerating'));
  elements.messageInput.value = '';
  try {
    await api(endpoint, {
      method: 'POST',
      body: JSON.stringify({ message })
    });
  } catch (error) {
    const failed = t('messages.statusFailed', { message: error.message || String(error) });
    optimisticMessage.status = failed;
    failActiveAssistantMessage(failed);
    addSystemMessage(failed, true);
    elements.messageInput.value = message;
    scheduleRenderMessages();
  }
}

function getSendModeEndpoint(mode) {
  return {
    prompt: '/api/prompt',
    steer: '/api/steer',
    'follow-up': '/api/follow-up'
  }[mode] || '';
}

async function handleMessageActionClick(event) {
  const acceptEditsButton = event.target.closest('[data-accept-edit-checkpoint]');
  if (acceptEditsButton) {
    await acceptEditCheckpoint();
    return;
  }
  const restoreEditsButton = event.target.closest('[data-restore-edit-checkpoint]');
  if (restoreEditsButton) {
    await restoreEditCheckpoint();
    return;
  }
  const copyButton = event.target.closest('[data-message-copy]');
  if (copyButton) {
    await copyMessage(Number(copyButton.dataset.messageCopy));
    return;
  }
  const checkpointButton = event.target.closest('[data-message-checkpoint]');
  if (checkpointButton) {
    await beginMessageCheckpoint(Number(checkpointButton.dataset.messageCheckpoint), { mode: 'checkpoint', confirm: false });
    return;
  }
  const editButton = event.target.closest('[data-message-edit]');
  if (editButton) {
    await beginMessageCheckpoint(Number(editButton.dataset.messageEdit), { mode: 'edit', confirm: true });
    return;
  }
  const cancelButton = event.target.closest('[data-cancel-message-draft]');
  if (cancelButton) {
    await cancelMessageDraft();
  }
}

async function beginMessageCheckpoint(messageIndex, options = {}) {
  const message = state.messages[messageIndex];
  if (!canEditFromMessage(message)) {
    addSystemMessage(t('messages.checkpointReadOnly'), true, { preserveScroll: true });
    return;
  }
  if (options.confirm && !window.confirm(t('messages.checkpointFileConfirm'))) {
    return;
  }
  if (isAssistantGenerating()) {
    if (!window.confirm(t('messages.checkpointRunningConfirm'))) {
      return;
    }
    await abortAgentReply();
  }
  const text = getUserMessageText(message).trim();
  const checkpointId = getMessageEditCheckpointId(message);
  const editCheckpoint = checkpointId
    ? { id: checkpointId }
    : await ensureEditCheckpoint({ messageId: getMessageId(message, messageIndex), prompt: text });
  const editMode = options.mode === 'edit';
  const sourceIndex = editMode ? messageIndex : messageIndex + 1;
  state.messageDraft = {
    mode: editMode ? 'edit' : 'checkpoint',
    sourceIndex,
    originalLength: getMessageDraftOriginalLength(),
    originalText: text,
    messageId: getMessageId(message, messageIndex),
    editCheckpointId: editCheckpoint && editCheckpoint.id
  };
  elements.messageInput.value = editMode ? text : '';
  elements.sendMode.value = 'prompt';
  trimMessagesAfterCheckpoint(messageIndex);
  scheduleRenderMessages({ stickToBottom: true });
  elements.messageInput.focus();
  addSystemMessage(t(editMode ? 'messages.editingCheckpoint' : 'messages.checkpointReady'), false, { stickToBottom: true });
}

function getMessageDraftOriginalLength() {
  return Math.max(state.messageDraft && state.messageDraft.originalLength || 0, state.messages.length);
}

async function applyMessageDraftBeforeSend(message) {
  if (!state.messageDraft) {
    return;
  }
  if (state.messageDraft.editCheckpointId) {
    await restoreEditCheckpoint(state.messageDraft.editCheckpointId, { keepNotice: false, silent: true });
  }
  const sourceIndex = Math.max(0, Math.min(state.messageDraft.sourceIndex, state.messages.length));
  const baseMessages = state.messages.slice(0, sourceIndex);
  state.messages.splice(sourceIndex);
  state.messageBranch = {
    cutIndex: state.messageDraft.originalLength || sourceIndex,
    baseMessages,
    localMessages: [],
    editCheckpointId: state.messageDraft.editCheckpointId || ''
  };
  state.activeAssistant = null;
  state.agentStatus = '';
  state.tools.clear();
  state.messageDraft = null;
  addActivity('checkpoint', message);
}

async function cancelMessageDraft() {
  state.messageDraft = null;
  state.messageBranch = null;
  elements.messageInput.value = '';
  await loadMessages({ forceReload: true, preserveScroll: true });
  addSystemMessage(t('messages.cancelEdit'), false, { preserveScroll: true });
}

function trimMessagesAfterCheckpoint(messageIndex) {
  state.messages.splice(messageIndex + 1);
  state.activeAssistant = null;
  state.agentStatus = '';
  state.tools.clear();
}

async function ensureEditCheckpoint(options = {}) {
  if (state.editCheckpoint && state.editCheckpoint.id && !state.editCheckpoint.accepted) {
    return state.editCheckpoint;
  }
  try {
    state.editCheckpoint = await api('/api/edit-checkpoints', {
      method: 'POST',
      body: JSON.stringify({ messageId: options.messageId || '', prompt: options.prompt || '' })
    });
    return state.editCheckpoint;
  } catch (error) {
    addSystemMessage(t('messages.editCheckpointFailed', { message: error.message || String(error) }), true, { preserveScroll: true });
    return null;
  }
}

function rememberMessageEditCheckpoint(message, checkpointId) {
  const key = getMessageCheckpointKey(message);
  if (!key || !checkpointId) {
    return;
  }
  state.editCheckpointByMessage[key] = checkpointId;
}

function getMessageEditCheckpointId(message) {
  return message && message.editCheckpointId || state.editCheckpointByMessage[getMessageCheckpointKey(message)] || '';
}

function getMessageCheckpointKey(message) {
  const text = typeof message === 'string' ? message : getUserMessageText(message);
  return String(text || '').trim().slice(0, 1000);
}

async function refreshEditCheckpointNotice(options = {}) {
  const checkpoint = options.createIfMissing ? await ensureEditCheckpoint(options) : state.editCheckpoint;
  if (!checkpoint || !checkpoint.id) {
    return;
  }
  try {
    state.editCheckpoint = await api(`/api/edit-checkpoints/${encodeURIComponent(checkpoint.id)}`);
    scheduleRenderMessages({ preserveScroll: true });
    scheduleRenderActivity();
  } catch (error) {
    addSystemMessage(t('messages.editCheckpointFailed', { message: error.message || String(error) }), true, { preserveScroll: true });
  }
}

async function acceptEditCheckpoint() {
  if (!state.editCheckpoint || !state.editCheckpoint.id) {
    return;
  }
  try {
    const checkpointId = state.editCheckpoint.id;
    await api(`/api/edit-checkpoints/${encodeURIComponent(state.editCheckpoint.id)}/accept`, { method: 'POST' });
    clearEditCheckpointPreview(checkpointId);
    state.editCheckpoint = null;
    addSystemMessage(t('messages.editCheckpointAccepted'), false, { preserveScroll: true });
    scheduleRenderMessages({ preserveScroll: true });
    scheduleRenderActivity();
  } catch (error) {
    addSystemMessage(t('messages.editCheckpointFailed', { message: error.message || String(error) }), true, { preserveScroll: true });
  }
}

async function restoreEditCheckpoint(checkpointId = '', options = {}) {
  const targetId = checkpointId || (state.editCheckpoint && state.editCheckpoint.id);
  if (!targetId) {
    return;
  }
  try {
    const result = await api(`/api/edit-checkpoints/${encodeURIComponent(targetId)}/restore`, { method: 'POST' });
    const restoredCount = Array.isArray(result.restored) ? result.restored.length : 0;
    const skippedCount = Array.isArray(result.skipped) ? result.skipped.length : 0;
    if (!options.keepNotice || targetId === (state.editCheckpoint && state.editCheckpoint.id)) {
      clearEditCheckpointPreview(targetId);
      state.editCheckpoint = null;
    }
    await Promise.allSettled([loadGitStatus(), state.currentFile ? reloadCurrentFileAfterExternalChange() : Promise.resolve()]);
    if (!options.silent) {
      addSystemMessage(t('messages.editCheckpointRestored', { count: restoredCount }), false, { preserveScroll: true });
    }
    if (skippedCount) {
      addSystemMessage(t('messages.editCheckpointSkipped', { count: skippedCount }), true, { preserveScroll: true });
    }
    scheduleRenderActivity();
  } catch (error) {
    addSystemMessage(t('messages.editCheckpointFailed', { message: error.message || String(error) }), true, { preserveScroll: true });
  }
}

async function reloadCurrentFileAfterExternalChange() {
  if (!state.currentFile || state.previewDirty) {
    return;
  }
  await openProjectFile(state.currentFile.path, null, { skipDirtyConfirm: true });
}

function canEditFromMessage(message) {
  return normalizeMessageRole(message && message.role) === 'user' && !state.messagesReadOnly && !message.sessionHistory;
}

function getUserMessageText(message) {
  return typeof message.content === 'string' ? message.content : getMessageText(message);
}

function trackBranchLocalMessage(message) {
  if (!state.messageBranch) {
    return;
  }
  state.messageBranch.localMessages = [...(state.messageBranch.localMessages || []), message];
}

async function abortAgentReply() {
  await api('/api/abort', { method: 'POST' });
  failActiveAssistantMessage(t('messages.runtimeStopped'));
}

function isAssistantGenerating() {
  return Boolean(state.activeAssistant && state.activeAssistant.inProgress);
}

async function copyMessage(messageIndex) {
  const message = state.messages[messageIndex];
  const text = getMessageText(message).trim();
  if (!text) {
    return;
  }
  try {
    await writeClipboard(text);
    state.copiedMessageId = getMessageId(message, messageIndex);
    renderMessages({ preserveScroll: true });
    window.setTimeout(() => {
      if (state.copiedMessageId === getMessageId(message, messageIndex)) {
        state.copiedMessageId = '';
        renderMessages({ preserveScroll: true });
      }
    }, 1400);
  } catch (error) {
    addActivity('copy', t('messages.copyFailed'));
  }
}

async function writeClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.append(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

function updateContextDisplay(options = {}) {
  if (options.renderTree !== false) {
    renderProjectTree();
  }
  renderContextObjectList();
  renderContextChips();
  updateContextPanelSize();
}

function updateContextPanelSize() {
  const composer = elements.composer;
  const picker = elements.contextPicker;
  const chips = elements.contextChips;
  if (!composer || !picker || !chips) {
    return;
  }
  const composerStyle = getComputedStyle(composer);
  const pickerStyle = getComputedStyle(picker);
  const minSize = toPixels(composerStyle.getPropertyValue('--composer-context-min-size'));
  const messageMinSize = toPixels(composerStyle.getPropertyValue('--message-input-min-size'));
  const composerBlockPadding = toPixels(composerStyle.paddingTop) + toPixels(composerStyle.paddingBottom);
  const pickerBlockExtras = toPixels(pickerStyle.paddingTop) + toPixels(pickerStyle.paddingBottom) + toPixels(pickerStyle.borderTopWidth) + toPixels(pickerStyle.borderBottomWidth);
  const rowGap = toPixels(composerStyle.rowGap);
  const contentSize = Math.max(minSize, chips.scrollHeight + pickerBlockExtras);
  const rowsSize = Math.max(minSize + messageMinSize, composer.clientHeight - composerBlockPadding - rowGap);
  const sharedSize = Math.max(minSize, (rowsSize - minSize - messageMinSize) / 2 + minSize);
  composer.style.setProperty('--context-panel-size', `${Math.round(Math.min(contentSize, sharedSize))}px`);
}

function hydrateContextChips() {
  state.contextChips = normalizeContextChips(state.contextChips);
}

function handleContextChipPointerDown(event) {
  const button = event.target.closest('[data-context-remove]');
  if (!button) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  removeContextChip(button.dataset.contextRemove);
}

function openContextAddMenuFromPicker(event) {
  if (event.target.closest('[data-context-remove], .context-add-menu')) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
  setContextAddMenuOpen(true);
}

function handleContextPickerKeydown(event) {
  if (!['Enter', ' '].includes(event.key)) {
    return;
  }
  openContextAddMenuFromPicker(event);
}

function setContextAddMenuOpen(open) {
  elements.contextAddMenu.hidden = !open;
  elements.contextPicker.setAttribute('aria-expanded', String(open));
  if (open) {
    renderContextObjectList();
    elements.contextSearchInput.focus();
  }
}

function closeContextAddMenuFromOutside(event) {
  if (!event.target.closest('.composer-context')) {
    setContextAddMenuOpen(false);
  }
}

function handleContextAddMenuClick(event) {
  const clearButton = event.target.closest('[data-context-add="clear"]');
  if (clearButton) {
    state.contextChips = [];
    finishContextAdd();
    return;
  }
  const option = event.target.closest('[data-context-option]');
  if (!option || option.disabled) {
    return;
  }
  const chip = parseContextOptionChip(option.dataset.contextOption);
  if (!chip) {
    return;
  }
  addContextChip(chip);
  finishContextAdd();
}

function finishContextAdd() {
  setContextAddMenuOpen(false);
  elements.contextSearchInput.value = '';
  persistContextChips();
  updateContextDisplay();
  syncIdeState();
}

function parseContextOptionChip(text) {
  try {
    const chip = JSON.parse(text);
    return normalizeContextChip(chip);
  } catch {
    return null;
  }
}

function addContextChip(chip) {
  const normalized = normalizeContextChip(chip);
  if (!normalized) {
    return;
  }
  state.contextChips = normalizeContextChips([...state.contextChips, normalized]);
}

function removeContextChip(id) {
  state.contextChips = state.contextChips.filter((chip) => getContextChipId(chip) !== id);
  persistContextChips();
  updateContextDisplay();
  syncIdeState();
}

function handleContextDragOver(event) {
  if (!hasProjectFileDragData(event)) {
    return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = 'copy';
  elements.contextPicker.classList.add('is-drag-over');
  elements.contextPanel.classList.add('is-drag-over');
}

function handleContextDragLeave(event) {
  if (!elements.contextPanel.contains(event.relatedTarget)) {
    elements.contextPicker.classList.remove('is-drag-over');
    elements.contextPanel.classList.remove('is-drag-over');
  }
}

function handleContextDrop(event) {
  const dragged = getDraggedProjectItem(event);
  if (!dragged.path) {
    return;
  }
  event.preventDefault();
  elements.contextPicker.classList.remove('is-drag-over');
  elements.contextPanel.classList.remove('is-drag-over');
  addContextChip({ type: dragged.type, path: dragged.path });
  persistContextChips();
  updateContextDisplay();
  syncIdeState();
}

function getDraggedProjectItem(event) {
  const folderPath = event.dataTransfer?.getData('application/x-pi-project-folder');
  if (folderPath) {
    return { type: 'folder', path: folderPath };
  }
  const projectPath = event.dataTransfer?.getData('application/x-pi-project-file');
  if (projectPath) {
    return { type: 'file', path: projectPath };
  }
  const text = event.dataTransfer?.getData('text/plain') || '';
  if (!text.startsWith('{')) {
    return { type: 'file', path: text };
  }
  try {
    const payload = JSON.parse(text);
    const type = payload.type === 'folder' ? 'folder' : 'file';
    return typeof payload.path === 'string' ? { type, path: payload.path } : { type: 'file', path: '' };
  } catch {
    return { type: 'file', path: text };
  }
}

function hasProjectFileDragData(event) {
  const types = Array.from(event.dataTransfer?.types || []);
  return types.includes('application/x-pi-project-file') || types.includes('application/x-pi-project-folder') || types.includes('text/plain');
}

function persistContextChips() {
  localStorage.setItem('pi-agent-gui-context-schema', CONTEXT_CHIP_SCHEMA_VERSION);
  localStorage.setItem('pi-agent-gui-context-chips', JSON.stringify(state.contextChips));
  localStorage.setItem('pi-agent-gui-context-items', JSON.stringify(getContextItemsFromChips()));
}

function parseStoredContextChips(text) {
  if (text) {
    try {
      const chips = normalizeContextChips(JSON.parse(text));
      if (localStorage.getItem('pi-agent-gui-context-schema') !== CONTEXT_CHIP_SCHEMA_VERSION) {
        return chips.filter((chip) => chip.type === 'file');
      }
      return isLegacyDefaultContextChips(chips) ? [] : chips;
    } catch {
      return DEFAULT_CONTEXT_CHIPS.slice();
    }
  }
  const legacyItems = parseStoredContextItems(localStorage.getItem('pi-agent-gui-context-items'));
  return contextChipsFromItems(legacyItems);
}

function isLegacyDefaultContextChips(chips) {
  if (!Array.isArray(chips) || chips.length !== 4) {
    return false;
  }
  const ids = chips.map(getContextChipId).sort();
  return ids.join('|') === 'current-file|diff|git|unsaved';
}

function parseStoredContextItems(text) {
  if (!text) {
    return contextItemsFromLegacyScope(localStorage.getItem('pi-agent-gui-context-scope'));
  }
  try {
    return normalizeContextItems(JSON.parse(text));
  } catch {
    return DEFAULT_CONTEXT_ITEMS.slice();
  }
}

function normalizeContextItems(items) {
  if (!Array.isArray(items)) {
    return DEFAULT_CONTEXT_ITEMS.slice();
  }
  return CONTEXT_ITEM_KEYS.filter((key) => items.includes(key));
}

function normalizeContextChips(chips) {
  if (!Array.isArray(chips)) {
    return DEFAULT_CONTEXT_CHIPS.slice();
  }
  const seen = new Set();
  const normalized = [];
  for (const chip of chips) {
    const item = normalizeContextChip(chip);
    if (!item) {
      continue;
    }
    const id = getContextChipId(item);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    normalized.push(item);
  }
  return normalized;
}

function normalizeContextChip(chip) {
  if (!chip || typeof chip !== 'object') {
    return null;
  }
  if (chip.type === 'file') {
    const path = normalizeContextFilePath(String(chip.path || '')).split('\\').join('/');
    return path ? { type: 'file', path } : null;
  }
  if (chip.type === 'folder') {
    const path = normalizeContextFilePath(String(chip.path || '')).split('\\').join('/').replace(/\/$/, '');
    return path ? { type: 'folder', path } : null;
  }
  if (['current-file', 'diff', 'git', 'unsaved'].includes(chip.type)) {
    return { type: chip.type };
  }
  return null;
}

function normalizeContextFilePath(path) {
  const text = path.trim();
  if (!text.startsWith('{')) {
    return text;
  }
  try {
    const payload = JSON.parse(text);
    return typeof payload.path === 'string' && payload.path.trim() ? payload.path.trim() : text;
  } catch {
    return text;
  }
}

function contextChipsFromItems(items) {
  const selected = new Set(normalizeContextItems(items));
  return DEFAULT_CONTEXT_CHIPS.filter((chip) => {
    if (chip.type === 'current-file') {
      return selected.has('file');
    }
    return selected.has(chip.type);
  });
}

function contextItemsFromLegacyScope(scope) {
  if (scope === 'none') {
    return [];
  }
  if (scope === 'file') {
    return ['file', 'unsaved'];
  }
  if (scope === 'diff') {
    return ['diff'];
  }
  if (scope === 'git') {
    return ['git'];
  }
  return DEFAULT_CONTEXT_ITEMS.slice();
}

function getContextItemSet() {
  return new Set(getContextItemsFromChips());
}

function getContextItemsFromChips(chips = state.contextChips) {
  const items = [];
  for (const chip of normalizeContextChips(chips)) {
    if ((chip.type === 'current-file' || chip.type === 'file') && !items.includes('file')) {
      items.push('file');
    } else if (chip.type === 'folder' && !items.includes('folder')) {
      items.push('folder');
    } else if (['diff', 'git', 'unsaved'].includes(chip.type) && !items.includes(chip.type)) {
      items.push(chip.type);
    }
  }
  return items;
}

function getContextFilePaths(chips = state.contextChips) {
  return normalizeContextChips(chips).filter((chip) => chip.type === 'file').map((chip) => chip.path);
}

function getContextFolderPaths(chips = state.contextChips) {
  return normalizeContextChips(chips).filter((chip) => chip.type === 'folder').map((chip) => chip.path);
}

function getContextFilePathSet(chips = state.contextChips) {
  return new Set(getContextFilePaths(chips));
}

function getContextFolderPathSet(chips = state.contextChips) {
  return new Set(getContextFolderPaths(chips));
}

function isContextFilePath(filePath, contextFilePaths = getContextFilePathSet()) {
  return contextFilePaths.has(String(filePath || ''));
}

function isContextFolderPath(folderPath, contextFolderPaths = getContextFolderPathSet()) {
  return contextFolderPaths.has(String(folderPath || '').replace(/\/$/, ''));
}

function getLegacyContextScope(items = getContextItemsFromChips()) {
  const selected = normalizeContextItems(items);
  const has = new Set(selected);
  if (!selected.length) {
    return 'none';
  }
  if (has.has('file') && has.has('diff') && has.has('git')) {
    return 'all';
  }
  if (selected.length === 1 && has.has('file')) {
    return 'file';
  }
  if (selected.length === 1 && has.has('diff')) {
    return 'diff';
  }
  if (selected.length === 1 && has.has('git')) {
    return 'git';
  }
  return 'custom';
}

function syncIdeState(options = {}) {
  window.clearTimeout(state.ideSyncTimer);
  const delay = Number.isFinite(options.delay) ? options.delay : 80;
  state.ideSyncTimer = window.setTimeout(() => {
    const gitFiles = state.gitStatus && Array.isArray(state.gitStatus.files) ? state.gitStatus.files : [];
    api('/api/bridge/ide-state', {
      method: 'POST',
      body: JSON.stringify({
        previewMode: state.previewMode,
        activeFile: state.previewMode === 'file' && state.currentFile ? state.currentFile.path : null,
        activeDiff: state.previewMode === 'diff' ? state.activeChangePath : null,
        previewDirty: state.previewDirty,
        contextScope: getLegacyContextScope(),
        contextItems: getContextItemsFromChips(),
        contextFiles: getContextFilePaths(),
        contextFolders: getContextFolderPaths(),
        gitFiles: gitFiles.map((file) => ({ status: file.status, path: file.path }))
      })
    }).then(() => {
      if (state.ideSyncStatus === 'failed') {
        addActivity('bridge', t('messages.bridgeSynced'));
      }
      state.ideSyncStatus = 'synced';
    }).catch((error) => {
      const message = t('messages.bridgeSyncFailed', { message: error.message || String(error) });
      if (state.ideSyncStatus !== 'failed') {
        addActivity('bridge', message);
        addSystemMessage(message, true);
      }
      state.ideSyncStatus = 'failed';
    });
  }, delay);
}

function renderContextChips() {
  const chips = normalizeContextChips(state.contextChips);
  if (!chips.length) {
    const hint = document.createElement('span');
    hint.className = 'context-chip-empty';
    hint.textContent = t('context.dropHint');
    elements.contextChips.replaceChildren(hint);
    return;
  }
  elements.contextChips.replaceChildren(...chips.map((chip) => {
    const id = getContextChipId(chip);
    const label = getContextChipLabel(chip);
    const item = document.createElement('span');
    item.className = 'context-chip';
    item.setAttribute('role', 'listitem');
    item.dataset.contextChip = id;
    const text = document.createElement('span');
    text.className = 'context-chip-label';
    text.textContent = label;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'context-chip-remove';
    remove.dataset.contextRemove = id;
    remove.setAttribute('aria-label', t('context.remove', { name: label }));
    remove.textContent = 'x';
    const icon = createContextChipIcon(chip);
    item.append(...(icon ? [icon] : []), text, remove);
    return item;
  }));
}

function createContextChipIcon(chip) {
  if (chip.type === 'file' && chip.path) {
    return createFileIcon(chip.path);
  }
  if (chip.type === 'folder' && chip.path) {
    return createFolderIcon(true);
  }
  if (chip.type === 'current-file' && state.currentFile) {
    return createFileIcon(state.currentFile.path);
  }
  if (chip.type === 'diff' && state.activeChangePath) {
    return createFileIcon(state.activeChangePath);
  }
  return null;
}

function getContextChipId(chip) {
  return chip.type === 'file' || chip.type === 'folder' ? `${chip.type}:${chip.path}` : chip.type;
}

function getContextChipLabel(chip) {
  if (chip.type === 'file') {
    return chip.path;
  }
  if (chip.type === 'folder') {
    return chip.path;
  }
  if (chip.type === 'current-file') {
    return state.currentFile ? state.currentFile.path : t('context.itemFile');
  }
  if (chip.type === 'diff') {
    return state.activeChangePath ? t('context.diff', { path: state.activeChangePath }) : t('context.itemDiff');
  }
  if (chip.type === 'git') {
    const count = state.gitStatus && Array.isArray(state.gitStatus.files) ? state.gitStatus.files.length : 0;
    return count ? t('context.git', { count: String(count) }) : t('context.itemGit');
  }
  if (chip.type === 'unsaved') {
    return state.currentFile ? `${state.currentFile.path} · ${t('context.dirty')}` : t('context.itemUnsaved');
  }
  return '';
}

function renderContextObjectList() {
  if (!elements.contextObjectList) {
    return;
  }
  const query = normalizeSearchText(elements.contextSearchInput.value);
  const groups = getContextPickerGroups(query);
  const nodes = [];
  for (const group of groups) {
    if (!group.items.length) {
      continue;
    }
    const heading = document.createElement('div');
    heading.className = 'context-object-heading';
    heading.textContent = group.label;
    nodes.push(heading, ...group.items.map(renderContextOption));
  }
  if (!nodes.length) {
    const empty = document.createElement('div');
    empty.className = 'context-picker-empty';
    empty.textContent = t('context.pickerEmpty');
    nodes.push(empty);
  }
  elements.contextObjectList.replaceChildren(...nodes);
}

function getContextPickerGroups(query) {
  return [
    { label: t('context.pickerCurrent'), items: filterContextOptions(getCurrentContextOptions(), query) },
    { label: t('context.pickerChanges'), items: filterContextOptions(getChangeContextOptions(), query) },
    { label: t('context.pickerFiles'), items: filterContextOptions(getFileContextOptions(), query) }
  ];
}

function getCurrentContextOptions() {
  const options = [];
  if (state.previewMode === 'file' && state.currentFile) {
    options.push({ chip: { type: 'file', path: state.currentFile.path }, label: state.currentFile.path, detail: t('context.currentFileDetail') });
  }
  if (state.previewMode === 'diff' && state.activeChangePath) {
    options.push({ chip: { type: 'diff' }, label: t('context.diff', { path: state.activeChangePath }), detail: t('context.currentDiffDetail') });
  }
  if (state.previewDirty && state.currentFile) {
    options.push({ chip: { type: 'unsaved' }, label: state.currentFile.path, detail: t('context.unsavedDetail') });
  }
  return options;
}

function getChangeContextOptions() {
  const files = state.gitStatus && Array.isArray(state.gitStatus.files) ? state.gitStatus.files : [];
  const options = [];
  if (files.length) {
    options.push({ chip: { type: 'git' }, label: t('context.git', { count: String(files.length) }), detail: t('context.gitDetail') });
  }
  return options.concat(files.slice(0, 12).map((file) => {
    const path = normalizeGitPath(file.path);
    return { chip: { type: 'file', path }, label: path, detail: `${file.status || ''} · ${t('context.gitFileDetail')}` };
  }));
}

function getFileContextOptions() {
  return collectProjectContextPaths(state.projectTree && state.projectTree.entries ? state.projectTree.entries : [])
    .map((item) => ({ chip: { type: item.type, path: item.path }, label: item.path, detail: item.type === 'folder' ? t('context.folderDetail') : t('context.pickerFiles') }));
}

function collectProjectFilePaths(entries, paths = []) {
  for (const entry of entries) {
    if (entry.type === 'file' && entry.path) {
      paths.push(entry.path);
    } else if (Array.isArray(entry.children)) {
      collectProjectFilePaths(entry.children, paths);
    }
  }
  return paths;
}

function collectProjectContextPaths(entries, items = []) {
  for (const entry of entries) {
    if (entry.type === 'file' && entry.path) {
      items.push({ type: 'file', path: entry.path });
    } else if (entry.path) {
      items.push({ type: 'folder', path: entry.path });
      if (Array.isArray(entry.children)) {
        collectProjectContextPaths(entry.children, items);
      }
    }
  }
  return items;
}

function filterContextOptions(options, query) {
  if (!query) {
    return options.slice(0, 12);
  }
  return options.filter((option) => normalizeSearchText(`${option.label} ${option.detail}`).includes(query)).slice(0, 16);
}

function normalizeSearchText(text) {
  return String(text || '').trim().toLowerCase();
}

function renderContextOption(option) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'context-object-option';
  button.dataset.contextOption = JSON.stringify(option.chip);
  button.setAttribute('role', 'option');
  button.disabled = hasContextChip(option.chip);
  const label = document.createElement('span');
  label.className = 'context-object-label';
  label.textContent = option.label;
  const detail = document.createElement('small');
  detail.textContent = option.detail;
  const icon = createContextChipIcon(option.chip);
  const content = document.createElement('span');
  content.className = 'context-object-content';
  content.append(label, detail);
  button.append(...(icon ? [icon] : []), content);
  return button;
}

function hasContextChip(chip) {
  const normalized = normalizeContextChip(chip);
  if (!normalized) {
    return false;
  }
  const id = getContextChipId(normalized);
  return normalizeContextChips(state.contextChips).some((item) => getContextChipId(item) === id);
}

function handleProjectTreeDragStart(event) {
  const button = event.target.closest('[data-file-path], [data-folder-path]');
  if (!button || !event.dataTransfer) {
    return;
  }
  const type = button.dataset.folderPath ? 'folder' : 'file';
  const path = button.dataset.folderPath || button.dataset.filePath;
  event.dataTransfer.setData(type === 'folder' ? 'application/x-pi-project-folder' : 'application/x-pi-project-file', path);
  event.dataTransfer.setData('text/plain', JSON.stringify({ type, path }));
  event.dataTransfer.effectAllowed = 'copy';
}

function handlePiEvent(event) {
  if (event.type === 'message_update') {
    handleMessageUpdate(event);
    return;
  }
  if (event.type === 'response') {
    handleResponseEvent(event);
    return;
  }
  if (event.type === 'message_end' && event.message) {
    if (hasAssistantVisibleOutput(event.message)) {
      mergeFinalAssistantMessage(event.message);
      state.activeAssistant = null;
      state.agentStatus = t('messages.statusFinished');
      scheduleRenderMessages();
    } else {
      keepActiveAssistantWaiting();
    }
    return;
  }
  if (event.type && event.type.startsWith('tool_execution_')) {
    handleToolEvent(event);
    return;
  }
  if (event.type === 'agent_start') {
    beginActiveAssistantMessage(t('messages.statusGenerating'));
    addActivity('agent', t('activity.agentStarted'));
    return;
  }
  if (event.type === 'agent_end') {
    finishActiveAssistantIfVisible(t('messages.statusFinished'));
    addActivity('agent', t('activity.agentFinished'));
    loadMessages().catch((error) => addActivity('messages', error.message || 'Message refresh failed'));
    return;
  }
  if (event.type === 'runtime_stderr' || event.type === 'runtime_parse_error' || event.type === 'runtime_exit') {
    addActivity(event.type, formatEvent(event));
  }
}

function handleMessageUpdate(event) {
  const delta = normalizeMessageDelta(event);
  if (!delta) {
    return;
  }
  const activeAssistant = ensureActiveAssistantMessage(t('messages.statusGenerating'));
  if (delta.kind === 'thinking') {
    activeAssistant.thinking = `${activeAssistant.thinking || ''}${delta.text || ''}`;
  } else {
    activeAssistant.content = `${activeAssistant.content || ''}${delta.text || ''}`;
  }
  scheduleRenderMessages({ stickToBottom: true });
}

function normalizeMessageDelta(event) {
  const delta = event.assistantMessageEvent || event.messageEvent || event.delta || event.data || event;
  const type = String(delta.type || event.deltaType || '').toLowerCase();
  const text = delta.delta ?? delta.text ?? delta.content ?? event.text ?? '';
  if (!text || typeof text !== 'string') {
    return null;
  }
  if (type.includes('thinking') || delta.thinking === true || event.thinking === true) {
    return { kind: 'thinking', text };
  }
  if (type.includes('text') || type.includes('content') || type.includes('message') || event.type === 'message_update') {
    return { kind: 'text', text };
  }
  return null;
}

function handleResponseEvent(event) {
  const responseId = getResponseEventId(event);
  if (responseId && state.handledResponseIds.has(responseId)) {
    if (isGuiTextCommandResponse(event)) {
      loadMessages().catch((error) => addActivity('messages', error.message || 'Message refresh failed'));
    }
    return;
  }
  if (responseId) {
    state.handledResponseIds.add(responseId);
  }
  if (event.success === false) {
    const failed = t('messages.statusFailed', { message: event.error || 'Runtime command failed' });
    failActiveAssistantMessage(failed);
    addActivity(event.command || 'response', event.error || failed);
    scheduleRenderMessages({ preserveScroll: true });
    return;
  }
  const message = extractAssistantMessageFromResponse(event);
  if (message && hasAssistantVisibleOutput(message)) {
    mergeFinalAssistantMessage(message);
    state.activeAssistant = null;
    state.agentStatus = t('messages.statusFinished');
    scheduleRenderMessages({ preserveScroll: true });
  }
  if (isGuiTextCommandResponse(event)) {
    loadMessages().catch((error) => addActivity('messages', error.message || 'Message refresh failed'));
  }
}

function isGuiTextCommandResponse(event) {
  return event.guiCommand || event.command === 'prompt' || event.command === 'steer' || event.command === 'follow_up';
}

function getResponseEventId(event) {
  if (event.id) {
    return String(event.id);
  }
  if (event.command && event.guiCommand) {
    return `${event.command}:${event.success === false ? event.error || '' : ''}`;
  }
  return '';
}

function extractAssistantMessageFromResponse(event) {
  const data = event.data || event.result || event.message || event.response || null;
  if (!data) {
    return null;
  }
  if (Array.isArray(data.messages)) {
    return [...data.messages].reverse().find((message) => normalizeMessageRole(message && message.role) === 'assistant') || null;
  }
  if (data.role || data.content || data.thinking || data.tools) {
    return data;
  }
  if (data.message && typeof data.message === 'object') {
    return data.message;
  }
  if (data.assistantMessage && typeof data.assistantMessage === 'object') {
    return data.assistantMessage;
  }
  if (data.result && typeof data.result === 'object') {
    return extractAssistantMessageFromResponse({ data: data.result });
  }
  if (typeof data.text === 'string' || typeof data.content === 'string') {
    return { role: 'assistant', content: data.text || data.content };
  }
  return null;
}

function handleToolEvent(event) {
  const id = event.toolCallId || `${event.toolName || 'tool'}-${Date.now()}`;
  const current = state.tools.get(id) || { id, name: event.toolName || 'tool', status: 'running', text: '' };
  current.name = event.toolName || current.name;
  current.status = event.type.replace('tool_execution_', '');
  current.timestamp = current.timestamp || new Date().toISOString();
  current.text = extractToolText(event) || current.text || JSON.stringify(event.args || {}, null, 2);
  state.tools.set(id, current);
  state.agentStatus = getActiveToolStatus(current);
  const activeAssistant = ensureActiveAssistantMessage(state.agentStatus);
  upsertAssistantTool(activeAssistant, current);
  scheduleRenderMessages({ stickToBottom: true });
  scheduleRenderActivity();
}

function createActiveAssistantMessage() {
  return addMessage({
    role: 'assistant',
    content: '',
    status: t('messages.statusGenerating'),
    timestamp: new Date().toISOString(),
    tools: [],
    inProgress: true
  });
}

function ensureActiveAssistantMessage(status) {
  if (!state.activeAssistant || !state.messages.includes(state.activeAssistant)) {
    state.activeAssistant = createActiveAssistantMessage();
  }
  state.activeAssistant.status = status || state.activeAssistant.status || t('messages.statusGenerating');
  state.activeAssistant.inProgress = true;
  state.agentStatus = state.activeAssistant.status;
  return state.activeAssistant;
}

function beginActiveAssistantMessage(status) {
  ensureActiveAssistantMessage(status || t('messages.statusGenerating'));
  scheduleRenderMessages({ stickToBottom: true });
}

function finishActiveAssistantMessage(status) {
  if (!state.activeAssistant) {
    state.agentStatus = status || t('messages.statusFinished');
    scheduleRenderMessages({ preserveScroll: true });
    return;
  }
  state.activeAssistant.status = status || t('messages.statusFinished');
  state.activeAssistant.inProgress = false;
  state.agentStatus = state.activeAssistant.status;
  scheduleRenderMessages({ preserveScroll: true });
}

function finishActiveAssistantIfVisible(status) {
  if (!state.activeAssistant || hasAssistantVisibleOutput(state.activeAssistant)) {
    finishActiveAssistantMessage(status);
    return;
  }
  keepActiveAssistantWaiting();
}

function keepActiveAssistantWaiting() {
  if (!state.activeAssistant) {
    return;
  }
  state.activeAssistant.status = state.activeAssistant.status || t('messages.statusGenerating');
  state.activeAssistant.inProgress = true;
  state.agentStatus = state.activeAssistant.status;
  scheduleRenderMessages({ preserveScroll: true });
}

function failActiveAssistantMessage(status) {
  if (!state.activeAssistant) {
    state.agentStatus = status || t('messages.statusFailed', { message: '' });
    return;
  }
  state.activeAssistant.status = status || t('messages.statusFailed', { message: '' });
  state.activeAssistant.inProgress = false;
  state.activeAssistant.error = true;
  state.agentStatus = state.activeAssistant.status;
}

function upsertAssistantTool(message, tool) {
  message.tools = Array.isArray(message.tools) ? message.tools : [];
  const existing = message.tools.find((item) => item.id === tool.id);
  if (existing) {
    Object.assign(existing, tool);
  } else {
    message.tools.push({ ...tool });
  }
}

function mergeFinalAssistantMessage(rawMessage) {
  const finalMessage = normalizeIncomingMessage(rawMessage);
  if (!finalMessage) {
    return;
  }
  const activeIndex = state.activeAssistant ? state.messages.indexOf(state.activeAssistant) : -1;
  if (activeIndex >= 0) {
    state.messages[activeIndex] = mergeAssistantMessages(state.messages[activeIndex], finalMessage);
    return;
  }
  const existingIndex = finalMessage.id ? state.messages.findIndex((message) => message.id && String(message.id) === String(finalMessage.id)) : -1;
  if (existingIndex >= 0) {
    state.messages[existingIndex] = mergeAssistantMessages(state.messages[existingIndex], finalMessage);
    return;
  }
  state.messages.push(finalMessage);
}

function normalizeIncomingMessage(message) {
  if (!message || typeof message !== 'object') {
    return null;
  }
  return {
    ...message,
    role: message.role || 'assistant',
    timestamp: message.timestamp || new Date().toISOString(),
    tools: normalizeMessageTools(message.tools || deriveToolsFromContent(message.content))
  };
}

function mergeAssistantMessages(existing, incoming) {
  const merged = {
    ...existing,
    ...incoming,
    content: incoming.content ?? existing.content,
    thinking: incoming.thinking || existing.thinking || '',
    status: incoming.status || t('messages.statusFinished'),
    timestamp: incoming.timestamp || existing.timestamp || null
  };
  const tools = new Map();
  for (const tool of [...normalizeMessageTools(existing.tools), ...normalizeMessageTools(incoming.tools)]) {
    tools.set(tool.id || `${tool.name}-${tools.size}`, tool);
  }
  merged.tools = Array.from(tools.values());
  return merged;
}

function extractToolText(event) {
  const result = event.partialResult || event.result;
  const content = result && Array.isArray(result.content) ? result.content : [];
  return content.map((item) => item.text || '').filter(Boolean).join('\n');
}

function renderRuntime() {
  const runtime = state.runtime || {};
  const pi = getRuntimePi();
  const running = isRuntimeRunning();
  elements.runtimeSummary.textContent = running ? t('runtime.runningSummary') : t('runtime.stoppedSummary');
  elements.runtimeStatus.textContent = running ? t('status.running') : t('status.stopped');
  elements.targetProject.textContent = runtime.targetProject || pi.cwd || '-';
  elements.currentSession.textContent = formatSessionInfo(runtime.session);
  elements.startButton.disabled = running;
  elements.abortButton.disabled = !running;
  elements.sendButton.disabled = !running;
  elements.saveSessionSelectionButton.disabled = running;
  elements.sessionModeSelect.disabled = running;
  elements.sessionValueInput.disabled = running;
  elements.sessionDirInput.disabled = running;
  elements.newSessionButton.disabled = !running;
  updateModelControls();
  renderSessions();
}

function renderSessions() {
  if (!state.sessionInfo || !elements.sessionsList) {
    return;
  }
  const selected = state.sessionInfo.selected || {};
  const running = isRuntimeRunning();
  elements.sessionModeSelect.value = selected.mode || 'default';
  elements.sessionValueInput.value = selected.session || selected.sessionId || '';
  elements.sessionDirInput.value = selected.sessionDir || state.sessionInfo.sessionDir || '';
  elements.saveSessionSelectionButton.disabled = running;
  elements.sessionModeSelect.disabled = running;
  elements.sessionValueInput.disabled = running;
  elements.sessionDirInput.disabled = running;
  elements.newSessionButton.disabled = !running;
  if (running && !elements.sessionStatus.textContent) {
    elements.sessionStatus.textContent = t('sessions.runningLocked');
  } else if (!running && elements.sessionStatus.textContent === t('sessions.runningLocked')) {
    elements.sessionStatus.textContent = '';
  }
  const sessions = Array.isArray(state.sessionInfo.sessions) ? state.sessionInfo.sessions : [];
  if (!sessions.length) {
    elements.sessionsList.innerHTML = `<p class="empty-list">${escapeHtml(t('sessions.empty'))}</p>`;
    return;
  }
  elements.sessionsList.innerHTML = sessions.map((session) => renderSessionRow(session, selected, running)).join('');
}

function renderSessionRow(session, selected, running) {
  const active = selected.session === session.file || selected.sessionId === session.id;
  const title = session.name || session.id || session.relativeFile;
  const metaParts = [formatDateTime(session.updatedAt), session.modelId, session.cwd].filter(Boolean);
  const buttonAttrs = running ? 'disabled' : `data-session-file="${escapeAttr(session.file)}"`;
  const previewMessages = Array.isArray(session.previewMessages) ? session.previewMessages : [];
  const preview = active ? renderSessionPreview(session, previewMessages) : '';
  return `
    <div class="session-row${active ? ' selected' : ''}">
      <button type="button" class="text-button session-select-button" ${buttonAttrs} data-help="help.sessionValue">
        <span class="file-icon">◇</span>
        <span class="session-row-content">
          <span class="session-row-title">${escapeHtml(title)}</span>
          <span class="session-row-meta">${escapeHtml(metaParts.join(' · ') || session.relativeFile)}</span>
        </span>
      </button>
      ${preview}
    </div>
  `;
}

function renderSessionPreview(session, previewMessages) {
  const total = Number(session.messageCount) || previewMessages.length;
  const countText = total ? t('sessions.previewCount', { count: String(total), shown: String(previewMessages.length) }) : t('sessions.previewEmpty');
  const messages = previewMessages.length
    ? previewMessages.map((message) => `
      <article class="session-preview-message">
        <span class="session-preview-role">${escapeHtml(formatSessionMessageRole(message.role))}</span>
        <span class="session-preview-text">${escapeHtml(message.text)}</span>
      </article>
    `).join('')
    : `<p class="session-preview-empty">${escapeHtml(t('sessions.previewEmpty'))}</p>`;
  return `
    <div class="session-preview" data-help="help.sessionsTab">
      <div class="session-preview-heading">
        <span>${escapeHtml(t('sessions.previewTitle'))}</span>
        <span>${escapeHtml(countText)}</span>
      </div>
      <div class="session-preview-list">${messages}</div>
    </div>
  `;
}

function formatSessionMessageRole(role) {
  if (['user', 'assistant', 'system', 'error'].includes(role)) {
    return t(`messages.${role}`);
  }
  return role || (state.language === 'zh' ? '消息' : 'Message');
}

function formatDateTime(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString(state.language === 'zh' ? 'zh-CN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

function getRuntimePi() {
  return state.runtime && state.runtime.pi ? state.runtime.pi : {};
}

function isRuntimeRunning() {
  return Boolean(getRuntimePi().running);
}

function formatSessionInfo(session) {
  if (!session) {
    return '-';
  }
  if (session.noSession) {
    return 'none';
  }
  const parts = [session.mode || 'default'];
  if (session.sessionId) {
    parts.push(session.sessionId);
  } else if (session.session) {
    parts.push(session.session);
  }
  if (session.sessionDir) {
    parts.push(session.sessionDir);
  }
  return parts.filter(Boolean).join(' · ');
}

function setLanguage(event) {
  state.language = event.target.value === 'en' ? 'en' : 'zh';
  localStorage.setItem('pi-agent-gui-language', state.language);
  applyLanguage();
  renderRuntime();
  setHelp(state.helpKey);
  loadModels().catch(() => {});
  if (state.modelConfig && state.modelConfig.path) {
    elements.modelConfigStatus.textContent = t('messages.configPath', { path: state.modelConfig.path });
  }
}

function applyLanguage() {
  document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
  elements.languageSelect.value = state.language;
  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll('[data-i18n-placeholder]')) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }
  for (const element of document.querySelectorAll('[data-i18n-title]')) {
    element.title = t(element.dataset.i18nTitle);
    element.setAttribute('aria-label', t(element.dataset.i18nTitle));
  }
  updateProjectSearchPlaceholder();
  updatePreviewActions();
  updateContextDisplay();
  renderStepReference();
  setHelp(state.helpKey);
}

function setHelp(key = 'help.default') {
  state.helpKey = key;
  const text = t(key);
  elements.helpText.textContent = text;
  elements.helpText.dataset.density = getHelpDensity(text);
}

function getHelpDensity(text) {
  if (text.length > 112) {
    return 'compact';
  }
  if (text.length > 74) {
    return 'small';
  }
  return 'normal';
}

function updateHelpFromEvent(event) {
  const target = event.target.closest('[data-help]');
  if (target) {
    setHelp(target.dataset.help);
  }
}

function handleStepReferenceSearch(event) {
  state.stepReferenceQuery = event.target.value.trim();
  renderStepReference();
}

function renderStepReference() {
  const query = normalizeStepReferenceQuery(state.stepReferenceQuery);
  const groups = getStepReferenceGroups()
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => matchesStepReferenceItem(item, query, group.title))
    }))
    .filter((group) => group.items.length);
  elements.stepReferenceList.replaceChildren(...groups.map(createStepReferenceGroup));
  if (!groups.length) {
    const empty = document.createElement('p');
    empty.className = 'form-status';
    empty.textContent = t('stepReference.empty');
    elements.stepReferenceList.append(empty);
  }
}

function createStepReferenceGroup(group) {
  const section = document.createElement('section');
  section.className = 'step-reference-category';
  const heading = document.createElement('h3');
  heading.textContent = group.title;
  const list = document.createElement('div');
  list.className = 'step-reference-items';
  list.append(...group.items.map(createStepReferenceItem));
  section.append(heading, list);
  return section;
}

function createStepReferenceItem(item) {
  const row = document.createElement('div');
  row.className = 'step-reference-item';
  const label = document.createElement('strong');
  label.textContent = item.label;
  const aliases = document.createElement('span');
  aliases.textContent = item.aliases.join(', ');
  row.append(label, aliases);
  return row;
}

function matchesStepReferenceItem(item, query, groupTitle) {
  if (!query) {
    return true;
  }
  return normalizeStepReferenceQuery([groupTitle, item.label, ...item.aliases].join(' ')).includes(query);
}

function normalizeStepReferenceQuery(value) {
  return String(value || '').toLowerCase().replace(/[\s_-]+/g, '');
}

function getStepReferenceGroups() {
  return [
    {
      title: t('stepReference.reading'),
      items: [
        { label: '读取文件', aliases: ['read', 'read_file', 'readFile', 'read_ide_file'] },
        { label: '列出目录', aliases: ['list', 'list_dir', 'listDir'] },
        { label: '获取上下文', aliases: ['get_ide_context', 'getContext'] }
      ]
    },
    {
      title: t('stepReference.searching'),
      items: [
        { label: '搜索文本', aliases: ['grep', 'grep_search', 'rg'] },
        { label: '查找文件', aliases: ['file_search', 'glob'] },
        { label: '搜索代码语义', aliases: ['semantic_search', 'semanticSearch'] },
        { label: '查找引用', aliases: ['listCodeUsages', 'vscode_listCodeUsages'] }
      ]
    },
    {
      title: t('stepReference.editing'),
      items: [
        { label: '编辑文件', aliases: ['edit', 'edit_file'] },
        { label: '写入文件', aliases: ['write', 'write_file'] },
        { label: '修改文件', aliases: ['apply_patch', 'applyPatch'] }
      ]
    },
    {
      title: t('stepReference.running'),
      items: [
        { label: '运行命令', aliases: ['bash', 'shell', 'run_command'] },
        { label: '运行终端命令', aliases: ['terminal', 'run_in_terminal'] },
        { label: '运行任务', aliases: ['run_task', 'create_and_run_task'] },
        { label: '运行 Notebook 单元', aliases: ['run_notebook_cell'] }
      ]
    },
    {
      title: t('stepReference.checking'),
      items: [
        { label: '检查问题', aliases: ['get_errors', 'check', 'diagnostics'] },
        { label: '查看测试失败', aliases: ['testFailure', 'test_failure'] },
        { label: '验证页面', aliases: ['playwright', 'run_playwright_code'] }
      ]
    },
    {
      title: t('stepReference.browser'),
      items: [
        { label: '打开页面', aliases: ['open_browser_page'] },
        { label: '查看页面', aliases: ['read_page'] },
        { label: '点击页面', aliases: ['click_element'] },
        { label: '输入页面', aliases: ['type_in_page'] },
        { label: '截图页面', aliases: ['screenshot_page'] }
      ]
    }
  ];
}

function activatePanel(panelId) {
  for (const button of elements.tabButtons) {
    const active = button.dataset.panelTarget === panelId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', active ? 'true' : 'false');
  }
  for (const button of elements.railButtons) {
    const active = button.dataset.panelTarget === panelId;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? 'page' : 'false');
  }
  for (const section of elements.panelSections) {
    section.classList.toggle('active', section.id === panelId);
  }
}

function renderProjectTree() {
  const entries = state.projectTree && state.projectTree.entries ? state.projectTree.entries : [];
  if (!entries.length) {
    elements.projectTree.textContent = t('project.empty');
  } else {
    const contextFilePaths = getContextFilePathSet();
    const contextFolderPaths = getContextFolderPathSet();
    elements.projectTree.replaceChildren(...entries.map((entry) => renderTreeEntry(entry, 0, contextFilePaths, contextFolderPaths)));
  }
  elements.projectStatus.textContent = state.projectTree && state.projectTree.truncated ? t('project.truncated') : '';
  elements.revealCurrentFileButton.disabled = !state.currentFile;
}

function confirmDiscardPreviewChanges() {
  if (state.previewSaveState === 'saving') {
    return false;
  }
  if (!state.previewDirty) {
    return true;
  }
  return window.confirm(t('preview.discardConfirm'));
}

function renderSearchResults() {
  const results = state.searchResults && state.searchResults.results ? state.searchResults.results : [];
  if (!results.length && state.searchResults && state.searchResults.message) {
    elements.projectSearchResults.textContent = state.searchResults.message;
    return;
  }
  if (!results.length) {
    elements.projectSearchResults.textContent = t('project.searchEmpty');
    return;
  }
  elements.projectSearchResults.replaceChildren(...results.map((result) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result-row';
    if (result.isDirectory) {
      button.dataset.folderPath = result.path;
      button.setAttribute('data-help', 'help.folderIcon');
    } else if (result.type === 'current') {
      button.dataset.resultLine = String(result.line || 1);
      button.dataset.searchQuery = state.searchResults.query || '';
      button.setAttribute('data-help', 'help.projectSearchScope');
    } else {
      button.dataset.filePath = result.path;
      if (result.line) {
        button.dataset.resultLine = String(result.line);
        button.dataset.searchQuery = state.searchResults.query || '';
      }
      button.setAttribute('data-help', 'help.projectSearch');
    }
    const icon = result.isDirectory ? createFolderIcon(false) : createFileIcon(result.path);
    const title = document.createElement('strong');
    title.className = 'search-result-title';
    title.append(...createSearchResultTitle(result, state.searchResults.query || ''));
    const preview = document.createElement('span');
    preview.className = 'search-result-preview';
    preview.append(...createSearchResultPreview(result, state.searchResults.query || ''));
    const content = document.createElement('span');
    content.className = 'search-result-content';
    content.append(title, preview);
    button.append(icon, content);
    return button;
  }));
  if (state.searchResults.truncated) {
    const note = document.createElement('p');
    note.className = 'form-status';
    note.textContent = t('project.searchTruncated');
    elements.projectSearchResults.append(note);
  }
}

function renderTreeEntry(entry, depth, contextFilePaths = getContextFilePathSet(), contextFolderPaths = getContextFolderPathSet()) {
  const row = document.createElement('div');
  row.className = `tree-row ${entry.type}`;
  row.style.setProperty('--depth', depth);
  if (entry.type === 'file') {
    const active = state.currentFile && entry.path === state.currentFile.path;
    const inContext = isContextFilePath(entry.path, contextFilePaths);
    row.classList.toggle('current-file', Boolean(active));
    row.classList.toggle('in-context', inContext);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.dataset.filePath = entry.path;
    button.draggable = true;
    button.setAttribute('data-help', active ? 'help.currentFile' : inContext ? 'help.contextPicker' : 'help.projectTab');
    if (active) {
      button.setAttribute('aria-current', 'true');
    }
    if (inContext) {
      button.setAttribute('aria-label', `${entry.name} · ${t('context.added')}`);
    }
    button.append(createFileIcon(entry.path), createFileLabel(entry.name));
    row.append(button);
    return row;
  }
  const children = Array.isArray(entry.children) ? entry.children : [];
  const collapsed = state.collapsedFolders.has(entry.path);
  const inContext = isContextFolderPath(entry.path, contextFolderPaths);
  row.classList.toggle('in-context', inContext);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree-folder-button';
  button.dataset.folderPath = entry.path;
  button.draggable = true;
  button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  button.setAttribute('data-help', inContext ? 'help.contextPicker' : 'help.folderIcon');
  if (inContext) {
    button.setAttribute('aria-label', `${entry.name} · ${t('context.added')}`);
  }
  const marker = document.createElement('span');
  marker.className = 'tree-marker';
  marker.textContent = collapsed ? '>' : 'v';
  const label = document.createElement('span');
  label.textContent = entry.name;
  button.append(marker, createFolderIcon(collapsed), label);
  row.append(button);
  if (children.length && !collapsed) {
    row.append(...children.map((child) => renderTreeEntry(child, depth + 1, contextFilePaths, contextFolderPaths)));
  }
  return row;
}

function createSearchResultTitle(result, query) {
  if (result.line) {
    return [
      createSearchResultPath(result.path, query),
      createSearchResultMeta(`:${result.line}`)
    ];
  }
  if (result.isDirectory) {
    return [
      createSearchResultMeta(`${t('project.searchDirectory')} · `),
      createSearchResultPath(result.path, query)
    ];
  }
  return [createSearchResultPath(result.path, query)];
}

function createSearchResultPreview(result, query) {
  if (result.line) {
    return createHighlightedSearchText(result.preview || result.path, query, 'search-result-preview-text');
  }
  const label = result.isDirectory ? t('project.folderNameMatch') : t('project.fileNameMatch');
  return [createSearchResultMeta(label)];
}

function createSearchResultPath(path, query) {
  const wrapper = document.createElement('span');
  wrapper.className = 'search-result-path';
  const parts = String(path || '').split('/');
  const fileName = parts.pop() || '';
  const directory = parts.length ? `${parts.join('/')}/` : '';
  if (directory) {
    const directoryNode = document.createElement('span');
    directoryNode.className = 'search-result-directory';
    directoryNode.append(...createHighlightedSearchText(directory, query, 'search-result-directory-text'));
    wrapper.append(directoryNode);
  }
  const fileNode = document.createElement('span');
  fileNode.className = 'search-result-file';
  fileNode.append(...createHighlightedSearchText(fileName, query, 'search-result-file-text'));
  wrapper.append(fileNode);
  return wrapper;
}

function createSearchResultMeta(text) {
  const node = document.createElement('span');
  node.className = 'search-result-meta';
  node.textContent = text;
  return node;
}

function createHighlightedSearchText(text, query, className) {
  const value = String(text || '');
  const needle = String(query || '').trim();
  const offsets = getSearchHitOffsetsInText(value, needle);
  if (!offsets.length) {
    const node = document.createElement('span');
    node.className = className;
    node.textContent = value;
    return [node];
  }
  const nodes = [];
  let index = 0;
  for (const offset of offsets) {
    if (offset > index) {
      nodes.push(createSearchTextNode(value.slice(index, offset), className));
    }
    nodes.push(createSearchTextNode(value.slice(offset, offset + needle.length), 'search-result-hit'));
    index = offset + needle.length;
  }
  if (index < value.length) {
    nodes.push(createSearchTextNode(value.slice(index), className));
  }
  return nodes.filter((node) => node.textContent.length);
}

function createSearchPreviewSnippet(text, query) {
  const value = String(text || '').trim();
  const needle = String(query || '').trim().toLowerCase();
  if (!value || !needle) {
    return value.slice(0, 180);
  }
  const found = value.toLowerCase().indexOf(needle);
  if (found === -1) {
    return value.slice(0, 180);
  }
  const beforeContext = 18;
  const afterContext = 78;
  const start = Math.max(0, found - beforeContext);
  const end = Math.min(value.length, found + needle.length + afterContext);
  return `${start > 0 ? '...' : ''}${value.slice(start, end)}${end < value.length ? '...' : ''}`;
}

function createSearchTextNode(text, className) {
  const node = document.createElement('span');
  node.className = className;
  node.textContent = text;
  return node;
}

function toggleFolder(folderPath) {
  if (state.collapsedFolders.has(folderPath)) {
    state.collapsedFolders.delete(folderPath);
  } else {
    state.collapsedFolders.add(folderPath);
  }
  renderProjectTree();
}

function updateProjectSearchPlaceholder() {
  const key = elements.projectSearchScope.value === 'current' ? 'project.searchCurrent'
    : elements.projectSearchScope.value === 'name' ? 'project.searchName'
    : 'project.searchContent';
  elements.projectSearchInput.placeholder = `${t('actions.search')} · ${t(key)}`;
}

function revealCurrentFileInTree({ scroll = false } = {}) {
  if (!state.currentFile) {
    return;
  }
  expandFoldersForPath(state.currentFile.path);
  renderProjectTree();
  if (scroll) {
    requestAnimationFrame(() => scrollTreePathIntoView(state.currentFile.path, 'file'));
  }
}

function expandFoldersForPath(filePath) {
  const parts = String(filePath || '').split('/');
  let current = '';
  for (let index = 0; index < parts.length - 1; index += 1) {
    current = current ? `${current}/${parts[index]}` : parts[index];
    state.collapsedFolders.delete(current);
  }
}

function scrollTreePathIntoView(treePath, type) {
  const selector = type === 'folder' ? `[data-folder-path="${cssEscape(treePath)}"]` : `[data-file-path="${cssEscape(treePath)}"]`;
  const target = elements.projectTree.querySelector(selector);
  if (target) {
    target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function revealProjectFolderInTree(folderPath, { scroll = false } = {}) {
  const path = String(folderPath || '').replace(/\/$/, '');
  if (!path) {
    return;
  }
  expandFoldersForPath(`${path}/placeholder`);
  renderProjectTree();
  if (scroll) {
    requestAnimationFrame(() => scrollTreePathIntoView(path, 'folder'));
  }
}

function scrollPreviewToLine(lineNumber) {
  const target = state.previewMode === 'empty' ? elements.previewEditor : elements.previewCode;
  const lineHeight = parseFloat(getComputedStyle(target).lineHeight) || 18;
  target.scrollTop = Math.max(0, (lineNumber - 2) * lineHeight);
  target.focus();
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') {
    return window.CSS.escape(value);
  }
  return String(value).replace(/"/g, '\\"');
}

function renderGitStatus() {
  const files = state.gitStatus && state.gitStatus.files ? state.gitStatus.files : [];
  if (!files.length) {
    elements.changesList.textContent = t('changes.empty');
    elements.changesStatus.textContent = '';
    return;
  }
  elements.changesList.replaceChildren(...files.map((file) => {
    const row = document.createElement('div');
    row.className = 'change-row';
    const changePath = normalizeGitPath(file.path);
    row.classList.toggle('current-change', isActiveChangePath(changePath));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'change-diff-button';
    button.dataset.changePath = changePath;
    button.setAttribute('data-help', 'help.changesTab');
    const status = document.createElement('span');
    status.className = 'change-status';
    status.textContent = file.status;
    status.title = describeGitStatus(file.status);
    status.setAttribute('data-help', 'help.changeStatus');
    const fileCell = document.createElement('span');
    fileCell.className = 'file-cell';
    const name = document.createElement('span');
    name.textContent = file.path;
    fileCell.append(createFileIcon(file.path), name);
    button.append(status, fileCell, renderDiffStats(file.stats));
    const openButton = document.createElement('button');
    openButton.type = 'button';
    openButton.className = 'change-open-button';
    openButton.dataset.changeOpenPath = changePath;
    openButton.textContent = '↗';
    openButton.title = t('actions.openFile');
    openButton.setAttribute('aria-label', `${t('actions.openFile')} ${changePath}`);
    openButton.setAttribute('data-help', 'help.openChangedFile');
    row.append(button, openButton);
    return row;
  }));
  elements.changesStatus.textContent = '';
}

function renderDiffStats(stats) {
  const node = document.createElement('span');
  node.className = 'change-stats';
  if (!stats || (!stats.added && !stats.removed)) {
    node.textContent = '';
    return node;
  }
  node.append(...createDiffStatsParts(stats));
  return node;
}

function createDiffStatsParts(stats) {
  const added = document.createElement('span');
  added.className = 'change-stats-added';
  added.textContent = `+${stats && stats.added || 0}`;
  const removed = document.createElement('span');
  removed.className = 'change-stats-removed';
  removed.textContent = `-${stats && stats.removed || 0}`;
  return [added, removed];
}

function describeGitStatus(status) {
  const text = String(status || '').padEnd(2, ' ');
  const names = { M: 'modified', A: 'added', D: 'deleted', R: 'renamed', C: 'copied', U: 'unmerged', '?': 'untracked', '!': 'ignored' };
  if (text.trim() === '??') {
    return '?? · untracked file';
  }
  const staged = names[text[0]] || 'clean';
  const worktree = names[text[1]] || 'clean';
  return `${status} · staged: ${staged}, worktree: ${worktree}`;
}

function normalizeGitPath(filePath) {
  return String(filePath || '').split(' -> ').pop();
}

function isActiveChangePath(filePath) {
  const normalized = normalizeGitPath(filePath);
  if (state.activeChangePath) {
    return normalized === normalizeGitPath(state.activeChangePath);
  }
  return Boolean(state.currentFile && normalized === normalizeGitPath(state.currentFile.path));
}

function showPreviewError(error) {
  setPreviewActive(true);
  state.currentFile = null;
  state.activeChangePath = '';
  state.activeEditCheckpointPreview = null;
  renderProjectTree();
  state.previewMode = 'error';
  state.previewEditing = false;
  state.previewDirty = false;
  state.previewSaveState = 'idle';
  state.previewSaveError = '';
  elements.previewTitle.textContent = t('preview.title');
  elements.previewMeta.textContent = '';
  setPreviewIcon('');
  renderPreviewContent(error.message || String(error), '', 'error');
  updatePreviewActions();
  updateContextDisplay();
  syncIdeState();
}

function showEditableFile(file) {
  setPreviewActive(true);
  state.currentFile = file;
  state.activeChangePath = normalizeGitPath(file.path);
  state.activeEditCheckpointPreview = null;
  state.previewMode = 'file';
  state.previewEditing = false;
  state.previewDirty = false;
  state.previewSaveState = 'idle';
  state.previewSaveError = '';
  elements.previewTitle.textContent = file.path;
  setPreviewIcon(file.path);
  renderPreviewContent(file.content + (file.truncated ? t('preview.truncated') : ''), file.path, 'file');
  elements.previewEditor.readOnly = Boolean(file.truncated);
  syncPreviewClass();
  updatePreviewMeta();
  renderGitStatus();
  updatePreviewActions();
  updateContextDisplay({ renderTree: false });
  syncIdeState();
}

function clearEditCheckpointPreview(checkpointId) {
  if (!state.activeEditCheckpointPreview || state.activeEditCheckpointPreview.checkpointId !== checkpointId) {
    return;
  }
  state.activeEditCheckpointPreview = null;
  state.currentFile = null;
  state.activeChangePath = '';
  state.previewMode = 'empty';
  state.previewEditing = false;
  state.previewDirty = false;
  state.previewSaveState = 'idle';
  state.previewSaveError = '';
  elements.previewTitle.textContent = t('preview.title');
  elements.previewMeta.textContent = '';
  setPreviewIcon('');
  renderPreviewContent('', '', 'empty');
  syncPreviewClass();
  updatePreviewActions();
  updateContextDisplay();
  syncIdeState();
}

function updatePreviewMeta() {
  if (!state.currentFile) {
    return;
  }
  const status = getPreviewStatusText();
  const metaKey = state.previewSaveState === 'saved' && !state.previewDirty ? 'preview.savedMeta' : 'preview.fileMeta';
  elements.previewMeta.textContent = `${t(metaKey, {
    path: state.currentFile.path,
    size: String(state.currentFile.size)
  })}${status}`;
}

function getPreviewStatusText() {
  if (state.previewSaveState === 'saving') {
    return ` · ${t('preview.saving')}`;
  }
  if (state.previewSaveState === 'error') {
    return ` · ${t('preview.saveFailed', { message: state.previewSaveError })}`;
  }
  return state.previewDirty ? ` · ${t('preview.dirty')}` : '';
}

function updatePreviewActions() {
  const editable = state.previewMode === 'file' && state.currentFile && !state.currentFile.truncated;
  const saving = state.previewSaveState === 'saving';
  elements.reloadFileButton.disabled = !state.currentFile || saving;
  elements.saveFileButton.disabled = !editable || !state.previewDirty || saving;
  elements.saveFileButton.textContent = saving ? t('preview.saving') : t('actions.saveFile');
}

async function refreshProjectFileStateAfterSave(filePath) {
  await loadGitStatus().catch(() => {});
  state.activeChangePath = normalizeGitPath(filePath);
  renderProjectTree();
  renderGitStatus();
}

function setPreviewIcon(filePath) {
  if (!filePath) {
    elements.previewIcon.hidden = true;
    return;
  }
  const meta = getFileKind(filePath);
  elements.previewIcon.hidden = false;
  elements.previewIcon.className = `file-icon file-icon-${meta.kind}`;
  elements.previewIcon.textContent = meta.label;
  elements.previewIcon.title = meta.title;
  elements.previewIcon.setAttribute('data-help', 'help.fileIcon');
  elements.previewIcon.setAttribute('aria-label', meta.title);
}

function beginPreviewEdit() {
  if (state.previewMode !== 'file' || !state.currentFile || state.currentFile.truncated) {
    return;
  }
  materializeVirtualPreview();
  state.previewEditing = true;
  syncPreviewClass();
  elements.previewCode.focus();
}

function handlePreviewCodeScroll() {
  updatePreviewMinimapViewport();
  scheduleVirtualPreviewRender();
}

function handlePreviewCodeKeydown(event) {
  if (state.previewEditing) {
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    beginPreviewEdit();
  }
}

function renderPreviewContent(content, filePath, mode) {
  resetVirtualPreview();
  elements.previewEditor.value = content;
  elements.previewCode.dataset.fileKind = getFileKind(filePath).kind;
  elements.previewEditor.dataset.fileKind = getFileKind(filePath).kind;
  elements.previewEditor.readOnly = mode !== 'file' || Boolean(state.currentFile && state.currentFile.truncated);
  if (shouldVirtualizePreview(content, mode)) {
    renderVirtualPreviewContent(content, filePath);
    return;
  }
  const highlighted = highlightContent(content, filePath, mode);
  elements.previewCode.replaceChildren(...highlighted.nodes);
  renderPreviewMinimap(highlighted.marks);
  elements.previewCode.scrollTop = 0;
  elements.previewEditor.scrollTop = 0;
  requestAnimationFrame(updatePreviewMinimapViewport);
}

function shouldVirtualizePreview(content, mode) {
  return mode === 'file' && !state.previewEditing && content.length > VIRTUAL_PREVIEW_BYTES;
}

function resetVirtualPreview() {
  if (state.previewVirtualRaf) {
    cancelAnimationFrame(state.previewVirtualRaf);
    state.previewVirtualRaf = 0;
  }
  if (state.previewVirtualScanRaf) {
    cancelAnimationFrame(state.previewVirtualScanRaf);
    state.previewVirtualScanRaf = 0;
  }
  state.previewVirtual = null;
  elements.previewCode.classList.remove('is-virtualized');
  elements.previewCode.style.removeProperty('--virtual-preview-height');
  elements.previewCode.style.removeProperty('--virtual-preview-offset');
}

function renderVirtualPreviewContent(content, filePath) {
  const lineIndex = createLineIndex(content);
  const lineHeight = getPreviewLineHeight();
  const language = getFileKind(filePath).language;
  state.previewVirtual = {
    content,
    filePath,
    language,
    searchHit: state.activeSearchHit,
    lineIndex,
    sourceLines: lineIndex.lines,
    lines: lineIndex.lines.map(() => null),
    marks: createLinePreviewMarks(lineIndex),
    scannedUntil: 0,
    lineCount: lineIndex.lines.length,
    lineHeight,
    lastStart: -1,
    lastEnd: -1
  };
  elements.previewCode.classList.add('is-virtualized');
  elements.previewCode.style.setProperty('--virtual-preview-height', `${Math.max(lineHeight, state.previewVirtual.lineCount * lineHeight)}px`);
  elements.previewCode.scrollTop = 0;
  elements.previewEditor.scrollTop = 0;
  renderPreviewMinimap(normalizePreviewMarks(state.previewVirtual.marks, state.previewVirtual.lineCount));
  scanVirtualPreviewLines(VIRTUAL_PREVIEW_INITIAL_LINES);
  renderVirtualPreviewWindow();
  requestAnimationFrame(updatePreviewMinimapViewport);
  scheduleVirtualPreviewScan();
}

function materializeVirtualPreview() {
  if (!state.previewVirtual) {
    return;
  }
  const virtual = state.previewVirtual;
  const scrollTop = elements.previewCode.scrollTop;
  resetVirtualPreview();
  const highlighted = highlightContent(virtual.content, virtual.filePath, 'file');
  elements.previewCode.replaceChildren(...highlighted.nodes);
  elements.previewCode.scrollTop = scrollTop;
  renderPreviewMinimap(highlighted.marks);
  requestAnimationFrame(updatePreviewMinimapViewport);
}

function scheduleVirtualPreviewRender() {
  if (!state.previewVirtual || state.previewVirtualRaf) {
    return;
  }
  state.previewVirtualRaf = requestAnimationFrame(() => {
    state.previewVirtualRaf = 0;
    renderVirtualPreviewWindow();
  });
}

function scheduleVirtualPreviewScan() {
  if (!state.previewVirtual || state.previewVirtualScanRaf || state.previewVirtual.scannedUntil >= state.previewVirtual.lineCount) {
    return;
  }
  state.previewVirtualScanRaf = requestAnimationFrame(() => {
    state.previewVirtualScanRaf = 0;
    scanVirtualPreviewLines(VIRTUAL_PREVIEW_SCAN_CHUNK_LINES);
    renderPreviewMinimap(normalizePreviewMarks(state.previewVirtual.marks, state.previewVirtual.lineCount));
    scheduleVirtualPreviewRender();
    scheduleVirtualPreviewScan();
  });
}

function scanVirtualPreviewLines(maxLines) {
  const virtual = state.previewVirtual;
  if (!virtual) {
    return;
  }
  const end = Math.min(virtual.lineCount, virtual.scannedUntil + maxLines);
  for (let lineIndex = virtual.scannedUntil; lineIndex < end; lineIndex += 1) {
    const highlighted = highlightSinglePreviewLine(virtual.sourceLines[lineIndex], virtual.language, virtual.searchHit, virtual.lineIndex.starts[lineIndex]);
    virtual.lines[lineIndex] = highlighted.parts;
    highlighted.marks.forEach((mark) => virtual.marks.push({ line: lineIndex, type: mark }));
  }
  virtual.scannedUntil = end;
}

function renderVirtualPreviewWindow() {
  const virtual = state.previewVirtual;
  if (!virtual) {
    return;
  }
  const visibleStart = Math.floor(elements.previewCode.scrollTop / virtual.lineHeight);
  const visibleLines = Math.ceil(elements.previewCode.clientHeight / virtual.lineHeight);
  const start = Math.max(0, visibleStart - VIRTUAL_PREVIEW_OVERSCAN_LINES);
  const end = Math.min(virtual.lineCount, visibleStart + visibleLines + VIRTUAL_PREVIEW_OVERSCAN_LINES);
  if (start === virtual.lastStart && end === virtual.lastEnd) {
    return;
  }
  virtual.lastStart = start;
  virtual.lastEnd = end;
  elements.previewCode.style.setProperty('--virtual-preview-offset', `${start * virtual.lineHeight}px`);
  const spacer = document.createElement('div');
  spacer.className = 'preview-virtual-spacer';
  const content = document.createElement('div');
  content.className = 'preview-virtual-content';
  for (let lineIndex = start; lineIndex < end; lineIndex += 1) {
    content.append(createVirtualPreviewLine(getVirtualPreviewLineParts(virtual, lineIndex)));
  }
  elements.previewCode.replaceChildren(spacer, content);
}

function getVirtualPreviewLineParts(virtual, lineIndex) {
  if (!virtual.lines[lineIndex]) {
    const highlighted = highlightSinglePreviewLine(virtual.sourceLines[lineIndex], virtual.language, virtual.searchHit, virtual.lineIndex.starts[lineIndex]);
    virtual.lines[lineIndex] = highlighted.parts;
    highlighted.marks.forEach((mark) => virtual.marks.push({ line: lineIndex, type: mark }));
  }
  return virtual.lines[lineIndex];
}

function createVirtualPreviewLine(nodes) {
  const line = document.createElement('div');
  line.className = 'preview-virtual-line';
  if (nodes.length) {
    line.append(...nodes.map(createPreviewNodeFromPart));
  } else {
    line.append(document.createTextNode('\u00a0'));
  }
  return line;
}

function createPreviewNodeFromPart(part) {
  if (!part.className) {
    return document.createTextNode(part.text);
  }
  const node = createToken(part.text, part.className);
  if (part.searchHit) {
    node.dataset.searchHit = 'true';
  }
  return node;
}

function getPreviewLineHeight() {
  return parseFloat(getComputedStyle(elements.previewCode).lineHeight) || 18;
}

function createLinePreviewMarks(lineIndex) {
  const marks = [];
  lineIndex.lines.forEach((line, rowIndex) => {
    if (line.trim()) {
      marks.push({ line: rowIndex, type: 'line' });
    }
  });
  return marks;
}

function syncPreviewClass() {
  const editable = state.previewMode === 'file' && Boolean(state.currentFile) && !state.currentFile.truncated;
  elements.previewCode.hidden = state.previewMode === 'empty';
  elements.previewEditor.hidden = state.previewMode !== 'empty';
  elements.previewCode.contentEditable = editable && state.previewEditing ? 'plaintext-only' : 'false';
  elements.previewCode.classList.toggle('is-editing', editable && state.previewEditing);
  elements.previewCode.setAttribute('aria-hidden', elements.previewCode.hidden ? 'true' : 'false');
  elements.previewEditor.setAttribute('aria-hidden', elements.previewEditor.hidden ? 'true' : 'false');
}

function getPreviewText() {
  if (state.previewVirtual) {
    return state.previewVirtual.content;
  }
  return state.previewMode === 'empty' ? elements.previewEditor.value : elements.previewCode.textContent;
}

function schedulePreviewHighlightRefresh() {
  if (state.previewMode !== 'file' || !state.previewEditing) {
    return;
  }
  window.clearTimeout(state.previewHighlightTimer);
  state.previewHighlightTimer = window.setTimeout(refreshEditablePreviewHighlight, 120);
}

function refreshEditablePreviewHighlight() {
  if (state.previewMode !== 'file' || !state.previewEditing || !state.currentFile) {
    return;
  }
  const caretOffset = getEditableCaretOffset(elements.previewCode);
  const scrollTop = elements.previewCode.scrollTop;
  const content = getPreviewText();
  const highlighted = highlightContent(content, state.currentFile.path, 'file');
  elements.previewCode.replaceChildren(...highlighted.nodes);
  elements.previewEditor.value = content;
  renderPreviewMinimap(highlighted.marks);
  restoreEditableCaretOffset(elements.previewCode, caretOffset);
  elements.previewCode.scrollTop = scrollTop;
  requestAnimationFrame(updatePreviewMinimapViewport);
}

function getEditableCaretOffset(root) {
  const selection = window.getSelection();
  if (!selection || !selection.rangeCount) {
    return root.textContent.length;
  }
  const range = selection.getRangeAt(0);
  if (!root.contains(range.endContainer)) {
    return root.textContent.length;
  }
  const prefix = range.cloneRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(range.endContainer, range.endOffset);
  return prefix.toString().length;
}

function restoreEditableCaretOffset(root, offset) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let remaining = Math.max(0, offset);
  let node = walker.nextNode();
  while (node) {
    if (remaining <= node.nodeValue.length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    remaining -= node.nodeValue.length;
    node = walker.nextNode();
  }
  root.focus();
}

function highlightContent(content, filePath, mode) {
  if (mode === 'diff') {
    return highlightDiff(content, getFileKind(filePath).language);
  }
  if (mode === 'error') {
    return { nodes: [createToken(content, 'syntax-error')], marks: [{ line: 0, type: 'error' }] };
  }
  return highlightCode(content, getFileKind(filePath).language, state.activeSearchHit);
}

function highlightDiff(content, language = 'text') {
  const nodes = [];
  const marks = [];
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const row = document.createElement('span');
    row.className = line.startsWith('+') && !line.startsWith('+++') ? 'diff-line diff-add'
      : line.startsWith('-') && !line.startsWith('---') ? 'diff-line diff-remove'
      : line.startsWith('@@') ? 'diff-line diff-hunk'
      : 'diff-line';
    if (row.className.includes('diff-add')) {
      marks.push({ line: index, type: 'add' });
    } else if (row.className.includes('diff-remove')) {
      marks.push({ line: index, type: 'remove' });
    } else if (row.className.includes('diff-hunk')) {
      marks.push({ line: index, type: 'hunk' });
    }
    if (row.className.includes('diff-hunk')) {
      row.textContent = `${line}\n`;
    } else {
      const hasDiffPrefix = /^[ +\-]/.test(line);
      const prefix = hasDiffPrefix ? line.slice(0, 1) : '';
      const codeText = hasDiffPrefix ? line.slice(1) : line;
      if (prefix) {
        row.append(createToken(prefix, 'syntax-punctuation'));
      }
      const highlighted = highlightCode(codeText, language);
      row.append(...highlighted.nodes, document.createTextNode('\n'));
      highlighted.marks.forEach((mark) => {
        if (mark.type !== 'search') {
          marks.push({ line: index, type: mark.type });
        }
      });
    }
    nodes.push(row);
  });
  return { nodes, marks: normalizePreviewMarks(marks, lines.length) };
}

function highlightCode(content, language, searchHit = null) {
  const highlightState = createCodeHighlightState(content, language, searchHit);
  return processCodeHighlightSlice(highlightState, Number.POSITIVE_INFINITY);
}

function highlightSinglePreviewLine(content, language, searchHit = null, baseIndex = 0) {
  const highlightState = createCodeHighlightState(content, language, searchHit, { lines: [content], starts: [baseIndex] });
  const parts = [];
  const marks = [];
  let match = highlightState.pattern.exec(content);
  while (match) {
    if (match.index > highlightState.index) {
      appendPreviewParts(parts, content.slice(highlightState.index, match.index), '', searchHit, baseIndex + highlightState.index);
    }
    const tokenClass = getTokenClass(match[0], content.slice(match.index + match[0].length), language, highlightState.htmlTagOpen);
    const cssColorMatch = language === 'css' ? match[0].match(/^(#[0-9a-fA-F]{3,8}\b)(.*)$/) : null;
    if (cssColorMatch) {
      appendPreviewParts(parts, cssColorMatch[1], tokenClass, searchHit, baseIndex + match.index);
      if (cssColorMatch[2]) {
        appendPreviewParts(parts, cssColorMatch[2], getTokenClass(cssColorMatch[2], '', language, highlightState.htmlTagOpen), searchHit, baseIndex + match.index + cssColorMatch[1].length);
      }
    } else if (isQuotedString(match[0])) {
      appendQuotedPreviewParts(parts, match[0], tokenClass, searchHit, baseIndex + match.index);
    } else {
      appendPreviewParts(parts, match[0], tokenClass, searchHit, baseIndex + match.index);
    }
    if (tokenClass !== 'syntax-punctuation') {
      marks.push(tokenClass.replace('syntax-', ''));
    }
    highlightState.htmlTagOpen = getNextHtmlTagState(highlightState.htmlTagOpen, match[0], tokenClass);
    highlightState.index = match.index + match[0].length;
    match = highlightState.pattern.exec(content);
  }
  if (highlightState.index < content.length) {
    appendPreviewParts(parts, content.slice(highlightState.index), '', searchHit, baseIndex + highlightState.index);
  }
  if (searchHit && searchHit.query && getSearchHitOffsetsInText(content, searchHit.query).length) {
    marks.push('search');
  }
  return { parts, marks };
}

function appendQuotedPreviewParts(parts, value, tokenClass, searchHit, baseIndex) {
  const quote = value[0];
  if (value.length < 2 || value[value.length - 1] !== quote) {
    appendPreviewParts(parts, value, tokenClass, searchHit, baseIndex);
    return;
  }
  const content = value.slice(1, -1);
  const contentClass = tokenClass === 'syntax-json-key' ? tokenClass : 'syntax-string-content';
  appendPreviewParts(parts, quote, 'syntax-string-quote', searchHit, baseIndex);
  const pathPattern = /(https?:\/\/[^\s"'`<>)]+|\.\.?\/[\w./-]+|\/(?:[\w.-]+\/){2,}[\w./-]*|\/[\w./-]*\.[\w-]+|[a-zA-Z]:\\[^\s"'`<>)]+|(?=[\w./-]*\.)[\w.-]+\/[\w./-]+)/g;
  let index = 0;
  for (const match of content.matchAll(pathPattern)) {
    if (match.index > index) {
      appendPreviewParts(parts, content.slice(index, match.index), contentClass, searchHit, baseIndex + 1 + index);
    }
    appendPreviewParts(parts, match[0], 'syntax-path', searchHit, baseIndex + 1 + match.index);
    index = match.index + match[0].length;
  }
  if (index < content.length) {
    appendPreviewParts(parts, content.slice(index), contentClass, searchHit, baseIndex + 1 + index);
  }
  appendPreviewParts(parts, quote, 'syntax-string-quote', searchHit, baseIndex + value.length - 1);
}

function appendPreviewParts(parts, text, className, searchHit, baseIndex) {
  if (!text) {
    return;
  }
  const ranges = searchHit && searchHit.query ? getSearchHitRangesForText(text, searchHit.query, baseIndex) : [];
  let index = 0;
  ranges.forEach((range) => {
    if (range.end <= index || range.start >= text.length) {
      return;
    }
    const start = Math.max(index, range.start);
    const end = Math.min(text.length, range.end);
    if (start > index) {
      parts.push({ text: text.slice(index, start), className });
    }
    parts.push({ text: text.slice(start, end), className: className ? `${className} search-hit` : 'search-hit', searchHit: true });
    index = end;
  });
  if (index < text.length) {
    parts.push({ text: text.slice(index), className });
  }
}

function createCodeHighlightState(content, language, searchHit = null, lineIndex = createLineIndex(content)) {
  const pattern = /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/.*|#[0-9a-fA-F]{3,8}\b|#.*|<!DOCTYPE[^>]*>|&[a-zA-Z0-9#]+;|<\/?[a-zA-Z][\w:-]*|\b[a-zA-Z_$][\w$:-]*(?=\s*=)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[a-zA-Z_$][\w$]*(?=\s*\()|\b(?:async|await|const|let|var|function|return|if|else|for|while|class|import|export|from|try|catch|new|throw|true|false|null|undefined|def|with|as|self|None|True|False|public|private|static|void|int|string|boolean|document|window|return|this)\b|\b\d+(?:\.\d+)?(?:rem|em|px|vh|vw|vmin|vmax|%|s|ms|deg|turn)?\b|\b[a-zA-Z_$][\w$]*\b|[{}()[\].,;:=+\-*\/<>!&|?]+)/g;
  return {
    content,
    language,
    searchHit,
    pattern,
    nodes: [],
    marks: createLinePreviewMarks(lineIndex),
    lineIndex,
    index: 0,
    htmlTagOpen: false,
    complete: false
  };
}

function processCodeHighlightSlice(highlightState, budgetMs) {
  if (highlightState.complete) {
    return { nodes: highlightState.nodes, marks: normalizePreviewMarks(highlightState.marks, highlightState.lineIndex.lines.length) };
  }
  const started = performance.now();
  const { content, language, searchHit, pattern, nodes, marks, lineIndex } = highlightState;
  let match = pattern.exec(content);
  while (match) {
    if (match.index > highlightState.index) {
      appendSearchAwareText(nodes, content.slice(highlightState.index, match.index), searchHit, highlightState.index);
    }
    const tokenClass = getTokenClass(match[0], content.slice(match.index + match[0].length), language, highlightState.htmlTagOpen);
    const cssColorMatch = language === 'css' ? match[0].match(/^(#[0-9a-fA-F]{3,8}\b)(.*)$/) : null;
    if (cssColorMatch) {
      nodes.push(...createSearchAwareToken(cssColorMatch[1], tokenClass, searchHit, match.index));
      if (cssColorMatch[2]) {
        nodes.push(...createSearchAwareToken(cssColorMatch[2], getTokenClass(cssColorMatch[2], '', language, highlightState.htmlTagOpen), searchHit, match.index + cssColorMatch[1].length));
      }
    } else if (isQuotedString(match[0])) {
      nodes.push(...createHighlightedStringTokens(match[0], tokenClass, searchHit, match.index));
    } else {
      nodes.push(...createSearchAwareToken(match[0], tokenClass, searchHit, match.index));
    }
    if (tokenClass !== 'syntax-punctuation') {
      marks.push({ line: getLineForOffset(lineIndex.starts, match.index), type: tokenClass.replace('syntax-', '') });
    }
    highlightState.htmlTagOpen = getNextHtmlTagState(highlightState.htmlTagOpen, match[0], tokenClass);
    highlightState.index = match.index + match[0].length;
    if (performance.now() - started >= budgetMs) {
      return null;
    }
    match = pattern.exec(content);
  }
  if (highlightState.index < content.length) {
    appendSearchAwareText(nodes, content.slice(highlightState.index), searchHit, highlightState.index);
  }
  if (searchHit && searchHit.query) {
    for (const offset of getSearchHitOffsetsInText(content, searchHit.query)) {
      marks.push({ line: getLineForOffset(lineIndex.starts, offset), type: 'search' });
    }
  }
  highlightState.complete = true;
  return { nodes, marks: normalizePreviewMarks(marks, lineIndex.lines.length) };
}

function createLineIndex(content) {
  const lines = content.split('\n');
  const starts = [0];
  for (let offset = 0; offset < content.length; offset += 1) {
    if (content.charCodeAt(offset) === 10) {
      starts.push(offset + 1);
    }
  }
  return { lines, starts };
}

function getLineForOffset(lineStarts, offset) {
  let low = 0;
  let high = lineStarts.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (lineStarts[middle] <= offset) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return Math.max(0, high);
}

function getTokenClass(value, following = '', language = '', htmlTagOpen = false) {
  if (value.startsWith('//') || value.startsWith('/*') || value.startsWith('<!--') || (value.startsWith('#') && language !== 'css')) {
    return 'syntax-comment';
  }
  if (/^<!DOCTYPE/i.test(value)) {
    return 'syntax-doctype';
  }
  if (/^&[a-zA-Z0-9#]+;$/.test(value)) {
    return 'syntax-entity';
  }
  if (language === 'css' && /^#[0-9a-fA-F]{3,8}\b/.test(value)) {
    return 'syntax-number';
  }
  if (/^<\/?[a-zA-Z][\w:-]*$/.test(value)) {
    return 'syntax-tag';
  }
  if (htmlTagOpen && /^[\s/>]+$/.test(value) && value.includes('>')) {
    return 'syntax-tag';
  }
  if (value.startsWith('"') || value.startsWith("'") || value.startsWith('`')) {
    if (language === 'json' && /^\s*:/.test(following)) {
      return 'syntax-json-key';
    }
    return 'syntax-string';
  }
  if (/^\d/.test(value)) {
    return 'syntax-number';
  }
  if (/^[{}()[\].,;:=+\-*\/<>!&|?]+$/.test(value)) {
    return 'syntax-punctuation';
  }
  if (/^(async|await|const|let|var|function|return|if|else|for|while|class|import|export|from|try|catch|new|throw|true|false|null|undefined|def|with|as|self|None|True|False|public|private|static|void|int|string|boolean|this|document|window)$/.test(value)) {
    return 'syntax-keyword';
  }
  if (/^[\w$:-]+$/.test(value) && (/^\s*=/.test(following) || /[-:]|^[a-z]+[A-Z]/.test(value))) {
    return 'syntax-attribute';
  }
  if (/^[a-zA-Z_$][\w$]*$/.test(value) && /^\s*\(/.test(following)) {
    return 'syntax-function';
  }
  if (/^[a-zA-Z_$][\w$]*$/.test(value)) {
    return 'syntax-identifier';
  }
  return 'syntax-keyword';
}

function getNextHtmlTagState(htmlTagOpen, value, tokenClass) {
  if (value.startsWith('<!--') || /^<!DOCTYPE/i.test(value)) {
    return false;
  }
  if (tokenClass === 'syntax-tag' && value.startsWith('<')) {
    return !value.includes('>');
  }
  if (htmlTagOpen && value.includes('>')) {
    return false;
  }
  return htmlTagOpen;
}

function isQuotedString(value) {
  return /^("|'|`)/.test(value);
}

function createHighlightedStringTokens(value, tokenClass, searchHit = null, baseIndex = 0) {
  const quote = value[0];
  if (value.length < 2 || value[value.length - 1] !== quote) {
    return createSearchAwareToken(value, tokenClass, searchHit, baseIndex);
  }
  const content = value.slice(1, -1);
  const contentClass = tokenClass === 'syntax-json-key' ? tokenClass : 'syntax-string-content';
  const nodes = createSearchAwareToken(quote, 'syntax-string-quote', searchHit, baseIndex);
  const pathPattern = /(https?:\/\/[^\s"'`<>)]+|\.\.?\/[\w./-]+|\/(?:[\w.-]+\/){2,}[\w./-]*|\/[\w./-]*\.[\w-]+|[a-zA-Z]:\\[^\s"'`<>)]+|(?=[\w./-]*\.)[\w.-]+\/[\w./-]+)/g;
  let index = 0;
  for (const match of content.matchAll(pathPattern)) {
    if (match.index > index) {
      nodes.push(...createSearchAwareToken(content.slice(index, match.index), contentClass, searchHit, baseIndex + 1 + index));
    }
    nodes.push(...createSearchAwareToken(match[0], 'syntax-path', searchHit, baseIndex + 1 + match.index));
    index = match.index + match[0].length;
  }
  if (index < content.length) {
    nodes.push(...createSearchAwareToken(content.slice(index), contentClass, searchHit, baseIndex + 1 + index));
  }
  nodes.push(...createSearchAwareToken(quote, 'syntax-string-quote', searchHit, baseIndex + value.length - 1));
  return nodes;
}

function appendSearchAwareText(nodes, text, searchHit, baseIndex) {
  nodes.push(...createSearchAwareToken(text, '', searchHit, baseIndex));
}

function createSearchAwareToken(text, className, searchHit, baseIndex) {
  const query = searchHit && searchHit.query ? String(searchHit.query) : '';
  if (!query) {
    return className ? [createToken(text, className)] : [document.createTextNode(text)];
  }
  const ranges = getSearchHitRangesForText(text, query, baseIndex);
  if (!ranges.length) {
    return className ? [createToken(text, className)] : [document.createTextNode(text)];
  }
  const nodes = [];
  let index = 0;
  for (const range of ranges) {
    if (range.start > index) {
      nodes.push(className ? createToken(text.slice(index, range.start), className) : document.createTextNode(text.slice(index, range.start)));
    }
    const hit = createToken(text.slice(range.start, range.end), className ? `${className} search-hit` : 'search-hit');
    hit.dataset.searchHit = 'true';
    nodes.push(hit);
    index = range.end;
  }
  if (index < text.length) {
    nodes.push(className ? createToken(text.slice(index), className) : document.createTextNode(text.slice(index)));
  }
  return nodes;
}

function getSearchHitRangesForText(text, query, baseIndex) {
  const offsets = getSearchHitOffsetsInText(text, query);
  const needle = String(query || '').trim();
  return offsets.map((offset) => ({ start: offset, end: offset + needle.length }));
}

function getSearchHitOffsetsInText(text, query) {
  const value = String(text || '');
  const needle = String(query || '').trim();
  if (!needle) {
    return [];
  }
  const offsets = [];
  const lowerValue = value.toLowerCase();
  const lowerNeedle = needle.toLowerCase();
  let index = 0;
  while (index < value.length) {
    const found = lowerValue.indexOf(lowerNeedle, index);
    if (found === -1) {
      break;
    }
    offsets.push(found);
    index = found + Math.max(1, needle.length);
  }
  return offsets;
}

function normalizePreviewMarks(marks, lineCount) {
  if (!marks.length) {
    return [];
  }
  const seen = new Set();
  const total = Math.max(1, lineCount);
  const lineHeight = 100 / total;
  return marks.filter((mark) => {
    const line = Math.min(total - 1, Math.max(0, mark.line));
    const bucket = `${mark.type}:${line}`;
    if (seen.has(bucket)) {
      return false;
    }
    seen.add(bucket);
    mark.line = line;
    return true;
  }).map((mark) => ({ ...mark, lineHeight, spanLines: 1, top: `${mark.line * lineHeight}%` }));
}

function renderPreviewMinimap(marks) {
  const codeTrack = document.createElement('span');
  codeTrack.className = 'preview-minimap-track preview-minimap-code-track';
  const overviewTrack = document.createElement('span');
  overviewTrack.className = 'preview-minimap-track preview-minimap-overview-track';
  const codeTypes = new Set(['line', 'keyword', 'function', 'identifier', 'tag', 'attribute', 'doctype', 'json-key', 'path', 'entity', 'string', 'number', 'comment']);
  codeTrack.replaceChildren(...createMinimapMarkNodes(limitPreviewMarks(mergePreviewMarks(marks.filter((mark) => codeTypes.has(mark.type))), 220), 'code'));
  overviewTrack.replaceChildren(...createMinimapMarkNodes(limitPreviewMarks(mergePreviewMarks(marks.filter((mark) => !codeTypes.has(mark.type))), 180), 'overview'));
  const viewport = document.createElement('span');
  viewport.className = 'preview-minimap-viewport';
  elements.previewMinimap.replaceChildren(codeTrack, overviewTrack, viewport);
}

function createMinimapMarkNodes(marks, lane) {
  return marks.map((mark) => {
    const node = document.createElement('span');
    node.className = `preview-minimap-mark preview-minimap-${lane}-mark minimap-${mark.type}`;
    node.style.top = mark.top;
    if (mark.spanLines) {
      node.style.setProperty('--mark-lines', mark.spanLines);
    }
    if (mark.height) {
      node.style.height = mark.height;
    }
    return node;
  });
}

function mergePreviewMarks(marks) {
  if (!marks.length) {
    return [];
  }
  const priority = { search: 4, error: 4, add: 3, remove: 3, hunk: 2, comment: 2 };
  const sorted = [...marks].sort((a, b) => {
    const priorityDiff = (priority[b.type] || 1) - (priority[a.type] || 1);
    return priorityDiff || a.line - b.line;
  });
  const merged = [];
  sorted.forEach((mark) => {
    const top = parseFloat(mark.top);
    if (mark.type === 'line') {
      merged.push({ ...mark, start: top, end: top, startLine: mark.line, endLine: mark.line });
      return;
    }
    const existing = merged.find((item) => item.type === mark.type && mark.line - item.endLine <= 1);
    if (existing) {
      existing.endLine = Math.max(existing.endLine, mark.line);
      existing.end = Math.max(existing.end, top);
      existing.spanLines = existing.endLine - existing.startLine + 1;
      return;
    }
    merged.push({ ...mark, start: top, end: top, startLine: mark.line, endLine: mark.line });
  });
  return merged.sort((a, b) => a.start - b.start).map(({ start, end, startLine, endLine, lineHeight, ...mark }) => mark);
}

function limitPreviewMarks(marks, maxMarks) {
  if (marks.length <= maxMarks) {
    return marks;
  }
  const limited = [];
  const lastIndex = marks.length - 1;
  const selected = new Set();
  for (let index = 0; index < maxMarks; index += 1) {
    const sourceIndex = Math.round((index / Math.max(1, maxMarks - 1)) * lastIndex);
    if (!selected.has(sourceIndex)) {
      selected.add(sourceIndex);
      limited.push(marks[sourceIndex]);
    }
  }
  return limited;
}

function updatePreviewMinimapViewport() {
  const viewport = elements.previewMinimap.querySelector('.preview-minimap-viewport');
  const source = state.previewMode === 'empty' ? elements.previewEditor : elements.previewCode;
  if (!viewport || !source) {
    return;
  }
  const total = Math.max(1, source.scrollHeight);
  const visibleRatio = Math.min(1, source.clientHeight / total);
  const topRatio = source.scrollTop / Math.max(1, source.scrollHeight - source.clientHeight);
  viewport.style.height = `${Math.max(7, visibleRatio * 100)}%`;
  viewport.style.top = `${Math.min(100 - visibleRatio * 100, topRatio * (100 - visibleRatio * 100))}%`;
}

function createToken(text, className) {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function createFileLabel(name) {
  const label = document.createElement('span');
  label.textContent = name;
  return label;
}

function createFolderIcon(collapsed) {
  const icon = document.createElement('span');
  icon.className = 'file-icon folder-icon';
  icon.textContent = collapsed ? 'DIR' : 'DIR';
  icon.title = 'Folder';
  icon.setAttribute('data-help', 'help.folderIcon');
  return icon;
}

function createFileIcon(filePath) {
  const meta = getFileKind(filePath);
  const icon = document.createElement('span');
  icon.className = `file-icon file-icon-${meta.kind}`;
  icon.textContent = meta.label;
  icon.title = meta.title;
  icon.setAttribute('data-help', 'help.fileIcon');
  icon.setAttribute('aria-label', meta.title);
  return icon;
}

function getFileKind(filePath) {
  const lower = String(filePath || '').toLowerCase();
  const name = lower.split(/[\\/]/).pop() || '';
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
  const map = {
    js: ['code', 'js', 'JavaScript', 'javascript'], mjs: ['code', 'js', 'JavaScript', 'javascript'], cjs: ['code', 'js', 'JavaScript', 'javascript'],
    ts: ['code', 'ts', 'TypeScript', 'javascript'], jsx: ['code', 'jsx', 'React', 'javascript'], tsx: ['code', 'tsx', 'React TS', 'javascript'],
    json: ['data', '{}', 'JSON', 'json'], css: ['style', 'css', 'CSS', 'css'], html: ['markup', '<>', 'HTML', 'html'], md: ['doc', 'md', 'Markdown', 'markdown'],
    py: ['code', 'py', 'Python', 'python'], cmd: ['shell', 'bat', 'Batch', 'shell'], bat: ['shell', 'bat', 'Batch', 'shell'], ps1: ['shell', 'ps', 'PowerShell', 'shell'],
    png: ['image', 'img', 'Image', 'image'], jpg: ['image', 'img', 'Image', 'image'], jpeg: ['image', 'img', 'Image', 'image'], gif: ['image', 'img', 'Image', 'image'], svg: ['image', 'svg', 'SVG', 'xml'],
    lock: ['lock', 'lock', 'Lockfile', 'text'], yml: ['data', 'yml', 'YAML', 'yaml'], yaml: ['data', 'yml', 'YAML', 'yaml']
  };
  const configNames = new Set(['package.json', 'vite.config.mjs', 'config.ini', 'readme.md']);
  const found = map[ext] || (configNames.has(name) ? ['config', 'cfg', 'Config', 'text'] : ['text', 'txt', 'Text', 'text']);
  return { kind: found[0], label: found[1], title: found[2], language: found[3] };
}

function setPreviewActive(active) {
  document.body.classList.toggle('preview-active', active);
}

function bindResizeHandle(handle, onMove) {
  handle.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    try {
      handle.setPointerCapture(event.pointerId);
    } catch {
      // Some synthetic or browser edge-case pointer events cannot be captured.
    }
    document.body.classList.add('is-resizing');
    const move = (moveEvent) => onMove(moveEvent);
    const stop = () => {
      document.body.classList.remove('is-resizing');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
  });
}

function resizeSidebar(event) {
  if (window.matchMedia('(max-width: 760px) and (min-height: 431px)').matches) {
    const shellRect = elements.appShell.getBoundingClientRect();
    const { min, max } = getMainPanelBlockBounds();
    const sidePanelHeight = clamp(event.clientY - shellRect.top - getTopbarSize(), min, max);
    elements.appShell.style.setProperty('--side-panel-size', `${Math.round(sidePanelHeight)}px`);
    clampWorkbenchSizes();
    return;
  }
  const shellRect = elements.appShell.getBoundingClientRect();
  const railPixels = getRailSize();
  const { min, max } = getSidebarInlineBounds();
  const sidebarWidth = clamp(event.clientX - shellRect.left - railPixels, min, max);
  elements.appShell.style.setProperty('--sidebar-size', `${Math.round(sidebarWidth)}px`);
  clampWorkbenchSizes();
}

function resizePreview(event) {
  const chatRect = elements.chatPanel.getBoundingClientRect();
  if (window.matchMedia('(max-width: 760px)').matches) {
    const { min, max } = getMobilePreviewBounds();
    const previewHeight = clamp(event.clientY - chatRect.top, min, max);
    elements.appShell.style.setProperty('--preview-size', `${Math.round(previewHeight)}px`);
    return;
  }
  const { min, max } = getConversationInlineBounds();
  const conversationWidth = clamp(chatRect.right - event.clientX, min, max);
  elements.appShell.style.setProperty('--conversation-size', `${Math.round(conversationWidth)}px`);
}

function resizeComposer(event) {
  const chatRect = elements.chatPanel.getBoundingClientRect();
  const { min, max } = getComposerBounds();
  const composerHeight = clamp(chatRect.bottom - event.clientY, min, max);
  elements.appShell.style.setProperty('--composer-size', `${Math.round(composerHeight)}px`);
  clampMobilePreviewSize();
  updateContextPanelSize();
}

function getMobilePreviewBounds() {
  const chatRect = elements.chatPanel.getBoundingClientRect();
  const composerRect = elements.composer.getBoundingClientRect();
  const handleSize = getResizeTrackSize();
  const composerHandleSize = getComposerResizeTrackSize();
  const available = chatRect.height - composerRect.height - handleSize;
  const min = getPreviewMinimumBlockSize();
  const minConversation = getConversationMinimumBlockSize();
  const max = Math.max(min, available - minConversation - composerHandleSize);
  return { min, max };
}

function getComposerBounds() {
  const chatRect = elements.chatPanel.getBoundingClientRect();
  const previewRect = elements.previewPanel.getBoundingClientRect();
  const min = getComposerMinimumBlockSize();
  const reserved = window.matchMedia('(max-width: 760px)').matches
    ? previewRect.height + getResizeTrackSize() + getComposerResizeTrackSize() + getConversationMinimumBlockSize()
    : getComposerResizeTrackSize() + getConversationMinimumBlockSize();
  const max = Math.max(min, chatRect.height - reserved);
  return { min, max };
}

function getMainPanelBlockBounds() {
  const shellRect = elements.appShell.getBoundingClientRect();
  const topbarSize = getTopbarSize();
  const helpSize = getHelpPanelSize();
  const handleSize = getResizeTrackSize();
  const available = shellRect.height - topbarSize - helpSize - handleSize;
  const min = getSidePanelMinimumBlockSize();
  const max = Math.max(min, available - getChatPanelMinimumBlockSize());
  return { min, max };
}

function getSidebarInlineBounds() {
  const shellRect = elements.appShell.getBoundingClientRect();
  const handleWidth = getResizeTrackSize();
  const available = shellRect.width - getRailSize() - handleWidth;
  const min = getSidePanelMinimumInlineSize();
  const max = Math.max(min, available - getChatPanelMinimumInlineSize());
  return { min, max };
}

function getConversationInlineBounds() {
  const chatRect = elements.chatPanel.getBoundingClientRect();
  const handleWidth = getResizeTrackSize();
  const min = getConversationMinimumInlineSize();
  const max = Math.max(min, chatRect.width - handleWidth - getPreviewMinimumInlineSize());
  return { min, max };
}

function getSidePanelMinimumBlockSize() {
  const tabs = getBlockSize(document.querySelector('.panel-tabs'));
  const activePanel = document.querySelector('.panel-section.active');
  const header = getBlockSize(activePanel?.querySelector('.panel-section-header'));
  const body = activePanel?.querySelector('.panel-section-body');
  const bodyExtras = getBlockExtras(body);
  const firstGroup = getBlockSize(activePanel?.querySelector('.panel-group'));
  const status = getBlockSize(activePanel?.querySelector('.form-status'));
  const row = getControlBlockSize(activePanel);
  return tabs + header + bodyExtras + Math.max(firstGroup, row * 2) + status;
}

function getChatPanelMinimumBlockSize() {
  return getPreviewMinimumBlockSize() + getResizeTrackSize() + getConversationMinimumBlockSize() + getComposerResizeTrackSize() + getComposerMinimumBlockSize();
}

function getPreviewMinimumBlockSize() {
  return getBlockSize(document.querySelector('.preview-heading')) + getControlBlockSize(elements.previewPanel) + getBlockExtras(document.querySelector('.preview-workspace'));
}

function getConversationMinimumBlockSize() {
  return getControlBlockSize(elements.messages);
}

function getComposerMinimumBlockSize() {
  return getControlBlockSize(elements.messageInput) + getBlockExtras(elements.composer);
}

function getSidePanelMinimumInlineSize() {
  const activePanel = document.querySelector('.panel-section.active');
  const group = activePanel?.querySelector('.panel-group');
  return getControlBlockSize(activePanel) * 4 + getInlineExtras(group) + getInlineExtras(activePanel?.querySelector('.panel-section-body'));
}

function getChatPanelMinimumInlineSize() {
  const handleWidth = window.matchMedia('(max-width: 760px)').matches ? 0 : getInlineSize(elements.previewResizeHandle);
  return getPreviewMinimumInlineSize() + handleWidth + getConversationMinimumInlineSize();
}

function getPreviewMinimumInlineSize() {
  const heading = document.querySelector('.preview-heading');
  const action = document.querySelector('.preview-actions button');
  return getControlBlockSize(heading) + getControlBlockSize(action?.parentElement) * 2 + getInlineExtras(heading);
}

function getConversationMinimumInlineSize() {
  const controls = document.querySelector('.composer-controls');
  return getControlBlockSize(controls) * 3 + getControlBlockSize(elements.messageInput) + getInlineExtras(elements.composer);
}

function getTopbarSize() {
  return getBlockSize(document.querySelector('.topbar'));
}

function getHelpPanelSize() {
  return getBlockSize(document.querySelector('.help-panel'));
}

function getRailSize() {
  return getInlineSize(document.querySelector('.activity-rail'));
}

function getResizeTrackSize() {
  return toPixels(getComputedStyle(document.documentElement).getPropertyValue('--resize-track-size'));
}

function getComposerResizeTrackSize() {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--composer-resize-track-size');
  return value.trim() ? toPixels(value) : getBlockSize(elements.composerResizeHandle);
}

function getBlockSize(element) {
  return element ? element.getBoundingClientRect().height : 0;
}

function getInlineSize(element) {
  return element ? element.getBoundingClientRect().width : 0;
}

function getScrollInlineSize(element) {
  return element ? element.scrollWidth : 0;
}

function getControlBlockSize(root) {
  const control = root?.querySelector('textarea, input, select, button, .text-button, .tree-folder-button, .message');
  if (!control) {
    return getControlTokenSize();
  }
  return control.getBoundingClientRect().height;
}

function getControlInlineSize(root) {
  const control = root?.querySelector('textarea, input, select, button, .text-button, .tree-folder-button, .message');
  if (control) {
    return Math.max(getScrollInlineSize(control), getControlBlockSize(root));
  }
  return getControlTokenSize();
}

function getControlTokenSize() {
  return toPixels(getComputedStyle(document.documentElement).getPropertyValue('--control-h'));
}

function getBlockExtras(element) {
  if (!element) {
    return 0;
  }
  const style = getComputedStyle(element);
  return toPixels(style.paddingTop) + toPixels(style.paddingBottom) + toPixels(style.borderTopWidth) + toPixels(style.borderBottomWidth);
}

function getInlineExtras(element) {
  if (!element) {
    return 0;
  }
  const style = getComputedStyle(element);
  return toPixels(style.paddingLeft) + toPixels(style.paddingRight) + toPixels(style.borderLeftWidth) + toPixels(style.borderRightWidth);
}

function toPixels(value) {
  const number = parseFloat(value);
  if (!Number.isFinite(number)) {
    return 0;
  }
  if (String(value).trim().endsWith('px')) {
    return number;
  }
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.width = String(value).trim();
  document.body.append(probe);
  const pixels = probe.getBoundingClientRect().width;
  probe.remove();
  return pixels || number;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function t(key, values = {}) {
  const table = i18n[state.language] || i18n.zh;
  let text = table[key] || i18n.en[key] || key;
  for (const [name, value] of Object.entries(values)) {
    text = text.replace(`{${name}}`, value);
  }
  return text;
}

function updateModelControls() {
  const running = isRuntimeRunning();
  elements.setModelButton.disabled = !running || !state.models.length;
}

function renderMessages(options = {}) {
  const preserveScroll = Boolean(options.preserveScroll);
  const stickToBottom = Boolean(options.stickToBottom);
  const previousScrollTop = elements.messages.scrollTop;
  const previousScrollBottom = elements.messages.scrollHeight - elements.messages.clientHeight - previousScrollTop;
  const renderableMessages = getRenderableMessages(state.messages);
  renderConversationNotices(renderableMessages);
  const signature = getMessagesRenderSignature();
  if (elements.messages.dataset.renderSignature !== signature) {
    const nodes = renderableMessages.map((message, index) => renderMessage(message, getRenderableMessageSourceIndex(message, index)));
    elements.messages.replaceChildren(...nodes);
    elements.messages.dataset.renderSignature = signature;
  }
  if (stickToBottom) {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  } else if (preserveScroll) {
    const maxScrollTop = Math.max(0, elements.messages.scrollHeight - elements.messages.clientHeight);
    elements.messages.scrollTop = Math.min(previousScrollTop, maxScrollTop);
  } else if (previousScrollBottom <= 4) {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }
}

function scheduleRenderMessages(options = {}) {
  state.pendingMessagesRenderOptions = mergeRenderOptions(state.pendingMessagesRenderOptions, options);
  if (state.messagesRenderRaf) {
    return;
  }
  state.messagesRenderRaf = requestAnimationFrame(() => {
    state.messagesRenderRaf = 0;
    const pendingOptions = state.pendingMessagesRenderOptions || {};
    state.pendingMessagesRenderOptions = null;
    renderMessages(pendingOptions);
  });
}

function mergeRenderOptions(previous = {}, next = {}) {
  const previousOptions = previous || {};
  const nextOptions = next || {};
  return {
    preserveScroll: Boolean(previousOptions.preserveScroll || nextOptions.preserveScroll),
    stickToBottom: Boolean(previousOptions.stickToBottom || nextOptions.stickToBottom)
  };
}

function getMessagesRenderSignature() {
  const renderableMessages = getRenderableMessages(state.messages);
  return JSON.stringify({
    source: state.messageSource,
    truncated: state.messagesTruncated,
    readOnly: state.messagesReadOnly,
    copied: state.copiedMessageId,
    draft: state.messageDraft,
    editCheckpoint: state.editCheckpoint,
    messages: renderableMessages.map((message, index) => ({
      id: getMessageId(message, getRenderableMessageSourceIndex(message, index)),
      role: normalizeMessageRole(message.role),
      content: message.content,
      thinking: message.thinking || '',
      status: message.status || '',
      timestamp: message.timestamp || '',
      model: message.model || null,
      tools: getMessageStepTools(message),
      inProgress: Boolean(message.inProgress),
      error: Boolean(message.error),
      sessionHistory: Boolean(message.sessionHistory)
    }))
  });
}

function renderConversationNotices(renderableMessages) {
  const notices = [];
  if (state.messageSource === 'session') {
    notices.push({ id: 'session-history', tone: 'info', content: state.messagesTruncated ? `${t('messages.sessionHistory')} ${t('messages.sessionHistoryTruncated')}` : t('messages.sessionHistory') });
  }
  if (!renderableMessages.length) {
    notices.push({ id: 'empty', tone: 'muted', content: t('messages.empty') });
  }
  notices.push(...state.conversationNotices);
  if (state.messageDraft) {
    notices.push({ id: 'message-draft', tone: 'action', content: t('messages.editingCheckpoint'), actions: [{ text: t('actions.cancelEdit'), attr: 'data-cancel-message-draft' }] });
  }
  if (shouldRenderEditCheckpointNotice()) {
    const files = state.editCheckpoint.files || [];
    notices.push({
      id: 'edit-checkpoint',
      tone: 'action',
      content: t('messages.editCheckpointPending', { count: files.length }),
      files,
      checkpointId: state.editCheckpoint.id,
      actions: [
        { text: t('actions.acceptEdits'), attr: 'data-accept-edit-checkpoint' },
        { text: t('actions.restoreEdits'), attr: 'data-restore-edit-checkpoint' }
      ]
    });
  }
  const signature = JSON.stringify(notices);
  if (elements.conversationNotices.dataset.renderSignature !== signature) {
    elements.conversationNotices.replaceChildren(...notices.map(renderConversationNotice));
    elements.conversationNotices.dataset.renderSignature = signature;
  }
  elements.conversationNotices.hidden = !notices.length;
}

function renderConversationNotice(notice) {
  const node = document.createElement('div');
  node.className = `conversation-notice conversation-notice-${notice.tone || 'info'}`;
  const text = document.createElement('span');
  text.className = 'conversation-notice-text';
  text.textContent = notice.content || '';
  node.append(text);
  if (Array.isArray(notice.files) && notice.files.length) {
    node.append(renderEditCheckpointFiles(notice.checkpointId, notice.files));
  }
  if (Array.isArray(notice.actions) && notice.actions.length) {
    const actions = document.createElement('span');
    actions.className = 'message-actions';
    for (const action of notice.actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'message-action-button';
      button.textContent = action.text || '';
      button.setAttribute(action.attr, '1');
      actions.append(button);
    }
    node.append(actions);
  }
  return node;
}

function renderEditCheckpointFiles(checkpointId, files) {
  const list = document.createElement('div');
  list.className = 'edit-checkpoint-files';
  files.slice(0, 8).forEach((file) => list.append(renderEditCheckpointFile(checkpointId, file)));
  if (files.length > 8) {
    const more = document.createElement('span');
    more.className = 'edit-checkpoint-more';
    more.textContent = t('messages.stepMore', { count: files.length - 8 });
    list.append(more);
  }
  return list;
}

function renderEditCheckpointFile(checkpointId, file) {
  const path = normalizeGitPath(file && file.path);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'edit-checkpoint-file';
  button.dataset.editCheckpointId = checkpointId;
  button.dataset.editCheckpointPath = path;
  button.title = t('messages.editCheckpointFileDiff', { path });
  button.setAttribute('aria-label', button.title);
  button.append(createFileIcon(path));
  const name = document.createElement('span');
  name.className = 'edit-checkpoint-file-path';
  name.textContent = path;
  button.append(name, renderDiffStats(file && file.stats));
  return button;
}

function getRenderableMessages(messages) {
  const result = [];
  let lastAssistant = null;
  for (const [index, message] of (messages || []).entries()) {
    if (isStandaloneToolMessage(message)) {
      const tool = toolMessageToStep(message, result.length);
      if (tool && lastAssistant) {
        lastAssistant.tools = mergeToolLists(lastAssistant.tools, [tool]);
        continue;
      }
      if (tool) {
        const wrapper = {
          role: 'assistant',
          content: '',
          timestamp: message.timestamp || null,
          sessionHistory: Boolean(message.sessionHistory),
          __sourceIndex: index,
          tools: [tool]
        };
        result.push(wrapper);
        lastAssistant = wrapper;
        continue;
      }
    }
    const nextMessage = { ...message };
    nextMessage.__sourceIndex = index;
    if (normalizeMessageRole(nextMessage.role) === 'assistant') {
      nextMessage.tools = getMessageStepTools(nextMessage);
      if (lastAssistant && isAssistantStepOnlyMessage(nextMessage)) {
        lastAssistant.tools = mergeToolLists(lastAssistant.tools, nextMessage.tools);
        lastAssistant.timestamp = lastAssistant.timestamp || nextMessage.timestamp || null;
        continue;
      }
      lastAssistant = nextMessage;
    } else {
      lastAssistant = null;
    }
    result.push(nextMessage);
  }
  return result;
}

function getRenderableMessageSourceIndex(message, fallbackIndex) {
  return Number.isInteger(message && message.__sourceIndex) ? message.__sourceIndex : fallbackIndex;
}

function renderMessage(message, index) {
  const role = normalizeMessageRole(message.role);
  const actionable = index >= 0;
  const node = document.createElement('article');
  node.className = `message ${role}${message.inProgress ? ' is-generating' : ''}${message.error ? ' is-error' : ''}`;
  const header = document.createElement('header');
  header.className = 'message-header';
  const meta = document.createElement('span');
  meta.className = 'message-meta';
  meta.textContent = getMessageMeta(message, role);
  const detail = getMessageHeaderDetail(message);
  if (detail) {
    const detailNode = document.createElement('span');
    detailNode.className = 'message-header-detail';
    detailNode.textContent = detail;
    meta.append(document.createTextNode(' · '), detailNode);
  }
  const actions = document.createElement('span');
  actions.className = 'message-actions';
  if (actionable) {
    if (canEditFromMessage(message)) {
      actions.append(createMessageActionButton('checkpoint', index, t('actions.checkpoint')));
      actions.append(createMessageActionButton('edit', index, t('actions.editResend')));
    }
    actions.append(createMessageActionButton('copy', index, state.copiedMessageId === getMessageId(message, index) ? t('messages.copied') : t('actions.copy')));
  }
  header.append(meta, actions);
  const body = document.createElement('div');
  body.className = 'message-body';
  body.append(...createMessageBodyNodes(message));
  node.append(header, body);
  return node;
}

function shouldRenderEditCheckpointNotice() {
  return Boolean(state.editCheckpoint && state.editCheckpoint.id && !state.editCheckpoint.accepted && Array.isArray(state.editCheckpoint.files) && state.editCheckpoint.files.length);
}

function createMessageActionButton(action, index, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'message-action-button';
  button.textContent = label;
  button.setAttribute(`data-message-${action}`, String(index));
  return button;
}

function getMessageMeta(message, role) {
  if (message.role === 'toolResult') {
    return message.toolName ? `${t('messages.toolResult')} · ${message.toolName}` : t('messages.toolResult');
  }
  const roleLabel = t(`messages.${role}`);
  if (role === 'assistant') {
    const model = getMessageModelLabel(message);
    return model ? `${roleLabel} · ${t('messages.model', { model })}` : roleLabel;
  }
  return roleLabel;
}

function getMessageHeaderDetail(message) {
  const parts = [message.status, formatDateTime(message.timestamp)].filter(Boolean);
  return parts.join(' · ');
}

function getMessageModelLabel(message) {
  if (message.model) {
    return typeof message.model === 'string' ? message.model : `${message.model.provider || ''}/${message.model.id || ''}`.replace(/^\//, '');
  }
  const current = elements.currentModel.textContent.trim();
  return current && current !== '-' ? current : '';
}

function createMessageBodyNodes(message) {
  const nodes = [];
  const thinking = getMessageThinking(message);
  if (thinking) {
    nodes.push(createMessageDetails(t('messages.thinking'), thinking, 'thinking-block'));
  }
  if (message.role === 'toolResult') {
    nodes.push(createToolBlock(t(message.sessionHistory ? 'messages.historyToolResult' : 'messages.toolResult'), message.toolName || 'tool', extractContentText(message.content) || stringifyToolPayload(message.details || message)));
    return nodes;
  }
  const contentNodes = createContentNodes(message.content);
  if (contentNodes.length) {
    nodes.push(...contentNodes);
  }
  const tools = getMessageStepTools(message);
  if (tools.length) {
    nodes.push(createStepsBlock(tools, Boolean(message.inProgress)));
  }
  if (!nodes.length && message.inProgress && message.status) {
    nodes.push(createTextBlock(message.status));
  }
  if (!nodes.length) {
    nodes.push(createTextBlock(getMessageText(message)));
  }
  return nodes;
}

function createContentNodes(content) {
  if (typeof content === 'string') {
    return createStringContentNodes(content);
  }
  if (!Array.isArray(content)) {
    return content ? [createTextBlock(JSON.stringify(content, null, 2))] : [];
  }
  const nodes = [];
  for (const item of content) {
    if (item.type === 'toolCall' || item.type === 'toolResult') {
      continue;
    }
    if (item.thinking) {
      nodes.push(createMessageDetails(t('messages.thinking'), item.thinking, 'thinking-block'));
      continue;
    }
    nodes.push(createTextBlock(item.text || stringifyToolPayload(item)));
  }
  return nodes;
}

function createStringContentNodes(content) {
  if (!content) {
    return [];
  }
  const segments = splitToolTranscriptContent(content);
  if (!segments.length) {
    return [createTextBlock(content)];
  }
  return segments.filter((segment) => segment.type === 'text' && segment.text).map((segment) => createTextBlock(segment.text));
}

function splitToolTranscriptContent(content) {
  const pattern = /^\*\*([^\n*]+)\*\*\s*\n+```[\w-]*\n([\s\S]*?)```/gm;
  const segments = [];
  let toolItems = [];
  let cursor = 0;
  let match;
  const flushTools = () => {
    if (toolItems.length) {
      segments.push({ type: 'tools', tools: toolItems });
      toolItems = [];
    }
  };
  while ((match = pattern.exec(content))) {
    const leadingText = content.slice(cursor, match.index).trim();
    if (leadingText) {
      flushTools();
      segments.push({ type: 'text', text: leadingText });
    }
    const titleParts = parseTranscriptStepTitle(match[1]);
    toolItems.push({
      id: `transcript-tool-${match.index}`,
      name: titleParts.name,
      status: normalizeTranscriptStepStatus(titleParts.kind),
      kind: titleParts.kind,
      text: match[2].trim()
    });
    cursor = pattern.lastIndex;
  }
  const trailingText = content.slice(cursor).trim();
  if (trailingText) {
    flushTools();
    segments.push({ type: 'text', text: trailingText });
  } else {
    flushTools();
  }
  return segments.some((segment) => segment.type === 'tools') ? segments : [];
}

function parseTranscriptStepTitle(title) {
  const parts = String(title || '').split(/\s+[·-]\s+/);
  return {
    name: (parts[0] || '').trim() || 'tool',
    kind: (parts.slice(1).join(' · ') || 'call').trim()
  };
}

function normalizeTranscriptStepStatus(kind) {
  const value = String(kind || '').trim().toLowerCase();
  if (value.includes('result') || value.includes('done') || value.includes('complete')) {
    return 'result';
  }
  if (value.includes('error') || value.includes('fail')) {
    return 'failed';
  }
  return value || 'call';
}

function createTextBlock(text) {
  const node = document.createElement('div');
  node.className = 'message-text';
  node.append(...createMarkdownNodes(String(text || '')));
  return node;
}

function createMarkdownNodes(text) {
  const source = String(text || '').replace(/\r\n/g, '\n');
  if (!source.trim()) {
    return [document.createTextNode('')];
  }
  const nodes = [];
  const lines = source.split('\n');
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }
    const fenceMatch = line.match(/^```([\w-]*)\s*$/);
    if (fenceMatch) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      nodes.push(createCodeBlock(codeLines.join('\n'), fenceMatch[1]));
      continue;
    }
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      nodes.push(document.createElement('hr'));
      index += 1;
      continue;
    }
    const headingMatch = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (headingMatch) {
      const heading = document.createElement(`h${headingMatch[1].length}`);
      heading.append(...createInlineMarkdownNodes(headingMatch[2]));
      nodes.push(heading);
      index += 1;
      continue;
    }
    if (/^\s{0,3}>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s{0,3}>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s{0,3}>\s?/, ''));
        index += 1;
      }
      const quote = document.createElement('blockquote');
      createMarkdownNodes(quoteLines.join('\n')).forEach((child) => quote.append(child));
      nodes.push(quote);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const list = document.createElement('ul');
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index])) {
        const item = document.createElement('li');
        item.append(...createInlineMarkdownNodes(lines[index].replace(/^\s*[-*+]\s+/, '')));
        list.append(item);
        index += 1;
      }
      nodes.push(list);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const list = document.createElement('ol');
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index])) {
        const item = document.createElement('li');
        item.append(...createInlineMarkdownNodes(lines[index].replace(/^\s*\d+[.)]\s+/, '')));
        list.append(item);
        index += 1;
      }
      nodes.push(list);
      continue;
    }
    const paragraphLines = [];
    while (index < lines.length && lines[index].trim() && !/^```/.test(lines[index]) && !/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(lines[index]) && !/^\s{0,3}#{1,6}\s+/.test(lines[index]) && !/^\s{0,3}>\s?/.test(lines[index]) && !/^\s*[-*+]\s+/.test(lines[index]) && !/^\s*\d+[.)]\s+/.test(lines[index])) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    const paragraph = document.createElement('p');
    paragraphLines.forEach((paragraphLine, lineIndex) => {
      if (lineIndex) {
        paragraph.append(document.createElement('br'));
      }
      paragraph.append(...createInlineMarkdownNodes(paragraphLine));
    });
    nodes.push(paragraph);
  }
  return nodes;
}

function createInlineMarkdownNodes(text) {
  const nodes = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) {
      nodes.push(...createMessagePathNodes(text.slice(cursor, match.index)));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      const strong = document.createElement('strong');
      strong.append(...createMessagePathNodes(token.slice(2, -2)));
      nodes.push(strong);
    } else {
      const codeText = token.slice(1, -1);
      const parsedPath = normalizeMessagePathToken(codeText);
      if (parsedPath) {
        nodes.push(createMessagePathToken(parsedPath));
        cursor = pattern.lastIndex;
        continue;
      }
      const code = document.createElement('code');
      code.textContent = codeText;
      nodes.push(code);
    }
    cursor = pattern.lastIndex;
  }
  if (cursor < text.length) {
    nodes.push(...createMessagePathNodes(text.slice(cursor)));
  }
  return nodes;
}

function createMessagePathNodes(text) {
  const value = String(text || '');
  const pattern = /(?:[A-Za-z]:[\\/])?[-\w.()[\]@]+(?:[\\/][-\w.()[\]@]+)+[\\/]?(?:#L\d+(?:-L?\d+)?)?|[-\w()[\]@]+\.[A-Za-z0-9]+(?:#L\d+(?:-L?\d+)?)?/g;
  const nodes = [];
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    if (!isMessagePathMatchBoundary(value, match.index, match[0])) {
      continue;
    }
    if (match.index > cursor) {
      nodes.push(document.createTextNode(value.slice(cursor, match.index)));
    }
    const parsed = normalizeMessagePathToken(match[0]);
    nodes.push(parsed ? createMessagePathToken(parsed) : document.createTextNode(match[0]));
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) {
    nodes.push(document.createTextNode(value.slice(cursor)));
  }
  return nodes;
}

function isMessagePathMatchBoundary(value, index, token) {
  const before = index > 0 ? value[index - 1] : '';
  const after = value[index + token.length] || '';
  return !/[\w/\\.-]/.test(before) && !/[\w/\\-]/.test(after);
}

function normalizeMessagePathToken(rawPath) {
  const source = String(rawPath || '');
  const trailing = source.match(/[.,;:!?)]$/) ? source.slice(-1) : '';
  const withoutTrailing = trailing ? source.slice(0, -1) : source;
  const hasTrailingSlash = /[\\/]$/.test(withoutTrailing);
  const lineMatch = withoutTrailing.match(/#L\d+(?:-L?\d+)?$/);
  const line = lineMatch ? lineMatch[0] : '';
  const path = withoutTrailing.slice(0, line ? -line.length : undefined).split('\\').join('/').replace(/^([A-Za-z]:)?\/+/, '').replace(/^\.\//, '').replace(/\/$/, '');
  if (!path) {
    return null;
  }
  if (!path.includes('/')) {
    const bareFile = findProjectFileByBareName(path);
    return bareFile ? { ...bareFile, line, trailing } : null;
  }
  const item = findProjectTreeItem(path);
  if (!item) {
    if (isLikelyProjectFolderPath(path, hasTrailingSlash)) {
      return { type: 'folder', path, line, trailing };
    }
    if (isLikelyProjectFilePath(path)) {
      return { type: 'file', path, line, trailing };
    }
    return null;
  }
  return { ...item, line, trailing };
}

function isLikelyProjectFolderPath(path, hasTrailingSlash) {
  return Boolean(state.projectTree?.truncated && hasTrailingSlash && String(path || '').includes('/'));
}

function isLikelyProjectFilePath(path) {
  const value = String(path || '');
  if (!state.projectTree?.truncated || !value.includes('/')) {
    return false;
  }
  const fileName = value.split('/').pop() || '';
  return /\.[A-Za-z0-9]+$/.test(fileName);
}

function createMessagePathToken(item) {
  const fragment = document.createDocumentFragment();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `message-path-token ${item.type === 'folder' ? 'message-path-folder' : 'message-path-file'}`;
  button.dataset.messagePath = item.path;
  button.dataset.messagePathType = item.type;
  if (item.editCheckpointFile && item.editCheckpointFile.checkpointId) {
    button.dataset.editCheckpointId = item.editCheckpointFile.checkpointId;
    button.dataset.editCheckpointPath = item.editCheckpointFile.path;
    button.classList.add('message-path-edit-diff');
    button.title = t('messages.editCheckpointFileDiff', { path: item.editCheckpointFile.path });
    button.setAttribute('aria-label', button.title);
  }
  if (item.line) {
    button.dataset.messagePathLine = item.line;
  }
  button.setAttribute('data-help', item.type === 'folder' ? 'help.folderIcon' : 'help.openChangedFile');
  button.append(item.type === 'folder' ? createFolderIcon(true) : createFileIcon(item.path), document.createTextNode(item.line ? `${item.path}${item.line}` : item.path));
  if (item.editCheckpointFile) {
    button.append(renderDiffStats(item.editCheckpointFile.stats));
  }
  fragment.append(button);
  if (item.trailing) {
    fragment.append(document.createTextNode(item.trailing));
  }
  return fragment;
}

function findProjectTreeItem(path) {
  const normalized = String(path || '').split('\\').join('/').replace(/^\.\//, '').replace(/\/$/, '');
  const entries = state.projectTree && Array.isArray(state.projectTree.entries) ? state.projectTree.entries : [];
  return findProjectTreeItemInEntries(entries, normalized) || findProjectTreeItemBySuffix(entries, normalized);
}

function findProjectFileByBareName(fileName) {
  const name = String(fileName || '').split('/').pop();
  if (!name || !/\.[A-Za-z0-9]+$/.test(name)) {
    return null;
  }
  const priorityGroups = [
    [state.currentFile?.path, state.activeChangePath, ...getContextFilePaths()],
    getGitStatusFilePaths(),
    collectProjectFilePaths(state.projectTree && Array.isArray(state.projectTree.entries) ? state.projectTree.entries : [])
  ];
  for (const group of priorityGroups) {
    const matches = getUniqueFileNameMatches(group, name);
    if (matches.length === 1) {
      return { type: 'file', path: matches[0] };
    }
    if (matches.length > 1) {
      return null;
    }
  }
  return null;
}

function getGitStatusFilePaths() {
  const files = state.gitStatus && Array.isArray(state.gitStatus.files) ? state.gitStatus.files : [];
  return files.map((file) => file.path);
}

function getUniqueFileNameMatches(paths, fileName) {
  const matches = new Set();
  for (const path of paths || []) {
    const normalized = String(path || '').split('\\').join('/').replace(/^\.\//, '').replace(/\/$/, '');
    if (normalized.split('/').pop() === fileName) {
      matches.add(normalized);
    }
  }
  return [...matches];
}

function findProjectTreeItemInEntries(entries, path) {
  for (const entry of entries) {
    const entryPath = String(entry.path || '').replace(/\/$/, '');
    if (entryPath === path) {
      return { type: entry.type === 'file' ? 'file' : 'folder', path: entryPath };
    }
    if (Array.isArray(entry.children)) {
      const found = findProjectTreeItemInEntries(entry.children, path);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function findProjectTreeItemBySuffix(entries, path) {
  for (const entry of entries) {
    const entryPath = String(entry.path || '').replace(/\/$/, '');
    if (path.endsWith(`/${entryPath}`) || path.endsWith(entryPath)) {
      return { type: entry.type === 'file' ? 'file' : 'folder', path: entryPath };
    }
    if (Array.isArray(entry.children)) {
      const found = findProjectTreeItemBySuffix(entry.children, path);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function createCodeBlock(text, language = '') {
  const pre = document.createElement('pre');
  pre.className = 'message-code';
  if (language) {
    pre.dataset.language = language;
  }
  const code = document.createElement('code');
  code.textContent = text;
  pre.append(code);
  return pre;
}

function getMessageStepTools(message) {
  if (!message || typeof message !== 'object') {
    return [];
  }
  return mergeToolLists(message.tools, deriveToolsFromContent(message.content));
}

function isAssistantStepOnlyMessage(message) {
  if (!message || normalizeMessageRole(message.role) !== 'assistant') {
    return false;
  }
  const tools = getMessageStepTools(message);
  if (!tools.length) {
    return false;
  }
  const contentNodes = createContentNodes(message.content);
  return !contentNodes.length && !getMessageThinking(message) && !message.status && !message.error;
}

function createMessageDetails(summaryText, bodyText, className) {
  const details = document.createElement('details');
  details.className = className;
  const summary = document.createElement('summary');
  summary.textContent = summaryText;
  const body = document.createElement('pre');
  body.textContent = bodyText;
  details.append(summary, body);
  return details;
}

function createToolBlock(kind, titleText, bodyText) {
  const details = createMessageDetails(`${kind} · ${titleText}`, bodyText, 'tool-block');
  details.open = false;
  return details;
}

function createStepsBlock(tools, inProgress) {
  const normalized = normalizeMessageTools(tools);
  const failedCount = normalized.filter((tool) => isFailedStepStatus(tool.status)).length;
  const running = inProgress || normalized.some((tool) => isRunningStepStatus(tool.status));
  const summaryKey = failedCount ? 'messages.stepsFailed' : running ? 'messages.stepsRunning' : 'messages.stepsCompleted';
  const details = document.createElement('details');
  details.className = 'steps-block';
  const summary = document.createElement('summary');
  summary.textContent = t(summaryKey, { count: normalized.length });
  const list = document.createElement('div');
  list.className = 'steps-list';
  normalized.forEach((tool, index) => list.append(createStepItem(tool, index)));
  details.append(summary, list);
  return details;
}

function createStepItem(tool, index) {
  const node = document.createElement('details');
  const statusClass = isFailedStepStatus(tool.status) ? 'is-failed' : isRunningStepStatus(tool.status) ? 'is-running' : 'is-complete';
  node.className = `step-item ${statusClass}`;
  node.open = false;
  const header = document.createElement('summary');
  header.className = 'step-header';
  const marker = document.createElement('span');
  marker.className = 'step-marker';
  const title = document.createElement('strong');
  title.className = 'step-title';
  title.append(...createInlineMarkdownNodes(getStepDisplayTitle(tool, index)));
  decorateStepEditDiffTokens(title, tool);
  const toolMeta = document.createElement('span');
  toolMeta.className = 'step-tool-meta';
  toolMeta.append(...createStepToolMetaNodes(tool));
  const meta = document.createElement('span');
  meta.className = 'step-meta';
  meta.textContent = formatDateTime(tool.timestamp);
  header.append(marker, title, toolMeta, meta);
  node.append(header);
  const body = createStepBody(tool);
  if (body) {
    node.append(body);
  }
  return node;
}

function createStepBody(tool) {
  const parsed = parseToolText(tool.text);
  const payload = parsed.value;
  if (payload && typeof payload === 'object') {
    return createStructuredPayloadBlock(payload, parsed.raw, tool);
  }
  if (parsed.raw) {
    const body = document.createElement('div');
    body.className = 'step-body step-body-text';
    body.append(...createMarkdownNodes(parsed.raw));
    return body;
  }
  return null;
}

function createStructuredPayloadBlock(payload, rawText = '', tool = null) {
  const body = document.createElement('div');
  body.className = 'step-body step-structured';
  if (Array.isArray(payload)) {
    payload.slice(0, 8).forEach((item, index) => body.append(createPayloadRow(`#${index + 1}`, item, tool)));
    if (payload.length > 8) {
      body.append(createPayloadRow('...', t('messages.stepMore', { count: payload.length - 8 }), tool));
    }
    return body;
  }
  const entries = Object.entries(payload).filter(([key]) => !['id', 'type', 'toolCallId'].includes(key));
  if (!entries.length && rawText) {
    body.append(createPayloadRow(t('messages.stepRaw'), rawText, tool));
    return body;
  }
  entries.slice(0, 12).forEach(([key, value]) => body.append(createPayloadRow(key, value, tool)));
  if (entries.length > 12) {
    body.append(createPayloadRow('...', t('messages.stepMore', { count: entries.length - 12 }), tool));
  }
  return body;
}

function createPayloadRow(key, value, tool = null) {
  const row = document.createElement('div');
  row.className = 'step-field';
  const label = document.createElement('span');
  label.className = 'step-field-key';
  label.textContent = key;
  const content = document.createElement('span');
  content.className = 'step-field-value';
  if (value && typeof value === 'object') {
    content.append(createCodeBlock(JSON.stringify(value, null, 2), 'json'));
  } else if (isStepPathPayloadKey(key) && typeof value === 'string') {
    content.append(...createStepEditPathValueNodes(value, tool));
  } else {
    content.textContent = String(value ?? '');
  }
  row.append(label, content);
  return row;
}

function isStepPathPayloadKey(key) {
  return ['path', 'file', 'filepath', 'filename'].includes(String(key || '').toLowerCase().replace(/[^a-z]/g, ''));
}

function createStepEditPathValueNodes(value, tool) {
  const parsed = normalizeMessagePathToken(value);
  if (!parsed || parsed.type !== 'file') {
    return [document.createTextNode(String(value ?? ''))];
  }
  const editFile = isEditStepTool(tool) ? findEditCheckpointFile(parsed.path) : null;
  return [createMessagePathToken({ ...parsed, editCheckpointFile: editFile })];
}

function decorateStepEditDiffTokens(container, tool) {
  if (!isEditStepTool(tool)) {
    return;
  }
  container.querySelectorAll('[data-message-path]').forEach((button) => {
    const editFile = findEditCheckpointFile(button.dataset.messagePath);
    if (!editFile) {
      return;
    }
    button.dataset.editCheckpointId = editFile.checkpointId;
    button.dataset.editCheckpointPath = editFile.path;
    button.classList.add('message-path-edit-diff');
    button.title = t('messages.editCheckpointFileDiff', { path: editFile.path });
    button.setAttribute('aria-label', button.title);
    button.setAttribute('data-help', 'messages.editCheckpointFileDiff');
    button.append(renderDiffStats(editFile.stats));
  });
}

function findEditCheckpointFile(path) {
  const files = state.editCheckpoint && Array.isArray(state.editCheckpoint.files) ? state.editCheckpoint.files : [];
  const normalized = normalizeGitPath(path);
  const file = files.find((item) => normalizeGitPath(item && item.path) === normalized) || null;
  return file && state.editCheckpoint && state.editCheckpoint.id ? { ...file, checkpointId: state.editCheckpoint.id } : null;
}

function parseToolText(text) {
  const raw = String(text || '').trim();
  if (!raw) {
    return { raw: '', value: null };
  }
  const fenced = raw.match(/^```[\w-]*\s*\n([\s\S]*?)\n```$/);
  const jsonSource = fenced ? fenced[1].trim() : raw;
  if (/^[\[{]/.test(jsonSource)) {
    try {
      return { raw, value: JSON.parse(jsonSource) };
    } catch (error) {
      return { raw, value: null };
    }
  }
  return { raw, value: null };
}

function getStepDisplayTitle(tool, index) {
  const parsed = parseToolText(tool.text);
  const payload = parsed.value && typeof parsed.value === 'object' ? parsed.value : null;
  const toolName = normalizeToolName(tool.name);
  const target = getStepTargetLabel(payload, toolName);
  const title = getToolActionTitle(toolName, target, tool.kind);
  return title || `${t('messages.stepFallback')} ${index + 1}`;
}

function getActiveToolStatus(tool) {
  const title = getStepDisplayTitle(tool, 0);
  if (isFailedStepStatus(tool.status)) {
    return `${title} ${t('messages.stepStatusFailed')}`;
  }
  if (!isRunningStepStatus(tool.status)) {
    return `${title} ${t('messages.stepStatusComplete')}`;
  }
  return t('messages.statusTool', { tool: title });
}

function createStepToolMetaNodes(tool) {
  const stats = getStepDiffStats(tool);
  const nodes = [document.createTextNode(getStepStatusLabel(tool))];
  if (stats) {
    nodes.push(document.createTextNode(' · '));
    const statsNode = renderDiffStats(stats);
    statsNode.classList.add('step-diff-stats');
    nodes.push(statsNode);
  }
  return nodes;
}

function normalizeToolName(name) {
  return String(name || '').trim();
}

function getStepTargetLabel(payload, toolName = '') {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return '';
  }
  const command = isCommandStepToolName(toolName) ? '' : payload.command;
  const value = payload.path || payload.file || payload.filePath || payload.query || command || payload.url || payload.name || payload.title;
  return value == null ? '' : String(value);
}

function isCommandStepToolName(toolName) {
  const key = String(toolName || '').toLowerCase().replace(/[\s_-]+/g, '');
  return ['bash', 'shell', 'terminal', 'runinterminal', 'sendtoterminal'].includes(key);
}

function getToolActionTitle(toolName, target, kind) {
  const key = String(toolName || '').toLowerCase().replace(/[\s_-]+/g, '');
  const result = String(kind || '').toLowerCase().includes('result');
  const targetText = target ? `：${target}` : '';
  const titleMap = new Map([
    ['read', `读取文件${targetText}`],
    ['readfile', `读取文件${targetText}`],
    ['readidefile', `读取 IDE 文件${targetText}`],
    ['readfiletool', `读取文件${targetText}`],
    ['write', `写入文件${targetText}`],
    ['writefile', `写入文件${targetText}`],
    ['edit', `编辑文件${targetText}`],
    ['editfile', `编辑文件${targetText}`],
    ['applypatch', `修改文件${targetText}`],
    ['applypatchtool', `修改文件${targetText}`],
    ['getidecontext', '获取 IDE 上下文'],
    ['getcontext', '获取上下文'],
    ['grep', `搜索文本${targetText}`],
    ['grepsearch', `搜索文本${targetText}`],
    ['search', `搜索内容${targetText}`],
    ['filesearch', `查找文件${targetText}`],
    ['semanticsearch', `搜索代码语义${targetText}`],
    ['vscodelistcodeusages', `查找引用${targetText}`],
    ['listcodeusages', `查找引用${targetText}`],
    ['list', `列出内容${targetText}`],
    ['listdir', `列出目录${targetText}`],
    ['glob', `查找文件${targetText}`],
    ['geterrors', `检查问题${targetText}`],
    ['testfailure', `查看测试失败${targetText}`],
    ['runtask', `运行任务${targetText}`],
    ['createandruntask', `运行任务${targetText}`],
    ['bash', `运行命令${targetText}`],
    ['shell', `运行命令${targetText}`],
    ['terminal', `运行终端命令${targetText}`],
    ['runinterminal', `运行终端命令${targetText}`],
    ['sendtoterminal', `输入终端${targetText}`],
    ['runnotebookcell', `运行 Notebook 单元${targetText}`],
    ['readnotebookcelloutput', `读取 Notebook 输出${targetText}`],
    ['browser', `操作浏览器${targetText}`],
    ['openbrowserpage', `打开页面${targetText}`],
    ['readpage', `查看页面${targetText}`],
    ['clickelement', `点击页面${targetText}`],
    ['typeinpage', `输入页面${targetText}`],
    ['navigatepage', `跳转页面${targetText}`],
    ['screenshotpage', `截图页面${targetText}`],
    ['runplaywrightcode', `验证页面${targetText}`],
    ['playwright', `验证页面${targetText}`]
  ]);
  if (titleMap.has(key)) {
    return result ? `${titleMap.get(key)} 的结果` : titleMap.get(key);
  }
  if (toolName && target) {
    return result ? `${toolName} 的结果：${target}` : `${toolName}：${target}`;
  }
  return toolName ? (result ? `${toolName} 的结果` : toolName) : '';
}

function getStepStatusLabel(tool) {
  if (isFailedStepStatus(tool.status)) {
    return t('messages.stepStatusFailed');
  }
  if (isRunningStepStatus(tool.status)) {
    return t('messages.stepStatusRunning');
  }
  return t('messages.stepStatusComplete');
}

function getStepDiffStats(tool) {
  if (!isEditStepTool(tool)) {
    return null;
  }
  const parsed = parseToolText(tool && tool.text);
  const payload = tool && tool.payload && typeof tool.payload === 'object'
    ? tool.payload
    : parsed.value && typeof parsed.value === 'object' ? parsed.value : null;
  const payloadStats = extractPayloadDiffStats(payload);
  const textStats = extractTextDiffStats(parsed.raw || (tool && tool.text));
  const stats = payloadStats || textStats;
  if (!stats || (!stats.added && !stats.removed)) {
    return null;
  }
  return stats;
}

function extractPayloadDiffStats(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  if (Array.isArray(payload)) {
    return mergeDiffStats(payload.map(extractPayloadDiffStats).filter(Boolean));
  }
  const nestedStats = [payload.stats, payload.diffStats, payload.change, payload.changes, payload.result, payload.output].filter(Boolean);
  const added = readNumericAlias(payload, ['added', 'additions', 'insertions', 'linesAdded', 'addedLines', 'inserted']);
  const removed = readNumericAlias(payload, ['removed', 'deleted', 'deletions', 'linesDeleted', 'removedLines', 'deletedLines']);
  if (added || removed) {
    return { added, removed };
  }
  const merged = mergeDiffStats(nestedStats.map(extractPayloadDiffStats).filter(Boolean));
  if (merged) {
    return merged;
  }
  const diffText = [payload.diff, payload.patch, payload.unifiedDiff].find((value) => typeof value === 'string');
  return diffText ? extractTextDiffStats(diffText) : null;
}

function readNumericAlias(payload, keys) {
  for (const key of keys) {
    const value = Number(payload[key]);
    if (Number.isFinite(value) && value) {
      return value;
    }
  }
  return 0;
}

function mergeDiffStats(items) {
  if (!items.length) {
    return null;
  }
  const totals = items.reduce((result, item) => ({
    added: result.added + (Number(item.added) || 0),
    removed: result.removed + (Number(item.removed) || 0)
  }), { added: 0, removed: 0 });
  return totals.added || totals.removed ? totals : null;
}

function extractTextDiffStats(text) {
  const source = String(text || '');
  if (!source.includes('\n') && !/^[+-]/.test(source)) {
    return null;
  }
  let added = 0;
  let removed = 0;
  for (const line of source.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) {
      continue;
    }
    if (line.startsWith('+')) {
      added += 1;
    } else if (line.startsWith('-')) {
      removed += 1;
    }
  }
  return added || removed ? { added, removed } : null;
}

function isEditStepTool(tool) {
  const key = String(tool && tool.name || '').toLowerCase().replace(/[\s_-]+/g, '');
  return ['write', 'writefile', 'edit', 'editfile', 'applypatch', 'applypatchtool', 'functions.applypatch', 'createfile', 'deletefile', 'editnotebookfile', 'writeprojectfile'].includes(key);
}

function isRunningStepStatus(status) {
  return ['running', 'started', 'start', 'pending', 'queued'].includes(String(status || '').toLowerCase());
}

function isFailedStepStatus(status) {
  return ['failed', 'error', 'rejected'].includes(String(status || '').toLowerCase());
}

function renderActivity() {
  renderPendingEditCheckpoint();
  const liveItems = Array.from(state.tools.values());
  const historyItems = Array.isArray(state.historyActivities) ? state.historyActivities : [];
  const items = dedupeActivities([...historyItems, ...liveItems])
    .sort((left, right) => getActivityTime(left) - getActivityTime(right))
    .slice(-12)
    .reverse();
  elements.activityList.replaceChildren(...items.map((tool) => {
    const node = document.createElement('article');
    node.className = 'activity-card';
    const title = document.createElement('strong');
    title.textContent = [tool.name, tool.status, tool.history ? t('activity.history') : '', formatDateTime(tool.timestamp)].filter(Boolean).join(' · ');
    const body = document.createElement('pre');
    body.textContent = tool.text || '-';
    node.append(title, body);
    return node;
  }));
}

function renderPendingEditCheckpoint() {
  const target = elements.pendingEditCheckpoint;
  if (!target) {
    return;
  }
  if (!shouldRenderEditCheckpointNotice()) {
    target.hidden = true;
    target.replaceChildren();
    return;
  }
  const files = state.editCheckpoint.files || [];
  target.hidden = false;
  const header = document.createElement('div');
  header.className = 'pending-edit-checkpoint-header';
  const title = document.createElement('strong');
  title.textContent = t('messages.editCheckpointPanelTitle');
  const meta = document.createElement('span');
  meta.textContent = t('messages.editCheckpointPending', { count: files.length });
  header.append(title, meta);
  const actions = document.createElement('span');
  actions.className = 'message-actions pending-edit-checkpoint-actions';
  for (const action of [
    { text: t('actions.acceptEdits'), attr: 'data-accept-edit-checkpoint' },
    { text: t('actions.restoreEdits'), attr: 'data-restore-edit-checkpoint' }
  ]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'message-action-button';
    button.textContent = action.text;
    button.setAttribute(action.attr, '1');
    actions.append(button);
  }
  target.replaceChildren(header, renderEditCheckpointFiles(state.editCheckpoint.id, files), actions);
}

function scheduleRenderActivity() {
  if (state.activityRenderRaf) {
    return;
  }
  state.activityRenderRaf = requestAnimationFrame(() => {
    state.activityRenderRaf = 0;
    renderActivity();
  });
}

function appendTerminalOutput(entry = {}) {
  state.terminalOutput.push({
    timestamp: entry.timestamp || new Date().toISOString(),
    stream: ['stderr', 'stdout', 'trace'].includes(entry.stream) ? entry.stream : 'stdout',
    text: String(entry.text || '')
  });
  if (state.terminalOutput.length > 300) {
    state.terminalOutput.splice(0, state.terminalOutput.length - 300);
  }
  scheduleRenderTerminalOutput();
}

function scheduleRenderTerminalOutput() {
  if (state.terminalOutputRenderRaf) {
    return;
  }
  state.terminalOutputRenderRaf = requestAnimationFrame(() => {
    state.terminalOutputRenderRaf = 0;
    renderTerminalOutput();
  });
}

function renderTerminalOutput() {
  if (!elements.terminalOutput || !elements.terminalOutputMeta) {
    return;
  }
  const lines = state.terminalOutput.map((entry) => {
    const stream = ['stderr', 'stdout', 'trace'].includes(entry.stream) ? entry.stream : 'stdout';
    const time = entry.timestamp ? formatDateTime(entry.timestamp) : '';
    return `[${[time, stream].filter(Boolean).join(' | ')}] ${entry.text || ''}`;
  });
  const wasPinned = elements.terminalOutput.scrollTop + elements.terminalOutput.clientHeight >= elements.terminalOutput.scrollHeight - 8;
  elements.terminalOutput.textContent = lines.join('\n');
  elements.terminalOutputMeta.textContent = lines.length ? t('runtime.terminalCount', { count: String(lines.length) }) : t('runtime.terminalEmpty');
  if (wasPinned) {
    elements.terminalOutput.scrollTop = elements.terminalOutput.scrollHeight;
  }
}

function addMessage(message, options = {}) {
  state.messages.push(message);
  scheduleRenderMessages(options);
  return message;
}

function addSystemMessage(content, isError = false, options = {}) {
  if (isError) {
    addMessage({ role: 'error', content, timestamp: new Date().toISOString() }, options);
    return;
  }
  addConversationNotice(content, options);
}

function addConversationNotice(content, options = {}) {
  const notice = {
    id: `notice-${Date.now()}-${state.conversationNotices.length}`,
    tone: options.tone || 'info',
    content: String(content || '')
  };
  state.conversationNotices = [...state.conversationNotices.slice(-3), notice];
  scheduleRenderMessages(options);
}

function addActivity(name, text) {
  const timestamp = new Date().toISOString();
  const id = `${name}-${timestamp}`;
  state.tools.set(id, { id, name, status: 'info', text, timestamp });
  scheduleRenderActivity();
}

function deriveActivitiesFromMessages(messages) {
  const activities = [];
  for (const message of messages || []) {
    for (const tool of normalizeMessageTools(message.tools || deriveToolsFromContent(message.content))) {
      const sourceId = tool.id || `${tool.name || 'tool'}-${tool.kind || tool.status || 'activity'}-${activities.length}`;
      activities.push({ ...tool, id: `history-${getMessageId(message, activities.length)}-${sourceId}`, sourceId, timestamp: tool.timestamp || message.timestamp || null, history: true });
    }
  }
  return dedupeActivities(activities);
}

function dedupeActivities(activities) {
  const byKey = new Map();
  for (const activity of activities || []) {
    const key = getActivityDedupeKey(activity);
    const existing = byKey.get(key);
    if (!existing || (!activity.history && existing.history) || getActivityTime(activity) >= getActivityTime(existing)) {
      byKey.set(key, activity);
    }
  }
  return Array.from(byKey.values());
}

function getActivityDedupeKey(activity) {
  if (!activity) {
    return 'empty';
  }
  const stableId = String(activity.sourceId || activity.id || '').replace(/^history-.*-/, '');
  if (stableId) {
    return `${activity.name || 'tool'}:${activity.kind || ''}:${activity.status || ''}:${stableId}`;
  }
  return `${activity.name || 'tool'}:${activity.kind || ''}:${activity.status || ''}:${activity.timestamp || ''}:${String(activity.text || '').slice(0, 120)}`;
}

function deriveToolsFromContent(content) {
  if (typeof content === 'string') {
    return splitToolTranscriptContent(content).flatMap((segment) => segment.type === 'tools' ? segment.tools : []);
  }
  if (!Array.isArray(content)) {
    return [];
  }
  return content.filter((item) => item && (item.type === 'toolCall' || item.type === 'toolResult')).map((item, index) => ({
    id: item.id || item.toolCallId || `content-tool-${index}`,
    name: item.toolName || item.name || 'tool',
    status: item.status || (item.type === 'toolResult' ? 'result' : 'history'),
    kind: item.type === 'toolResult' ? 'result' : 'call',
    text: extractContentText(item.content) || stringifyToolPayload(item.args || item.arguments || item.input || item),
    payload: item.result || item.args || item.arguments || item.input || item,
    timestamp: item.timestamp || null,
    history: Boolean(item.history)
  }));
}

function isStandaloneToolMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }
  const role = String(message.role || message.type || '').toLowerCase();
  return role === 'toolresult' || role === 'tool_result' || role === 'toolcall' || role === 'tool_call' || role === 'tool';
}

function toolMessageToStep(message, index) {
  if (!message || typeof message !== 'object') {
    return null;
  }
  const role = String(message.role || message.type || '').toLowerCase();
  const isResult = role.includes('result') || message.type === 'toolResult';
  return normalizeMessageTools([{
    id: message.id || (message.toolCallId ? `${message.toolCallId}:${isResult ? 'result' : 'call'}` : `message-tool-${index}-${isResult ? 'result' : 'call'}`),
    name: message.toolName || message.name || message.tool || 'tool',
    status: message.status || message.state || (isResult ? 'result' : 'running'),
    kind: isResult ? 'result' : 'call',
    text: extractContentText(message.content) || message.text || stringifyToolPayload(message.details || message.result || message.args || message.arguments || message.input || message),
    payload: message.details || message.result || message.args || message.arguments || message.input || message,
    timestamp: message.timestamp || null,
    history: Boolean(message.history || message.sessionHistory)
  }])[0] || null;
}

function normalizeMessageTools(tools) {
  if (!Array.isArray(tools)) {
    return [];
  }
  return tools.filter(Boolean).map((tool, index) => ({
    id: tool.id || tool.toolCallId || `${tool.name || 'tool'}-${index}`,
    name: tool.name || tool.toolName || 'tool',
    status: tool.status || tool.state || (tool.kind === 'result' ? 'result' : 'running'),
    kind: tool.kind || (tool.type === 'toolResult' ? 'result' : 'call'),
    text: tool.text || extractContentText(tool.content) || stringifyToolPayload(tool.result || tool.args || tool.arguments || tool.input || tool),
    payload: tool.payload || tool.result || tool.args || tool.arguments || tool.input || tool,
    timestamp: tool.timestamp || null,
    history: Boolean(tool.history)
  }));
}

function mergeToolLists(existingTools, incomingTools) {
  const tools = new Map();
  for (const tool of [...normalizeMessageTools(existingTools), ...normalizeMessageTools(incomingTools)]) {
    const key = tool.id || `${tool.name}-${tool.kind || tool.status}-${tools.size}`;
    tools.set(key, tool);
  }
  return Array.from(tools.values());
}

function formatToolTitle(tool) {
  return [tool.toolName || tool.name || 'tool', tool.status || tool.state || '', formatDateTime(tool.timestamp)].filter(Boolean).join(' · ');
}

function getActivityTime(activity) {
  const time = activity && activity.timestamp ? new Date(activity.timestamp).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function getMessageText(message) {
  if (!message) {
    return '';
  }
  if (typeof message.content === 'string') {
    return [message.thinking, message.content, formatMessageTools(message.tools)].filter(Boolean).join('\n\n');
  }
  if (Array.isArray(message.content)) {
    return [
      message.thinking,
      ...message.content.map((item) => item.text || item.thinking || extractContentText(item.content) || stringifyToolPayload(item)),
      formatMessageTools(message.tools)
    ].filter(Boolean).join('\n');
  }
  return JSON.stringify(message.content || message, null, 2);
}

function hasAssistantVisibleOutput(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }
  return Boolean(getMessageThinking(message).trim() || getContentVisibleText(message.content).trim() || getMessageStepTools(message).length);
}

function getContentVisibleText(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((item) => item.text || item.thinking || getContentVisibleText(item.content)).filter(Boolean).join('\n');
  }
  if (!content || typeof content !== 'object') {
    return '';
  }
  if (typeof content.text === 'string' || typeof content.content === 'string') {
    return content.text || content.content;
  }
  return Object.keys(content).length ? JSON.stringify(content) : '';
}

function getMessageThinking(message) {
  if (message.thinking) {
    return message.thinking;
  }
  if (Array.isArray(message.content)) {
    return message.content.map((item) => item.thinking || '').filter(Boolean).join('\n');
  }
  return '';
}

function formatMessageTools(tools) {
  return Array.isArray(tools) ? tools.map((tool) => `${tool.name} · ${tool.status}\n${tool.text || ''}`).join('\n\n') : '';
}

function extractContentText(content) {
  return Array.isArray(content) ? content.map((item) => item.text || '').filter(Boolean).join('\n') : '';
}

function stringifyToolPayload(payload) {
  if (typeof payload === 'string') {
    return payload;
  }
  return JSON.stringify(payload || {}, null, 2);
}

function normalizeMessageRole(role) {
  return ['user', 'assistant', 'system', 'error'].includes(role) ? role : 'system';
}

function getMessageId(message, index) {
  return message && message.id ? String(message.id) : `${index}:${message && message.role}:${getMessageText(message).slice(0, 80)}`;
}

function formatEvent(event) {
  if (event.text) {
    return event.text;
  }
  return JSON.stringify(event, null, 2);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}
