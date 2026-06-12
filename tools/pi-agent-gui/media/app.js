const state = {
  runtime: null,
  models: [],
  modelConfig: null,
  messages: [],
  activeAssistant: null,
  tools: new Map(),
  projectTree: null,
  searchResults: null,
  gitStatus: null,
  currentFile: null,
  previewMode: 'empty',
  previewDirty: false,
  helpKey: 'help.default',
  language: localStorage.getItem('pi-agent-gui-language') || 'zh'
};

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
    'config.apiKey': 'API key 或环境变量',
    'config.modelId': '模型 ID',
    'config.displayName': '显示名称',
    'config.context': '上下文',
    'config.maxTokens': '最大输出',
    'config.reasoning': '推理模型',
    'config.noDeveloperRole': '不使用 developer role',
    'config.noReasoningEffort': '不发送 reasoning effort',
    'actions.start': '启动',
    'actions.abort': '中止',
    'actions.setModel': '设为当前模型',
    'actions.saveProvider': '保存 Provider',
    'actions.deleteProvider': '删除 Provider',
    'actions.search': '搜索',
    'actions.reload': '重载',
    'actions.saveFile': '保存',
    'actions.send': '发送',
    'sendMode.prompt': '任务',
    'sendMode.steer': '插话',
    'sendMode.followUp': '后续',
    'models.none': '暂无模型配置',
    'project.empty': '暂无可显示文件。',
    'project.truncated': '文件树已截断，建议从更具体目录查看。',
    'project.searchPlaceholder': '搜索文件名或内容',
    'project.searchEmpty': '没有搜索结果。',
    'project.searchHint': '输入至少 2 个字符搜索项目。',
    'project.searchTruncated': '搜索结果已截断，请输入更精确的关键词。',
    'changes.empty': '当前没有 Git 变更。',
    'preview.title': '预览',
    'preview.empty': '选择文件或变更后，会在这里预览内容。',
    'preview.fileMeta': '{path} · {size} bytes',
    'preview.diffMeta': '{path} · diff',
    'preview.savedMeta': '{path} · 已保存 · {size} bytes',
    'preview.dirty': '未保存',
    'preview.truncated': '\n\n[内容已截断]',
    'messages.configPath': '配置文件：{path}',
    'messages.saved': '已保存。重启 runtime 或重新打开模型列表后 Pi 会重新加载。',
    'messages.deleted': 'Provider 已删除。重启 runtime 或重新打开模型列表后 Pi 会重新加载。',
    'messages.providerRequired': '请先填写 Provider。',
    'activity.agentStarted': 'Agent 已开始',
    'activity.agentFinished': 'Agent 已完成',
    'composer.placeholder': '向共享 Pi agent 发送任务',
    'placeholders.optional': '可选',
    'help.title': '说明',
    'help.default': '悬浮、点击或聚焦到控件时，这里会显示功能解释。',
    'help.language': '切换界面语言，说明栏和主要控件文案会同步切换。',
    'help.start': '启动共享 Pi runtime，启动后手机和电脑会连接到同一个 agent 会话。',
    'help.abort': '中止当前 Pi agent 运行中的任务，不会删除配置或历史文件。',
    'help.runtimeTab': '查看共享 Pi runtime 的启动状态、当前项目和当前模型。',
    'help.projectTab': '浏览当前项目文件树，点击文件后在右侧预览内容。',
    'help.projectSearch': '按文件名或文件内容搜索当前项目，搜索结果会显示在项目树上方。',
    'help.projectSearchButton': '执行项目搜索，结果可直接点击打开到右侧编辑区。',
    'help.changesTab': '查看当前 Git 变更列表，点击文件后在右侧预览 diff。',
    'help.modelTab': '查看 Pi 当前可用模型，并把选中的模型设为本次 agent 会话使用的模型。',
    'help.configTab': '在浏览器中维护 Pi 的模型 Provider 配置，保存后 Pi 重新加载即可使用。',
    'help.activityTab': '查看 agent 启动、结束和工具调用等运行活动。',
    'help.modelSelect': '这里列出 Pi 从模型配置中识别到的可用模型。',
    'help.setModel': '把下拉框里的模型切换为 Pi agent 当前使用的模型。',
    'help.provider': 'Provider 是模型服务的名称，例如 openai、openrouter 或本地服务名。',
    'help.api': '选择该 Provider 使用的 API 协议，需与服务商兼容接口匹配。',
    'help.baseUrl': '填写模型服务的 API 根地址，例如 OpenAI 兼容接口的 /v1 地址。',
    'help.apiKey': '建议填写环境变量引用，例如 $OPENAI_API_KEY，避免把密钥明文写入配置文件。',
    'help.modelId': '填写服务商真实模型 ID，Pi 会用它向 Provider 发起请求。',
    'help.modelName': '可选显示名，只影响界面展示，不改变实际请求的模型 ID。',
    'help.contextWindow': '模型上下文窗口大小，用来告诉 Pi 可保留多少上下文。',
    'help.maxTokens': '单次回复允许的最大输出 token 数。',
    'help.reasoning': '开启后把该模型标记为推理模型，适合支持 reasoning 的模型。',
    'help.noDeveloperRole': '如果 Provider 不支持 developer role，开启此项让 Pi 避免发送该角色。',
    'help.noReasoningEffort': '如果 Provider 不支持 reasoning effort 参数，开启此项避免发送该字段。',
    'help.saveProvider': '保存当前 Provider 和模型配置到 Pi 的 models.json。',
    'help.deleteProvider': '删除当前 Provider 配置；删除前请确认 Provider 名称正确。',
    'help.reloadFile': '重新从磁盘读取当前文件，会丢弃右侧编辑区尚未保存的修改。',
    'help.saveFile': '把右侧编辑区内容保存回当前项目文件。只会写入当前项目目录内的已存在文件。',
    'help.previewEditor': '显示文件、diff 或错误内容。打开普通文件后可直接编辑并保存。',
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
    'config.apiKey': 'API key or env ref',
    'config.modelId': 'Model ID',
    'config.displayName': 'Display name',
    'config.context': 'Context',
    'config.maxTokens': 'Max tokens',
    'config.reasoning': 'Reasoning model',
    'config.noDeveloperRole': 'No developer role',
    'config.noReasoningEffort': 'No reasoning effort',
    'actions.start': 'Start',
    'actions.abort': 'Abort',
    'actions.setModel': 'Set model',
    'actions.saveProvider': 'Save provider',
    'actions.deleteProvider': 'Delete provider',
    'actions.search': 'Search',
    'actions.reload': 'Reload',
    'actions.saveFile': 'Save',
    'actions.send': 'Send',
    'sendMode.prompt': 'Prompt',
    'sendMode.steer': 'Steer',
    'sendMode.followUp': 'Follow-up',
    'models.none': 'No models configured',
    'project.empty': 'No files to display.',
    'project.truncated': 'The file tree was truncated. Open a narrower folder when available.',
    'project.searchPlaceholder': 'Search files or content',
    'project.searchEmpty': 'No search results.',
    'project.searchHint': 'Enter at least 2 characters to search the project.',
    'project.searchTruncated': 'Search results were truncated. Try a more specific query.',
    'changes.empty': 'No Git changes right now.',
    'preview.title': 'Preview',
    'preview.empty': 'Select a file or change to preview it here.',
    'preview.fileMeta': '{path} · {size} bytes',
    'preview.diffMeta': '{path} · diff',
    'preview.savedMeta': '{path} · saved · {size} bytes',
    'preview.dirty': 'Unsaved',
    'preview.truncated': '\n\n[Content truncated]',
    'messages.configPath': 'Config: {path}',
    'messages.saved': 'Saved. Restart runtime or reopen model list to reload Pi models.',
    'messages.deleted': 'Provider deleted. Restart runtime or reopen model list to reload Pi models.',
    'messages.providerRequired': 'Provider is required.',
    'activity.agentStarted': 'Agent started',
    'activity.agentFinished': 'Agent finished',
    'composer.placeholder': 'Send a task to the shared Pi agent',
    'placeholders.optional': 'optional',
    'help.title': 'Help',
    'help.default': 'Hover, tap, or focus a control to show its explanation here.',
    'help.language': 'Switch the UI language. The help panel and main control labels update together.',
    'help.start': 'Start the shared Pi runtime so phone and desktop connect to the same agent session.',
    'help.abort': 'Abort the currently running Pi agent task without deleting configuration or files.',
    'help.runtimeTab': 'View the shared Pi runtime status, target project, and active model.',
    'help.projectTab': 'Browse the current project file tree and preview selected files on the right.',
    'help.projectSearch': 'Search the current project by file name or file content. Results appear above the tree.',
    'help.projectSearchButton': 'Run project search. Results can be opened directly in the editor on the right.',
    'help.changesTab': 'Review current Git changes and preview file diffs on the right.',
    'help.modelTab': 'View available Pi models and set the selected model for this agent session.',
    'help.configTab': 'Maintain Pi model provider settings in the browser, then reload Pi to use them.',
    'help.activityTab': 'Watch agent starts, finishes, and tool activity from the shared runtime.',
    'help.modelSelect': 'This list shows models that Pi discovered from the model configuration.',
    'help.setModel': 'Switch Pi agent to the model currently selected in the list.',
    'help.provider': 'Provider is the model service name, such as openai, openrouter, or a local endpoint.',
    'help.api': 'Choose the API protocol used by this provider. It must match the provider endpoint.',
    'help.baseUrl': 'Enter the model service API base URL, such as an OpenAI-compatible /v1 endpoint.',
    'help.apiKey': 'Prefer an environment variable reference like $OPENAI_API_KEY instead of storing a raw secret.',
    'help.modelId': 'Enter the provider model ID that Pi should send with requests.',
    'help.modelName': 'Optional display name. It only changes the UI label, not the real model ID.',
    'help.contextWindow': 'The model context window size, used by Pi to estimate how much context can be kept.',
    'help.maxTokens': 'The maximum output token count allowed for one response.',
    'help.reasoning': 'Mark this model as a reasoning model when the provider supports reasoning behavior.',
    'help.noDeveloperRole': 'Enable this if the provider does not accept developer role messages.',
    'help.noReasoningEffort': 'Enable this if the provider does not accept the reasoning effort parameter.',
    'help.saveProvider': 'Save the current provider and model settings into Pi models.json.',
    'help.deleteProvider': 'Delete the current provider configuration. Check the provider name first.',
    'help.reloadFile': 'Reload the current file from disk. This discards unsaved editor changes.',
    'help.saveFile': 'Save the editor content back to the current project file. It only writes existing files inside the project.',
    'help.previewEditor': 'Shows file, diff, or error content. Open a regular file to edit and save it.',
    'help.sendMode': 'Prompt starts a new goal; Steer adds mid-run guidance; Follow-up continues the previous turn.',
    'help.messageInput': 'Type the task, steering note, or follow-up you want to send to the shared Pi agent.',
    'help.sendButton': 'Submit the current input to the shared Pi agent using the selected send mode.'
  }
};

