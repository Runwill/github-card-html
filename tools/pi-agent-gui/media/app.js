const state = {
  runtime: null,
  models: [],
  modelConfig: null,
  messages: [],
  activeAssistant: null,
  tools: new Map(),
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
    'actions.send': '发送',
    'sendMode.prompt': '任务',
    'sendMode.steer': '插话',
    'sendMode.followUp': '后续',
    'models.none': '暂无模型配置',
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
    'actions.send': 'Send',
    'sendMode.prompt': 'Prompt',
    'sendMode.steer': 'Steer',
    'sendMode.followUp': 'Follow-up',
    'models.none': 'No models configured',
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
