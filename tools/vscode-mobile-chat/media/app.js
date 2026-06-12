const params = new URLSearchParams(location.search);
const token = params.get('token') || localStorage.getItem('mobileChatToken') || '';
if (token) {
  localStorage.setItem('mobileChatToken', token);
}

const state = {
  sessions: [],
  models: [],
  currentSessionId: localStorage.getItem('mobileChatSessionId') || '',
  messages: new Map()
};

const elements = {
  workspaceStatus: document.getElementById('workspaceStatus'),
  newSessionButton: document.getElementById('newSessionButton'),
  sessionSelect: document.getElementById('sessionSelect'),
  modelSelect: document.getElementById('modelSelect'),
  modelStatus: document.getElementById('modelStatus'),
  setKeyButton: document.getElementById('setKeyButton'),
  clearKeyButton: document.getElementById('clearKeyButton'),
  messages: document.getElementById('messages'),
  composer: document.getElementById('composer'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton'),
  keyDialog: document.getElementById('keyDialog'),
  keyForm: document.getElementById('keyForm'),
  keyDialogTitle: document.getElementById('keyDialogTitle'),
  keyInput: document.getElementById('keyInput'),
  cancelKeyButton: document.getElementById('cancelKeyButton'),
  confirmDialog: document.getElementById('confirmDialog'),
  confirmForm: document.getElementById('confirmForm'),
  confirmDialogTitle: document.getElementById('confirmDialogTitle'),
  confirmDialogMessage: document.getElementById('confirmDialogMessage'),
  cancelConfirmButton: document.getElementById('cancelConfirmButton')
};

init().catch((error) => showFatal(error.message || String(error)));

async function init() {
  await Promise.all([loadModels(), loadSessions(), loadWorkspaceStatus()]);
  if (!state.sessions.length) {
    await createSession();
  } else if (!state.sessions.some((session) => session.id === state.currentSessionId)) {
    setCurrentSession(state.sessions[0].id);
  } else {
    renderSessions();
  }
  await loadMessages();
  connectEvents();
  bindEvents();
}

function bindEvents() {
  elements.newSessionButton.addEventListener('click', () => createSession());
  elements.sessionSelect.addEventListener('change', async () => {
    setCurrentSession(elements.sessionSelect.value);
    await loadMessages();
  });
  elements.modelSelect.addEventListener('change', updateKeyButtons);
  elements.setKeyButton.addEventListener('click', setCurrentModelKey);
  elements.clearKeyButton.addEventListener('click', clearCurrentModelKey);
  elements.cancelKeyButton.addEventListener('click', closeKeyDialog);
  elements.cancelConfirmButton.addEventListener('click', closeConfirmDialog);
  elements.composer.addEventListener('submit', sendMessage);
}

async function loadModels() {
  const data = await api('/api/models');
  state.models = data.models || [];
  elements.modelSelect.replaceChildren(...state.models.map((model) => option(model.id, getModelName(model))));
  if (!state.models.length) {
    elements.modelSelect.append(option('', 'No usable model'));
  }
  updateKeyButtons();
}

function getCurrentModel() {
  return state.models.find((model) => model.id === elements.modelSelect.value);
}

function updateKeyButtons() {
  const model = getCurrentModel();
  const canConfigureKey = Boolean(model && model.transport === 'chat-completions');
  elements.modelStatus.textContent = model ? getModelStatusText(model) : 'No model available';
  elements.setKeyButton.hidden = !canConfigureKey;
  elements.clearKeyButton.hidden = !canConfigureKey || !model.hasMobileApiKey;
  elements.setKeyButton.textContent = model && model.hasMobileApiKey ? 'Update key' : 'Set key';
  elements.sendButton.disabled = Boolean(!model || !model.canSendDirectly);
}

async function setCurrentModelKey() {
  const model = getCurrentModel();
  if (!model || model.transport !== 'chat-completions') {
    return;
  }
  const apiKey = await askForApiKey(model);
  if (!apiKey || !apiKey.trim()) {
    return;
  }
  await api('/api/custom-endpoint-key', {
    method: 'POST',
    body: JSON.stringify({ modelId: model.id, apiKey })
  });
  await reloadModelsKeepingSelection(model.id);
}

async function clearCurrentModelKey() {
  const model = getCurrentModel();
  if (!model || model.transport !== 'chat-completions' || !model.hasMobileApiKey) {
    return;
  }
  const confirmed = await askForConfirmation({
    title: 'Clear API key',
    message: `Remove the saved API key for ${model.name || model.id}?`,
    action: 'Clear'
  });
  if (!confirmed) {
    return;
  }
  await api('/api/custom-endpoint-key', {
    method: 'DELETE',
    body: JSON.stringify({ modelId: model.id })
  });
  await reloadModelsKeepingSelection(model.id);
}

async function reloadModelsKeepingSelection(modelId) {
  await loadModels();
  if (state.models.some((model) => model.id === modelId)) {
    elements.modelSelect.value = modelId;
  }
  updateKeyButtons();
}

function askForApiKey(model) {
  return new Promise((resolve) => {
    elements.keyDialogTitle.textContent = `API key for ${model.name || model.id}`;
    elements.keyInput.value = '';
    elements.keyDialog.returnValue = '';
    let settled = false;

    const finish = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      elements.keyForm.removeEventListener('submit', handleSubmit);
      elements.keyDialog.removeEventListener('close', handleClose);
      elements.keyInput.value = '';
      resolve(value);
    };
    const handleSubmit = (event) => {
      event.preventDefault();
      const value = elements.keyInput.value;
      finish(value);
      closeKeyDialog();
    };
    const handleClose = () => finish('');

    elements.keyForm.addEventListener('submit', handleSubmit);
    elements.keyDialog.addEventListener('close', handleClose);
      if (typeof elements.keyDialog.showModal !== 'function') {
        finish('');
        return;
      }
      elements.keyDialog.showModal();
      elements.keyInput.focus();
  });
}