const elements = {
  runtimeSummary: document.getElementById('runtimeSummary'),
  helpText: document.getElementById('helpText'),
  languageSelect: document.getElementById('languageSelect'),
  tabButtons: Array.from(document.querySelectorAll('.tab-button')),
  panelSections: Array.from(document.querySelectorAll('.panel-section')),
  runtimeStatus: document.getElementById('runtimeStatus'),
  targetProject: document.getElementById('targetProject'),
  currentModel: document.getElementById('currentModel'),
  projectSearchForm: document.getElementById('projectSearchForm'),
  projectSearchInput: document.getElementById('projectSearchInput'),
  projectSearchResults: document.getElementById('projectSearchResults'),
  projectTree: document.getElementById('projectTree'),
  projectStatus: document.getElementById('projectStatus'),
  changesList: document.getElementById('changesList'),
  changesStatus: document.getElementById('changesStatus'),
  previewTitle: document.getElementById('previewTitle'),
  previewMeta: document.getElementById('previewMeta'),
  previewEditor: document.getElementById('previewEditor'),
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
  sendMode: document.getElementById('sendMode'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton')
};

init().catch((error) => addSystemMessage(error.message || String(error), true));

async function init() {
  applyLanguage();
  bindEvents();
  connectEvents();
  await loadRuntime();
  await Promise.allSettled([loadProjectTree(), loadGitStatus()]);
  await loadModelConfig();
  if (state.runtime.pi.running) {
    await Promise.allSettled([loadState(), loadModels(), loadMessages()]);
  }
}

function bindEvents() {
  elements.languageSelect.addEventListener('change', setLanguage);
  for (const button of elements.tabButtons) {
    button.addEventListener('click', () => activatePanel(button.dataset.panelTarget));
  }
  elements.projectSearchForm.addEventListener('submit', searchProject);
  elements.projectSearchInput.addEventListener('keydown', handleProjectSearchKeydown);
  elements.projectSearchResults.addEventListener('click', handleSearchResultClick);
  elements.projectTree.addEventListener('click', handleProjectTreeClick);
  elements.changesList.addEventListener('click', handleChangesClick);
  elements.previewEditor.addEventListener('input', markPreviewDirty);
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
  elements.composer.addEventListener('submit', sendMessage);
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
  try {
    state.searchResults = await api(`/api/project/search?q=${encodeURIComponent(query)}`);
    renderSearchResults();
  } catch (error) {
    elements.projectSearchResults.textContent = error.message || String(error);
  }
}

function handleProjectSearchKeydown(event) {
  if (event.key !== 'Enter' || event.isComposing) {
    return;
  }
  event.preventDefault();
  elements.projectSearchForm.requestSubmit();
}

async function handleSearchResultClick(event) {
  const button = event.target.closest('[data-file-path]');
  if (!button) {
    return;
  }
  await openProjectFile(button.dataset.filePath);
}

async function handleProjectTreeClick(event) {
  const button = event.target.closest('[data-file-path]');
  if (!button) {
    return;
  }
  await openProjectFile(button.dataset.filePath);
}

async function openProjectFile(filePath) {
  try {
    const file = await api(`/api/project/file?path=${encodeURIComponent(filePath)}`);
    showEditableFile(file);
  } catch (error) {
    showPreviewError(error);
  }
}

async function handleChangesClick(event) {
  const button = event.target.closest('[data-change-path]');
  if (!button) {
    return;
  }
  try {
    const diff = await api(`/api/git/diff?path=${encodeURIComponent(button.dataset.changePath)}`);
    setPreviewActive(true);
    state.currentFile = null;
    state.previewMode = 'diff';
    state.previewDirty = false;
    elements.previewTitle.textContent = diff.path;
    elements.previewMeta.textContent = t('preview.diffMeta', { path: diff.path });
    elements.previewEditor.value = diff.diff || t('changes.empty');
    elements.previewEditor.readOnly = true;
    updatePreviewActions();
  } catch (error) {
    showPreviewError(error);
  }
}

async function reloadCurrentFile() {
  if (!state.currentFile) {
    return;
  }
  await openProjectFile(state.currentFile.path);
}

async function saveCurrentFile() {
  if (!state.currentFile || state.previewMode !== 'file') {
    return;
  }
  try {
    const result = await api(`/api/project/file?path=${encodeURIComponent(state.currentFile.path)}`, {
      method: 'PUT',
      body: JSON.stringify({ content: elements.previewEditor.value })
    });
    state.currentFile = { ...state.currentFile, size: result.size, content: elements.previewEditor.value, truncated: false };
    state.previewDirty = false;
    elements.previewMeta.textContent = t('preview.savedMeta', { path: result.path, size: String(result.size) });
    updatePreviewActions();
    await loadGitStatus().catch(() => {});
  } catch (error) {
    showPreviewError(error);
  }
}

function markPreviewDirty() {
  if (state.previewMode !== 'file') {
    return;
  }
  state.previewDirty = true;
  updatePreviewMeta();
  updatePreviewActions();
}

async function saveModelConfig(event) {
  event.preventDefault();
  const payload = {
    providerId: elements.providerIdInput.value,
    api: elements.apiTypeSelect.value,
    baseUrl: elements.baseUrlInput.value,
    apiKey: elements.apiKeyInput.value,
    modelId: elements.modelIdInput.value,
    modelName: elements.modelNameInput.value,
    contextWindow: elements.contextWindowInput.value,
    maxTokens: elements.maxTokensInput.value,
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
    if (state.runtime && state.runtime.pi && state.runtime.pi.running) {
      await loadModels().catch(() => {});
    }
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
    elements.modelConfigStatus.textContent = t('messages.deleted');
    if (state.runtime && state.runtime.pi && state.runtime.pi.running) {
      await loadModels().catch(() => {});
    }
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
  elements.contextWindowInput.value = firstModel && firstModel.contextWindow ? firstModel.contextWindow : '';
  elements.maxTokensInput.value = firstModel && firstModel.maxTokens ? firstModel.maxTokens : '';
  elements.reasoningInput.checked = Boolean(firstModel && firstModel.reasoning);
  elements.disableDeveloperRoleInput.checked = Boolean(provider.compat && provider.compat.supportsDeveloperRole === false);
  elements.disableReasoningEffortInput.checked = Boolean(provider.compat && provider.compat.supportsReasoningEffort === false);
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
  if (!state.models.length) {
    loadModels().catch(() => {});
  }
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
  setHelp(state.helpKey);
}

function setHelp(key = 'help.default') {
  state.helpKey = key;
  elements.helpText.textContent = t(key);
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
}

function renderSearchResults() {
  const results = state.searchResults && state.searchResults.results ? state.searchResults.results : [];
  if (!results.length) {
    elements.projectSearchResults.textContent = t('project.searchEmpty');
    return;
  }
  elements.projectSearchResults.replaceChildren(...results.map((result) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-result-row';
    button.dataset.filePath = result.path;
    button.setAttribute('data-help', 'help.projectSearch');
    const title = document.createElement('strong');
    title.textContent = result.line ? `${result.path}:${result.line}` : result.path;
    const preview = document.createElement('span');
    preview.textContent = result.preview || result.path;
    button.append(title, preview);
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
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'text-button';
    button.dataset.filePath = entry.path;
    button.textContent = entry.name;
    button.setAttribute('data-help', 'help.projectTab');
    row.append(button);
    return row;
  }
  const label = document.createElement('strong');
  label.textContent = entry.name;
  row.append(label);
  const children = Array.isArray(entry.children) ? entry.children : [];
  if (children.length) {
    row.append(...children.map((child) => renderTreeEntry(child, depth + 1)));
  }
  return row;
}

function renderGitStatus() {
  const files = state.gitStatus && state.gitStatus.files ? state.gitStatus.files : [];
  if (!files.length) {
    elements.changesList.textContent = t('changes.empty');
    elements.changesStatus.textContent = '';
    return;
  }
  elements.changesList.replaceChildren(...files.map((file) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'change-row';
    button.dataset.changePath = normalizeGitPath(file.path);
    button.setAttribute('data-help', 'help.changesTab');
    const status = document.createElement('span');
    status.className = 'change-status';
    status.textContent = file.status;
    const name = document.createElement('span');
    name.textContent = file.path;
    button.append(status, name);
    return button;
  }));
  elements.changesStatus.textContent = '';
}

function normalizeGitPath(filePath) {
  return String(filePath || '').split(' -> ').pop();
}

function showPreviewError(error) {
  setPreviewActive(true);
  state.currentFile = null;
  state.previewMode = 'error';
  state.previewDirty = false;
  elements.previewTitle.textContent = t('preview.title');
  elements.previewMeta.textContent = '';
  elements.previewEditor.value = error.message || String(error);
  elements.previewEditor.readOnly = true;
  updatePreviewActions();
}

function showEditableFile(file) {
  setPreviewActive(true);
  state.currentFile = file;
  state.previewMode = 'file';
  state.previewDirty = false;
  elements.previewTitle.textContent = file.path;
  elements.previewEditor.value = file.content + (file.truncated ? t('preview.truncated') : '');
  elements.previewEditor.readOnly = Boolean(file.truncated);
  updatePreviewMeta();
  updatePreviewActions();
}

function updatePreviewMeta() {
  if (!state.currentFile) {
    return;
  }
  const dirty = state.previewDirty ? ` · ${t('preview.dirty')}` : '';
  elements.previewMeta.textContent = `${t('preview.fileMeta', {
    path: state.currentFile.path,
    size: String(state.currentFile.size)
  })}${dirty}`;
}

function updatePreviewActions() {
  const editable = state.previewMode === 'file' && state.currentFile && !state.currentFile.truncated;
  elements.reloadFileButton.disabled = !state.currentFile;
  elements.saveFileButton.disabled = !editable || !state.previewDirty;
}

function setPreviewActive(active) {
  document.body.classList.toggle('preview-active', active);
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
