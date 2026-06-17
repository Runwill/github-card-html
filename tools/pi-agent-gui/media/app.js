const state = {
  runtime: null,
  models: [],
  modelConfig: null,
  messages: [],
  activeAssistant: null,
  tools: new Map(),
  projectTree: null,
  searchResults: null,
  activeSearchHit: null,
  gitStatus: null,
  currentFile: null,
  previewMode: 'empty',
  previewEditing: false,
  previewDirty: false,
  previewSaveState: 'idle',
  previewSaveError: '',
  activeChangePath: '',
  previewHighlightTimer: 0,
  ideSyncTimer: 0,
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
    'runtime.runningSummary': '共享 Pi runtime 正在运行',
    'runtime.stoppedSummary': 'Runtime 已停止',
    'runtime.status': '状态',
    'runtime.project': '项目',
    'runtime.model': '模型',
    'status.running': '运行中',
    'status.stopped': '已停止',
    'status.unknown': '未知',
    'tabs.runtime': '运行',
    'tabs.project': '项目',
    'tabs.changes': '变更',
    'tabs.model': '模型',
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
    'actions.abort': '中止',
    'actions.setModel': '设为当前模型',
    'actions.saveProvider': '保存 Provider',
    'actions.deleteProvider': '删除 Provider',
    'actions.search': '搜索',
    'actions.reload': '重载',
    'actions.saveFile': '保存',
    'actions.openFile': '打开文件',
    'actions.send': '发送',
    'actions.revealCurrentFile': '定位当前文件',
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
    'context.include': '显示 IDE 状态',
    'context.none': '无当前文件或 Git 变更',
    'context.file': '文件：{path}',
    'context.diff': 'Diff：{path}',
    'context.git': 'Git：{count} 个变更',
    'context.dirty': '未保存',
    'context.previewTitle': '当前 IDE 状态（agent 可通过 get_ide_context 工具读取）：',
    'context.readInstruction': '这些内容不会自动拼进消息正文。',
    'context.unsavedWarning': '注意：当前编辑器有未保存内容，磁盘文件可能不是最新版本。',
    'preview.title': '预览',
    'preview.empty': '选择文件或变更后，会在这里预览内容。',
    'preview.fileMeta': '{path} · {size} bytes',
    'preview.diffMeta': '{path} · diff',
    'preview.savedMeta': '{path} · 已保存 · {size} bytes',
    'preview.dirty': '未保存',
    'preview.saving': '保存中...',
    'preview.saveFailed': '保存失败：{message}',
    'preview.discardConfirm': '当前文件有未保存修改。要丢弃这些修改并继续吗？',
    'preview.truncated': '\n\n[内容已截断]',
    'messages.configPath': '配置文件：{path}',
    'messages.saved': '已保存。明文 Key 会写入 Pi 配置但不会在页面回显；重启 runtime 或重新打开模型列表后 Pi 会重新加载。',
    'messages.loadedSavedKey': '已加载保存的 Provider。Key 已保存但不会回显；留空保存会继续保留原 Key。',
    'placeholders.savedApiKey': 'Key 已保存，留空保留原 Key',
    'messages.deleted': 'Provider 已删除。重启 runtime 或重新打开模型列表后 Pi 会重新加载。',
    'messages.providerRequired': '请先填写 Provider。',
    'activity.agentStarted': 'Agent 已开始',
    'activity.agentFinished': 'Agent 已完成',
    'composer.placeholder': '向共享 Pi agent 发送任务',
    'placeholders.optional': '可选',
    'placeholders.apiKey': '直接粘贴 key，或填 $OPENAI_API_KEY',
    'help.title': '说明',
    'help.default': '悬浮、点击或聚焦到控件时，这里会显示功能解释。',
    'help.language': '切换界面语言，说明栏和主要控件文案会同步切换。',
    'help.start': '启动共享 Pi runtime，启动后手机和电脑会连接到同一个 agent 会话。',
    'help.abort': '中止当前 Pi agent 运行中的任务，不会删除配置或历史文件。',
    'help.runtimeTab': '查看共享 Pi runtime 的启动状态、当前项目和当前模型。',
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
    'help.configTab': '在浏览器中维护 Pi 的模型 Provider 配置，保存后 Pi 重新加载即可使用。',
    'help.activityTab': '查看 agent 启动、结束和工具调用等运行活动。',
    'help.modelSelect': '这里列出 Pi 从模型配置中识别到的可用模型。',
    'help.setModel': '把下拉框里的模型切换为 Pi agent 当前使用的模型。',
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
    'help.contextPanel': '查看当前同步给 IDE bridge 的状态。Pi agent 需要项目上下文时应通过 get_ide_context 等工具读取，而不是从消息正文里拿。',
    'help.showIdeState': '只控制这里是否展示 IDE 状态；发送给 Pi agent 的正文始终只包含输入框里的文字。',
    'help.sendMode': '任务会开启新的 agent 目标；插话用于中途补充指令；后续用于继续上一轮。',
    'help.messageInput': '输入要交给共享 Pi agent 的任务、补充说明或后续要求。',
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
    'status.running': 'Running',
    'status.stopped': 'Stopped',
    'status.unknown': 'Unknown',
    'tabs.runtime': 'Runtime',
    'tabs.project': 'Project',
    'tabs.changes': 'Changes',
    'tabs.model': 'Model',
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
    'actions.abort': 'Abort',
    'actions.setModel': 'Set model',
    'actions.saveProvider': 'Save provider',
    'actions.deleteProvider': 'Delete provider',
    'actions.search': 'Search',
    'actions.reload': 'Reload',
    'actions.saveFile': 'Save',
    'actions.openFile': 'Open file',
    'actions.send': 'Send',
    'actions.revealCurrentFile': 'Reveal current file',
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
    'context.include': 'Show IDE state',
    'context.none': 'No current file or Git changes',
    'context.file': 'File: {path}',
    'context.diff': 'Diff: {path}',
    'context.git': 'Git: {count} changes',
    'context.dirty': 'unsaved',
    'context.previewTitle': 'Current IDE state (available through the get_ide_context tool):',
    'context.readInstruction': 'This content is not appended to the message body.',
    'context.unsavedWarning': 'Note: the current editor has unsaved changes, so the disk file may not be current.',
    'preview.title': 'Preview',
    'preview.empty': 'Select a file or change to preview it here.',
    'preview.fileMeta': '{path} · {size} bytes',
    'preview.diffMeta': '{path} · diff',
    'preview.savedMeta': '{path} · saved · {size} bytes',
    'preview.dirty': 'Unsaved',
    'preview.saving': 'Saving...',
    'preview.saveFailed': 'Save failed: {message}',
    'preview.discardConfirm': 'The current file has unsaved changes. Discard them and continue?',
    'preview.truncated': '\n\n[Content truncated]',
    'messages.configPath': 'Config: {path}',
    'messages.saved': 'Saved. Raw keys are written to Pi config but not echoed back in the page; restart runtime or reopen model list to reload Pi models.',
    'messages.loadedSavedKey': 'Loaded saved provider. The key is saved but not echoed; leave it blank to keep the existing key when saving.',
    'placeholders.savedApiKey': 'Key saved; leave blank to keep it',
    'messages.deleted': 'Provider deleted. Restart runtime or reopen model list to reload Pi models.',
    'messages.providerRequired': 'Provider is required.',
    'activity.agentStarted': 'Agent started',
    'activity.agentFinished': 'Agent finished',
    'composer.placeholder': 'Send a task to the shared Pi agent',
    'placeholders.optional': 'optional',
    'placeholders.apiKey': 'Paste a key, or use $OPENAI_API_KEY',
    'help.title': 'Help',
    'help.default': 'Hover, tap, or focus a control to show its explanation here.',
    'help.language': 'Switch the UI language. The help panel and main control labels update together.',
    'help.start': 'Start the shared Pi runtime so phone and desktop connect to the same agent session.',
    'help.abort': 'Abort the currently running Pi agent task without deleting configuration or files.',
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
    'help.configTab': 'Maintain Pi model provider settings in the browser, then reload Pi to use them.',
    'help.activityTab': 'Watch agent starts, finishes, and tool activity from the shared runtime.',
    'help.modelSelect': 'This list shows models that Pi discovered from the model configuration.',
    'help.setModel': 'Switch Pi agent to the model currently selected in the list.',
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
    'help.contextPanel': 'Review the IDE state synchronized to the IDE bridge. Pi agent should use tools such as get_ide_context for project context instead of reading it from the message body.',
    'help.showIdeState': 'Only controls whether this IDE state preview is shown. The message sent to Pi agent always contains only the text you typed.',
    'help.sendMode': 'Prompt starts a new goal; Steer adds mid-run guidance; Follow-up continues the previous turn.',
    'help.messageInput': 'Type the task, steering note, or follow-up you want to send to the shared Pi agent.',
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
  messages: document.getElementById('messages'),
  composer: document.getElementById('composer'),
  chatPanel: document.getElementById('chatPanel'),
  sidebarResizeHandle: document.getElementById('sidebarResizeHandle'),
  previewResizeHandle: document.getElementById('previewResizeHandle'),
  composerResizeHandle: document.getElementById('composerResizeHandle'),
  showIdeStateInput: document.getElementById('showIdeStateInput'),
  contextSummary: document.getElementById('contextSummary'),
  contextPreview: document.getElementById('contextPreview'),
  sendMode: document.getElementById('sendMode'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton')
};

init().catch((error) => addSystemMessage(error.message || String(error), true));

async function init() {
  updateAppViewportHeight();
  applyLanguage();
  applyProviderDefaults();
  bindEvents();
  connectEvents();
  await loadRuntime();
  await Promise.allSettled([loadProjectTree(), loadGitStatus()]);
  await loadModelConfig();
  await loadModels().catch(() => {});
  if (state.runtime.pi.running) {
    await Promise.allSettled([loadState(), loadMessages()]);
  }
}

function updateAppViewportHeight() {
  const viewportHeight = Math.min(window.visualViewport?.height || window.innerHeight, window.innerHeight);
  if (!viewportHeight) {
    return;
  }
  document.documentElement.style.setProperty('--app-height', `${Math.round(viewportHeight)}px`);
  clampWorkbenchSizes();
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
  elements.changesList.addEventListener('click', handleChangesClick);
  elements.previewEditor.addEventListener('input', markPreviewDirty);
  elements.previewCode.addEventListener('input', markPreviewDirty);
  elements.previewCode.addEventListener('click', beginPreviewEdit);
  elements.previewCode.addEventListener('keydown', handlePreviewCodeKeydown);
  elements.previewCode.addEventListener('scroll', updatePreviewMinimapViewport);
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
  elements.setModelButton.addEventListener('click', setModel);
  elements.modelConfigForm.addEventListener('submit', saveModelConfig);
  elements.providerIdInput.addEventListener('change', fillProviderFromConfig);
  elements.deleteProviderButton.addEventListener('click', deleteProviderConfig);
  elements.showIdeStateInput.addEventListener('change', updateContextPreview);
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
  source.addEventListener('runtime:error', (event) => addSystemMessage(JSON.parse(event.data).message, true));
  source.addEventListener('pi:event', (event) => handlePiEvent(JSON.parse(event.data)));
}

async function loadRuntime() {
  state.runtime = await api('/api/runtime');
  renderRuntime();
}

async function startRuntime() {
  try {
    await api('/api/runtime/start', { method: 'POST' });
    await loadRuntime();
    await Promise.allSettled([loadState(), loadModels(), loadMessages()]);
  } catch (error) {
    addSystemMessage(error.message || String(error), true);
  }
}

async function abortRuntime() {
  try {
    await api('/api/abort', { method: 'POST' });
  } catch (error) {
    addSystemMessage(error.message || String(error), true);
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
    renderGitStatus();
    updateContextPreview();
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
    revealCurrentFileInTree({ scroll: true });
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
    updateContextPreview();
    syncIdeState();
  } catch (error) {
    showPreviewError(error);
  }
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
    updateContextPreview();
    syncIdeState();
    await refreshProjectFileStateAfterSave(targetPath);
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
  updateContextPreview();
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

async function loadMessages() {
  const data = await api('/api/messages');
  state.messages = data.messages || [];
  renderMessages();
}

async function setModel() {
  const [provider, modelId] = elements.modelSelect.value.split('\u0000');
  if (!provider || !modelId) {
    return;
  }
  await api('/api/model', {
    method: 'POST',
    body: JSON.stringify({ provider, modelId })
  });
  await loadState();
}

async function sendMessage(event) {
  event.preventDefault();
  const message = elements.messageInput.value.trim();
  if (!message) {
    return;
  }
  const mode = elements.sendMode.value;
  addMessage({ role: 'user', content: message });
  elements.messageInput.value = '';
  await api(`/api/${mode}`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
}

function updateContextPreview() {
  const enabled = elements.showIdeStateInput.checked;
  const context = buildIdeStatePreview();
  elements.contextSummary.textContent = enabled ? context.summary : t('context.none');
  elements.contextPreview.textContent = enabled && context.text ? context.text : t('context.none');
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
        gitFiles: gitFiles.map((file) => ({ status: file.status, path: file.path }))
      })
    }).catch(() => {});
  }, delay);
}