function closeKeyDialog() {
  if (elements.keyDialog.open) {
    elements.keyDialog.close();
  }
}

function askForConfirmation({ title, message, action }) {
  return new Promise((resolve) => {
    elements.confirmDialogTitle.textContent = title;
    elements.confirmDialogMessage.textContent = message;
    document.getElementById('confirmActionButton').textContent = action;
    let settled = false;

    const finish = (value) => {
      if (settled) {
        return;
      }
      settled = true;
      elements.confirmForm.removeEventListener('submit', handleSubmit);
      elements.confirmDialog.removeEventListener('close', handleClose);
      resolve(value);
    };
    const handleSubmit = (event) => {
      event.preventDefault();
      finish(true);
      closeConfirmDialog();
    };
    const handleClose = () => finish(false);

    elements.confirmForm.addEventListener('submit', handleSubmit);
    elements.confirmDialog.addEventListener('close', handleClose);
    if (typeof elements.confirmDialog.showModal !== 'function') {
      finish(false);
      return;
    }
    elements.confirmDialog.showModal();
  });
}

function closeConfirmDialog() {
  if (elements.confirmDialog.open) {
    elements.confirmDialog.close();
  }
}

function getModelName(model) {
  const label = model.name || model.id;
  if (model.providerName) {
    return `${label} (${model.providerName})`;
  }
  return label;
}

function getModelStatusText(model) {
  if (model.transport === 'chat-completions') {
    if (model.hasMobileApiKey || model.canSendDirectly) {
      return 'Custom endpoint - ready';
    }
    return 'Custom endpoint - set key to send';
  }
  return 'VS Code model - no mobile key needed';
}

async function loadSessions() {
  const data = await api('/api/sessions');
  state.sessions = data.sessions || [];
  renderSessions();
}

