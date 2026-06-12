const vscode = require('vscode');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const CHAT_LANGUAGE_MODELS_FILE = path.join(os.homedir(), 'AppData', 'Roaming', 'Code', 'User', 'chatLanguageModels.json');

async function listModels(secrets) {
  const configuredModels = await getConfiguredModels();
  const exposedModels = await vscode.lm.selectChatModels();
  if (configuredModels.length) {
    const publicModels = await Promise.all(configuredModels.map((model) => toPublicConfiguredModel(model, secrets, exposedModels)));
    return publicModels.filter((model) => model.transport === 'chat-completions' || model.canSendDirectly);
  }

  return exposedModels.map(toPublicModel);
}

async function sendChat({ session, modelId, prompt, onText, token, secrets }) {
  const configuredModel = await findConfiguredModel(modelId);
  if (configuredModel && configuredModel.transport === 'chat-completions') {
    return sendChatCompletions({ configuredModel, session, prompt, onText, token, secrets });
  }

  const models = await vscode.lm.selectChatModels();
  const model = findModel(models, modelId, configuredModel);
  if (!model) {
    const configuredModels = await getConfiguredModels();
    if (configuredModels.some((candidate) => candidate.id === modelId)) {
      throw new Error(`VS Code has configured model "${modelId}", but the Language Model API did not expose it to this extension.`);
    }
    throw new Error('No VS Code language model is available to this extension.');
  }

  const messages = buildMessages(session.messages, prompt);
  const response = await model.sendRequest(messages, {}, token);
  let content = '';

  for await (const chunk of response.text) {
    content += chunk;
    onText(chunk, content);
  }

  return {
    content,
    modelId: model.id
  };
}

async function getConfiguredModels() {
  const models = [];
  const seen = new Set();
  const mobileConfig = vscode.workspace.getConfiguration('vscodeMobileChat');

  const customModels = mobileConfig.get('customModels') || [];
  for (const customModel of customModels) {
    if (typeof customModel === 'string') {
      addConfiguredModel(models, seen, customModel, 'vscodeMobileChat.customModels');
    } else if (customModel && typeof customModel === 'object') {
      addConfiguredModel(models, seen, customModel.id, 'vscodeMobileChat.customModels', customModel.name);
    }
  }

  await addModelsFromChatLanguageFiles(models, seen, mobileConfig);

  return models;
}

async function findConfiguredModel(modelId) {
  const requestedId = String(modelId || '').trim();
  if (!requestedId) {
    return undefined;
  }
  const configuredModels = await getConfiguredModels();
  return configuredModels.find((candidate) => candidate.id === requestedId);
}

async function findCustomEndpointModel(modelId) {
  const model = await findConfiguredModel(modelId);
  if (!model || model.transport !== 'chat-completions') {
    return undefined;
  }
  return model;
}

async function addModelsFromChatLanguageFiles(models, seen, mobileConfig) {
  const extraFiles = mobileConfig.get('modelConfigFiles') || [];
  const files = [CHAT_LANGUAGE_MODELS_FILE, ...extraFiles]
    .filter((filePath) => typeof filePath === 'string' && filePath.trim())
    .map((filePath) => expandHome(filePath.trim()));

  for (const filePath of [...new Set(files)]) {
    await addModelsFromChatLanguageFile(models, seen, filePath);
  }
}

async function addModelsFromChatLanguageFile(models, seen, filePath) {
  let entries;
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    entries = JSON.parse(raw.replace(/^\uFEFF/, ''));
  } catch {
    return;
  }
  if (!Array.isArray(entries)) {
    return;
  }

  entries.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      return;
    }
    const vendor = String(entry.vendor || '').trim();
    const providerName = String(entry.name || vendor || 'Model Provider').trim();
    addProviderSettingsModels(models, seen, entry, index, vendor, providerName);
    addProviderExplicitModels(models, seen, entry, index, vendor, providerName);
  });
}