function buildIdeStatePreview() {
  const parts = [];
  const summary = [];
  const gitFiles = state.gitStatus && Array.isArray(state.gitStatus.files) ? state.gitStatus.files : [];
  if (state.previewMode === 'file' && state.currentFile) {
    summary.push(t('context.file', { path: state.currentFile.path }));
    if (state.previewDirty) {
      summary.push(t('context.dirty'));
    }
    parts.push([
      'Current file:',
      `path: ${state.currentFile.path}`,
      `unsaved: ${state.previewDirty ? 'yes' : 'no'}`,
      `read: open this file from the workspace when needed`,
      state.previewDirty ? t('context.unsavedWarning') : ''
    ].filter(Boolean).join('\n'));
  } else if (state.previewMode === 'diff' && state.activeChangePath) {
    summary.push(t('context.diff', { path: state.activeChangePath }));
    parts.push([
      'Current diff:',
      `path: ${state.activeChangePath}`,
      `read: inspect git diff for this path when needed`
    ].join('\n'));
  }
  if (gitFiles.length) {
    summary.push(t('context.git', { count: String(gitFiles.length) }));
    parts.push([
      'Git changes:',
      ...gitFiles.slice(0, 40).map((file) => `${file.status} ${file.path}`),
      gitFiles.length > 40 ? `... ${gitFiles.length - 40} more` : ''
    ].filter(Boolean).join('\n'));
  }
  const text = parts.length ? `${t('context.previewTitle')}\n${t('context.readInstruction')}\n\n${parts.join('\n\n')}` : '';
  return {
    summary: summary.length ? summary.join(' · ') : t('context.none'),
    text
  };
}