async function loadWorkspaceStatus() {
  const data = await api('/api/workspace/status');
  const folders = data.workspaceFolders && data.workspaceFolders.length ? data.workspaceFolders.join(', ') : 'No workspace';
  const activeFile = data.activeFile ? ` - ${data.activeFile}` : '';
  elements.workspaceStatus.textContent = `${folders}${activeFile} - ${data.diagnostics || 0} problems`;
}

async function createSession() {
  const data = await api('/api/sessions', {
    method: 'POST',
    body: JSON.stringify({ title: 'Mobile Chat' })
  });
  await loadSessions();
  setCurrentSession(data.session.id);
  await loadMessages();
}

function setCurrentSession(sessionId) {
  state.currentSessionId = sessionId;
  localStorage.setItem('mobileChatSessionId', sessionId);
  renderSessions();
}

function renderSessions() {
  elements.sessionSelect.replaceChildren(
    ...state.sessions.map((session) => option(session.id, `${session.title} (${session.messageCount})`))
  );
  elements.sessionSelect.value = state.currentSessionId;
}

async function loadMessages() {
  if (!state.currentSessionId) {
    return;
  }
  const data = await api(`/api/sessions/${encodeURIComponent(state.currentSessionId)}/messages`);
  state.messages.clear();
  elements.messages.replaceChildren();
  for (const message of data.messages || []) {
    renderMessage(message);
  }
  scrollToBottom();
}

async function sendMessage(event) {
  event.preventDefault();
  const content = elements.messageInput.value.trim();
  if (!content || !state.currentSessionId || !getCurrentModel() || !getCurrentModel().canSendDirectly) {
    return;
  }
  elements.messageInput.value = '';
  elements.sendButton.disabled = true;
  try {
    await api(`/api/sessions/${encodeURIComponent(state.currentSessionId)}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        modelId: elements.modelSelect.value
      })
    });
  } catch (error) {
    renderMessage({ id: `error-${Date.now()}`, role: 'assistant', content: error.message, error: true });
  } finally {
    elements.sendButton.disabled = false;
  }
}

function connectEvents() {
  const url = new URL('/events', location.href);
  if (token) {
    url.searchParams.set('token', token);
  }
  const events = new EventSource(url);
  events.addEventListener('message:created', (event) => {
    const { payload } = JSON.parse(event.data);
    if (payload.sessionId === state.currentSessionId) {
      renderMessage(payload.message);
      scrollToBottom();
    }
  });
  events.addEventListener('message:delta', (event) => {
    const { payload } = JSON.parse(event.data);
    if (payload.sessionId === state.currentSessionId) {
      updateMessage(payload.messageId, payload.content);
      scrollToBottom();
    }
  });
  events.addEventListener('message:error', (event) => {
    const { payload } = JSON.parse(event.data);
    if (payload.sessionId === state.currentSessionId) {
      updateMessage(payload.messageId, payload.error, true);
      scrollToBottom();
    }
  });
  events.addEventListener('sessions:changed', () => loadSessions().catch(console.error));
}

function renderMessage(message) {
  if (state.messages.has(message.id)) {
    updateMessage(message.id, message.content, message.error);
    return;
  }
  const node = document.createElement('article');
  node.className = `message ${message.role === 'user' ? 'user' : 'assistant'}`;
  if (message.error) {
    node.classList.add('error');
  }
  node.dataset.messageId = message.id;
  node.textContent = message.content || '';
  state.messages.set(message.id, node);
  elements.messages.append(node);
}

function updateMessage(messageId, content, isError = false) {
  const node = state.messages.get(messageId);
  if (!node) {
    renderMessage({ id: messageId, role: 'assistant', content, error: isError });
    return;
  }
  node.textContent = content || '';
  node.classList.toggle('error', Boolean(isError));
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('Accept', 'application/json');
  if (options.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(path, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function option(value, label) {
  const node = document.createElement('option');
  node.value = value;
  node.textContent = label;
  return node;
}

function scrollToBottom() {
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function showFatal(message) {
  elements.workspaceStatus.textContent = message;
  renderMessage({ id: 'fatal', role: 'assistant', content: message, error: true });
}