function addProviderSettingsModels(models, seen, entry, index, vendor, providerName) {
  if (!entry.settings || typeof entry.settings !== 'object') {
    return;
  }
  for (const modelKey of Object.keys(entry.settings)) {
    const rawId = vendor === 'copilot' ? `copilot/${modelKey}` : `${vendor}/${modelKey}`;
    addConfiguredModel(models, seen, rawId, 'chatLanguageModels.json', modelKey, {
      providerName,
      vendor,
      rawModelId: modelKey,
      providerIndex: index,
      transport: 'vscode-lm'
    });
  }
}

function addProviderExplicitModels(models, seen, entry, index, vendor, providerName) {
  const explicitModels = Array.isArray(entry.models) ? entry.models : entry.models ? [entry.models] : [];
  for (const model of explicitModels) {
    if (!model || typeof model !== 'object') {
      continue;
    }
    const rawModelId = String(model.id || '').trim();
    if (!rawModelId) {
      continue;
    }
    const id = `chatLanguageModels:${index}:${rawModelId}`;
    addConfiguredModel(models, seen, id, 'chatLanguageModels.json', model.name || rawModelId, {
      providerName,
      vendor,
      rawModelId,
      providerIndex: index,
      transport: entry.apiType === 'chat-completions' ? 'chat-completions' : 'vscode-lm',
      apiKey: entry.apiKey,
      apiType: entry.apiType,
      url: model.url,
      toolCalling: model.toolCalling,
      vision: model.vision
    });
  }
}

function addConfiguredModel(models, seen, value, source, name, options = {}) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id || seen.has(id)) {
    return;
  }
  seen.add(id);
  models.push({
    id,
    name: name || id,
    vendor: '',
    family: '',
    version: '',
    maxInputTokens: undefined,
    source,
    configured: true,
    ...options
  });
}

function findModel(models, modelId, configuredModel) {
  if (!models.length) {
    return undefined;
  }
  const requestedId = String(modelId || '').trim();
  if (!requestedId) {
    return models[0];
  }
  const configuredIds = configuredModel ? [configuredModel.rawModelId, configuredModel.id, configuredModel.name].filter(Boolean) : [];
  return models.find((candidate) => (
    candidate.id === requestedId ||
    candidate.name === requestedId ||
    candidate.family === requestedId ||
    configuredIds.includes(candidate.id) ||
    configuredIds.includes(candidate.name) ||
    configuredIds.includes(candidate.family)
  ));
}

async function sendChatCompletions({ configuredModel, session, prompt, onText, token, secrets }) {
  const apiKey = await resolveApiKey(secrets, configuredModel);
  if (!configuredModel.url || !apiKey) {
    throw new Error(`Model "${configuredModel.name}" is missing a chat-completions URL or API key. Use Set key in the mobile model toolbar, or run "Mobile Chat: Set Custom Endpoint Key" on the desktop, to save a mobile key for this model.`);
  }

  const controller = new AbortController();
  const disposable = token && token.onCancellationRequested(() => controller.abort());
  try {
    const endpoint = buildChatCompletionsUrl(configuredModel.url);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: configuredModel.rawModelId,
        messages: buildOpenAiMessages(session.messages, prompt),
        stream: false
      }),
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error && data.error.message ? data.error.message : `Chat completions request failed: ${response.status}`);
    }
    const content = data.choices && data.choices[0] && data.choices[0].message ? String(data.choices[0].message.content || '') : '';
    onText(content, content);
    return {
      content,
      modelId: configuredModel.id
    };
  } finally {
    if (disposable) {
      disposable.dispose();
    }
  }
}

function buildChatCompletionsUrl(baseUrl) {
  const normalized = String(baseUrl || '').replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(normalized)) {
    return normalized;
  }
  if (/\/v\d+$/i.test(normalized)) {
    return `${normalized}/chat/completions`;
  }
  return `${normalized}/v1/chat/completions`;
}

function buildOpenAiMessages(history, prompt) {
  const systemPrompt = [
    'You are a coding assistant connected to VS Code through a mobile browser bridge.',
    'The mobile chat session is independent from native VS Code Copilot Chat sessions.',
    'Be concise, practical, and explicit when you need more context.'
  ].join('\n');

  const relevantHistory = history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-20)
    .map((message) => ({
      role: message.role,
      content: message.content || ''
    }));

  return [
    { role: 'system', content: systemPrompt },
    ...relevantHistory,
    { role: 'user', content: prompt }
  ];
}