function handlePiEvent(event) {
  if (event.type === 'message_update') {
    handleMessageUpdate(event);
    return;
  }
  if (event.type === 'message_end' && event.message) {
    state.activeAssistant = null;
    return;
  }
  if (event.type && event.type.startsWith('tool_execution_')) {
    handleToolEvent(event);
    return;
  }
  if (event.type === 'agent_start') {
    addActivity('agent', t('activity.agentStarted'));
    return;
  }
  if (event.type === 'agent_end') {
    addActivity('agent', t('activity.agentFinished'));
    return;
  }
  if (event.type === 'runtime_stderr' || event.type === 'runtime_parse_error' || event.type === 'runtime_exit') {
    addActivity(event.type, formatEvent(event));
  }
}

function handleMessageUpdate(event) {
  const delta = event.assistantMessageEvent || {};
  if (delta.type !== 'text_delta' && delta.type !== 'thinking_delta') {
    return;
  }
  if (!state.activeAssistant) {
    state.activeAssistant = addMessage({ role: 'assistant', content: '' });
  }
  state.activeAssistant.content += delta.delta || '';
  renderMessages();
}

function handleToolEvent(event) {
  const id = event.toolCallId || `${event.toolName || 'tool'}-${Date.now()}`;
  const current = state.tools.get(id) || { id, name: event.toolName || 'tool', status: 'running', text: '' };
  current.name = event.toolName || current.name;
  current.status = event.type.replace('tool_execution_', '');
  current.text = extractToolText(event) || current.text || JSON.stringify(event.args || {}, null, 2);
  state.tools.set(id, current);
  renderActivity();
}

function extractToolText(event) {
  const result = event.partialResult || event.result;
  const content = result && Array.isArray(result.content) ? result.content : [];
  return content.map((item) => item.text || '').filter(Boolean).join('\n');
}

function renderRuntime() {
  const runtime = state.runtime || {};
  const pi = runtime.pi || {};
  elements.runtimeSummary.textContent = pi.running ? t('runtime.runningSummary') : t('runtime.stoppedSummary');
  elements.runtimeStatus.textContent = pi.running ? t('status.running') : t('status.stopped');
  elements.targetProject.textContent = runtime.targetProject || pi.cwd || '-';
  elements.startButton.disabled = Boolean(pi.running);
  elements.abortButton.disabled = !pi.running;
  elements.sendButton.disabled = !pi.running;
  updateModelControls();
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
  updateContextPreview();
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
    elements.projectTree.replaceChildren(...entries.map((entry) => renderTreeEntry(entry, 0)));
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

function renderTreeEntry(entry, depth) {
  const row = document.createElement('div');
  row.className = `tree-row ${entry.type}`;
  row.style.setProperty('--depth', depth);
  if (entry.type === 'file') {
    const active = state.currentFile && entry.path === state.currentFile.path;
    row.classList.toggle('current-file', Boolean(active));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.dataset.filePath = entry.path;
    button.setAttribute('data-help', active ? 'help.currentFile' : 'help.projectTab');
    if (active) {
      button.setAttribute('aria-current', 'true');
    }
    button.append(createFileIcon(entry.path), createFileLabel(entry.name));
    row.append(button);
    return row;
  }
  const children = Array.isArray(entry.children) ? entry.children : [];
  const collapsed = state.collapsedFolders.has(entry.path);
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'tree-folder-button';
  button.dataset.folderPath = entry.path;
  button.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  button.setAttribute('data-help', 'help.folderIcon');
  const marker = document.createElement('span');
  marker.className = 'tree-marker';
  marker.textContent = collapsed ? '>' : 'v';
  const label = document.createElement('span');
  label.textContent = entry.name;
  button.append(marker, createFolderIcon(collapsed), label);
  row.append(button);
  if (children.length && !collapsed) {
    row.append(...children.map((child) => renderTreeEntry(child, depth + 1)));
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
    button.append(status, fileCell);
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
  updateContextPreview();
  syncIdeState();
}

function showEditableFile(file) {
  setPreviewActive(true);
  state.currentFile = file;
  state.activeChangePath = normalizeGitPath(file.path);
  state.previewMode = 'file';
  state.previewEditing = false;
  state.previewDirty = false;
  state.previewSaveState = 'idle';
  state.previewSaveError = '';
  elements.previewTitle.textContent = file.path;
  setPreviewIcon(file.path);
  renderPreviewContent(file.content + (file.truncated ? t('preview.truncated') : ''), file.path, 'file');
  elements.previewEditor.readOnly = Boolean(file.truncated);
  updatePreviewMeta();
  renderGitStatus();
  updatePreviewActions();
  updateContextPreview();
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
  state.previewEditing = true;
  syncPreviewClass();
  elements.previewCode.focus();
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
  elements.previewEditor.value = content;
  const highlighted = highlightContent(content, filePath, mode);
  elements.previewCode.replaceChildren(...highlighted.nodes);
  elements.previewCode.dataset.fileKind = getFileKind(filePath).kind;
  elements.previewEditor.dataset.fileKind = getFileKind(filePath).kind;
  elements.previewEditor.readOnly = mode !== 'file' || Boolean(state.currentFile && state.currentFile.truncated);
  renderPreviewMinimap(highlighted.marks);
  syncPreviewClass();
  requestAnimationFrame(updatePreviewMinimapViewport);
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
  const pattern = /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/.*|#[0-9a-fA-F]{3,8}\b|#.*|<!DOCTYPE[^>]*>|&[a-zA-Z0-9#]+;|<\/?[a-zA-Z][\w:-]*|\b[a-zA-Z_$][\w$:-]*(?=\s*=)|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b[a-zA-Z_$][\w$]*(?=\s*\()|\b(?:async|await|const|let|var|function|return|if|else|for|while|class|import|export|from|try|catch|new|throw|true|false|null|undefined|def|with|as|self|None|True|False|public|private|static|void|int|string|boolean|document|window|return|this)\b|\b\d+(?:\.\d+)?(?:rem|em|px|vh|vw|vmin|vmax|%|s|ms|deg|turn)?\b|\b[a-zA-Z_$][\w$]*\b|[{}()[\].,;:=+\-*\/<>!&|?]+)/g;
  const nodes = [];
  const marks = [];
  content.split('\n').forEach((line, lineIndex) => {
    if (line.trim()) {
      marks.push({ line: lineIndex, type: 'line' });
    }
  });
  let index = 0;
  let htmlTagOpen = false;
  for (const match of content.matchAll(pattern)) {
    if (match.index > index) {
      appendSearchAwareText(nodes, content.slice(index, match.index), searchHit, index);
    }
    const tokenClass = getTokenClass(match[0], content.slice(match.index + match[0].length), language, htmlTagOpen);
    const cssColorMatch = language === 'css' ? match[0].match(/^(#[0-9a-fA-F]{3,8}\b)(.*)$/) : null;
    if (cssColorMatch) {
      nodes.push(...createSearchAwareToken(cssColorMatch[1], tokenClass, searchHit, match.index));
      if (cssColorMatch[2]) {
        nodes.push(...createSearchAwareToken(cssColorMatch[2], getTokenClass(cssColorMatch[2], '', language, htmlTagOpen), searchHit, match.index + cssColorMatch[1].length));
      }
    } else if (isQuotedString(match[0])) {
      nodes.push(...createHighlightedStringTokens(match[0], tokenClass, searchHit, match.index));
    } else {
      nodes.push(...createSearchAwareToken(match[0], tokenClass, searchHit, match.index));
    }
    if (tokenClass !== 'syntax-punctuation') {
      marks.push({ line: countLinesBefore(content, match.index), type: tokenClass.replace('syntax-', '') });
    }
    htmlTagOpen = getNextHtmlTagState(htmlTagOpen, match[0], tokenClass);
    index = match.index + match[0].length;
  }
  if (index < content.length) {
    appendSearchAwareText(nodes, content.slice(index), searchHit, index);
  }
  if (searchHit && searchHit.query) {
    for (const offset of getSearchHitOffsetsInText(content, searchHit.query)) {
      marks.push({ line: countLinesBefore(content, offset), type: 'search' });
    }
  }
  return { nodes, marks: normalizePreviewMarks(marks, content.split('\n').length) };
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

function countLinesBefore(content, index) {
  let lines = 0;
  for (let offset = 0; offset < index; offset += 1) {
    if (content.charCodeAt(offset) === 10) {
      lines += 1;
    }
  }
  return lines;
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
  const running = Boolean(state.runtime && state.runtime.pi && state.runtime.pi.running);
  elements.setModelButton.disabled = !running || !state.models.length;
}

function renderMessages() {
  elements.messages.replaceChildren(...state.messages.map((message) => {
    const node = document.createElement('article');
    node.className = `message ${message.role}`;
    node.textContent = getMessageText(message);
    return node;
  }));
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function renderActivity() {
  const items = Array.from(state.tools.values()).slice(-12).reverse();
  elements.activityList.replaceChildren(...items.map((tool) => {
    const node = document.createElement('article');
    node.className = 'activity-card';
    const title = document.createElement('strong');
    title.textContent = `${tool.name} · ${tool.status}`;
    const body = document.createElement('pre');
    body.textContent = tool.text || '-';
    node.append(title, body);
    return node;
  }));
}

function addMessage(message) {
  state.messages.push(message);
  renderMessages();
  return message;
}

function addSystemMessage(content, isError = false) {
  addMessage({ role: isError ? 'error' : 'system', content });
}

function addActivity(name, text) {
  state.tools.set(`${name}-${Date.now()}`, { id: name, name, status: 'info', text });
  renderActivity();
}

function getMessageText(message) {
  if (typeof message.content === 'string') {
    return message.content;
  }
  if (Array.isArray(message.content)) {
    return message.content.map((item) => item.text || item.thinking || JSON.stringify(item)).join('\n');
  }
  return JSON.stringify(message.content || message, null, 2);
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