async function toPublicConfiguredModel(model, secrets, exposedModels = []) {
  const hasSecretKey = await hasStoredApiKey(secrets, model);
  const canSendViaVsCode = model.transport !== 'chat-completions' && Boolean(findModel(exposedModels, model.id, model));
  return {
    id: model.id,
    name: model.name,
    vendor: model.vendor,
    family: model.family,
    version: model.version,
    maxInputTokens: model.maxInputTokens,
    source: model.source,
    configured: true,
    providerName: model.providerName,
    rawModelId: model.rawModelId,
    transport: model.transport,
    requiresVsCodeInputSecret: isInputVariable(model.apiKey),
    hasMobileApiKey: hasSecretKey,
    canSendDirectly: model.transport === 'chat-completions' ? Boolean(resolvePlainApiKey(model) || hasSecretKey) : canSendViaVsCode,
    sendPath: model.transport === 'chat-completions' ? 'custom-endpoint' : 'vscode-lm',
    toolCalling: model.toolCalling,
    vision: model.vision
  };
}

async function listCustomEndpointModels(secrets) {
  const models = (await getConfiguredModels()).filter((model) => model.transport === 'chat-completions');
  return Promise.all(models.map(async (model) => ({
    ...model,
    hasSecretKey: await hasStoredApiKey(secrets, model)
  })));
}

async function getCustomEndpointKeyStatus(secrets) {
  return listCustomEndpointModels(secrets);
}

async function setCustomEndpointKey(secrets, model, apiKey) {
  await secrets.store(secretKeyForModel(model), String(apiKey || '').trim());
}

async function clearCustomEndpointKey(secrets, model) {
  await secrets.delete(secretKeyForModel(model));
}

async function resolveApiKey(secrets, model) {
  const stored = secrets ? await secrets.get(secretKeyForModel(model)) : undefined;
  return stored || resolvePlainApiKey(model);
}

async function hasStoredApiKey(secrets, model) {
  return Boolean(secrets && await secrets.get(secretKeyForModel(model)));
}

function resolvePlainApiKey(model) {
  if (!model.apiKey || isInputVariable(model.apiKey)) {
    return '';
  }
  return String(model.apiKey).trim();
}

function secretKeyForModel(model) {
  return `customEndpointKey:${model.id}`;
}

function isInputVariable(value) {
  return /^\$\{input:[^}]+\}$/.test(String(value || '').trim());
}

function expandHome(filePath) {
  if (filePath === '~') {
    return os.homedir();
  }
  if (filePath.startsWith('~/') || filePath.startsWith('~\\')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  return filePath;
}

function toPublicModel(model) {
  return {
    id: model.id,
    name: model.name,
    vendor: model.vendor,
    family: model.family,
    version: model.version,
    maxInputTokens: model.maxInputTokens,
    source: 'vscode.lm.selectChatModels',
    configured: false
  };
}

function buildMessages(history, prompt) {
  const systemPrompt = [
    'You are a coding assistant connected to VS Code through a mobile browser bridge.',
    'The mobile chat session is independent from native VS Code Copilot Chat sessions.',
    'Be concise, practical, and explicit when you need more context.'
  ].join('\n');

  const relevantHistory = history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .slice(-20)
    .map((message) => {
      if (message.role === 'assistant') {
        return vscode.LanguageModelChatMessage.Assistant(message.content || '');
      }
      return vscode.LanguageModelChatMessage.User(message.content || '');
    });

  return [
    vscode.LanguageModelChatMessage.User(systemPrompt),
    ...relevantHistory,
    vscode.LanguageModelChatMessage.User(prompt)
  ];
}

function describeLmError(error) {
  if (error instanceof vscode.LanguageModelError) {
    return `${error.message}${error.code ? ` (${error.code})` : ''}`;
  }
  return error instanceof Error ? error.message : String(error);
}

module.exports = {
  clearCustomEndpointKey,
  describeLmError,
  findCustomEndpointModel,
  getCustomEndpointKeyStatus,
  listModels,
  listCustomEndpointModels,
  setCustomEndpointKey,
  sendChat
};
