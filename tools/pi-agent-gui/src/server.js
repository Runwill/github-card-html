const fs = require('fs/promises');
const http = require('http');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const { checkCommand } = require('./commandCheck');
const { PiRpcClient } = require('./piRpcClient');

const execFileAsync = promisify(execFile);
const MAX_BODY_BYTES = 256 * 1024;
const MAX_TREE_DEPTH = 4;
const MAX_TREE_ENTRIES = 240;
const MAX_FILE_BYTES = 256 * 1024;
const MAX_DIFF_BYTES = 512 * 1024;
const MAX_SEARCH_RESULTS = 80;
const MAX_SEARCH_FILE_BYTES = 128 * 1024;
const MAX_SESSION_FILES = 80;
const MAX_SESSION_PREVIEW_RECORDS = 6;
const MAX_SESSION_PREVIEW_TEXT = 360;
const MAX_SESSION_MESSAGES = 400;
const ignoredTreeNames = new Set(['.git', 'node_modules', '.venv', 'env', 'dist', 'build', 'coverage', '.vite']);
const rootDir = path.resolve(__dirname, '..');
const mediaDir = path.join(rootDir, 'media');
const extensionPath = path.join(rootDir, 'extension', 'ide-bridge.js');
const defaultTarget = path.resolve(rootDir, '..', '..');
const host = process.env.PI_AGENT_GUI_HOST || '127.0.0.1';
const port = Number(process.env.PI_AGENT_GUI_PORT || 3002);
const targetProject = path.resolve(process.env.PI_AGENT_GUI_TARGET || defaultTarget);
const piCommand = process.env.PI_AGENT_GUI_PI_COMMAND || 'pi';
const approve = process.env.PI_AGENT_GUI_APPROVE === '1';
const tools = process.env.PI_AGENT_GUI_TOOLS || '';
const configDir = path.resolve(process.env.PI_CODING_AGENT_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.pi', 'agent'));
const modelsConfigPath = path.join(configDir, 'models.json');
const guiSessionConfigPath = path.join(configDir, 'pi-agent-gui-session.json');
let sessionConfig = readSessionConfig();

const clients = new Set();
let pi = null;
const recentEvents = [];
const terminalOutput = [];
let ideState = createDefaultIdeState();
const editCheckpoints = new Map();
const MAX_TERMINAL_OUTPUT = 300;

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    sendJson(response, 500, { error: error.message || String(error) });
  });
});

server.listen(port, host, () => {
  console.log(`Pi Agent GUI listening at http://${host}:${port}/`);
  console.log(`Target project: ${targetProject}`);
  broadcastRuntimeTrace('server', `listening at http://${host}:${port}/`);
});

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function route(request, response) {
  const requestUrl = new URL(request.url || '/', `http://${host}:${port}`);

  if (request.method === 'GET' && requestUrl.pathname === '/') {
    await sendStatic(response, 'index.html', 'text/html; charset=utf-8');
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/app.js') {
    await sendStatic(response, 'app.js', 'text/javascript; charset=utf-8');
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/style.css') {
    await sendStatic(response, 'style.css', 'text/css; charset=utf-8');
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/events') {
    openEventStream(response);
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/runtime') {
    sendJson(response, 200, getRuntime());
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/runtime/start') {
    await startRuntime();
    sendJson(response, 202, getRuntime());
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/runtime/stop') {
    if (pi) {
      await pi.stop();
    }
    sendJson(response, 200, getRuntime());
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/state') {
    const result = await requireRuntime().request({ type: 'get_state' });
    sendJson(response, 200, result.data || {});
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/messages') {
    sendJson(response, 200, await readMessages(requestUrl.searchParams.get('session')));
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/sessions') {
    sendJson(response, 200, await readSessions());
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/models') {
    if (pi && pi.isRunning) {
      const result = await requireRuntime().request({ type: 'get_available_models' });
      sendJson(response, 200, result.data || { models: [] });
      return;
    }
    sendJson(response, 200, buildModelsFromConfig(await readModelConfig()));
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/model-config') {
    sendJson(response, 200, sanitizeModelConfig(await readModelConfig()));
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/project/tree') {
    sendJson(response, 200, await readProjectTree(requestUrl.searchParams.get('path') || ''));
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/project/file') {
    sendJson(response, 200, await readProjectFile(requestUrl.searchParams.get('path') || ''));
    return;
  }
  if (request.method === 'PUT' && requestUrl.pathname === '/api/project/file') {
    const body = await readJson(request);
    sendJson(response, 200, await writeProjectFile(requestUrl.searchParams.get('path') || '', body));
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/edit-checkpoints') {
    sendJson(response, 200, await createEditCheckpoint(await readJson(request)));
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname.startsWith('/api/edit-checkpoints/')) {
    const parts = requestUrl.pathname.split('/').filter(Boolean);
    const checkpointId = decodeURIComponent(parts[2] || '');
    if (parts[3] === 'diff') {
      sendJson(response, 200, await readEditCheckpointDiff(checkpointId, requestUrl.searchParams.get('path') || ''));
      return;
    }
    sendJson(response, 200, await getEditCheckpointStatus(checkpointId));
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname.startsWith('/api/edit-checkpoints/')) {
    const parts = requestUrl.pathname.split('/').filter(Boolean);
    const checkpointId = decodeURIComponent(parts[2] || '');
    const action = parts[3] || '';
    if (action === 'accept') {
      sendJson(response, 200, acceptEditCheckpoint(checkpointId));
      return;
    }
    if (action === 'restore') {
      sendJson(response, 200, await restoreEditCheckpoint(checkpointId));
      return;
    }
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/project/search') {
    sendJson(response, 200, await searchProject(requestUrl.searchParams.get('q') || '', requestUrl.searchParams.get('scope') || 'all'));
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/git/status') {
    sendJson(response, 200, await readGitStatus());
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/git/diff') {
    sendJson(response, 200, await readGitDiff(requestUrl.searchParams.get('path') || ''));
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/bridge/ide-state') {
    ideState = normalizeIdeState(await readJson(request));
    sendJson(response, 200, ideState);
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/bridge/ide-context') {
    sendJson(response, 200, await readIdeContext());
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/bridge/ide-file') {
    sendJson(response, 200, await readBridgeIdeFile(requestUrl.searchParams.get('path') || ''));
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/bridge/ide-diff') {
    sendJson(response, 200, await readBridgeIdeDiff(requestUrl.searchParams.get('path') || ''));
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/bridge/ide-changes') {
    sendJson(response, 200, await readBridgeIdeChanges());
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/bridge/unsaved-buffers') {
    sendJson(response, 200, readBridgeUnsavedBuffers());
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/model-config/providers') {
    const body = await readJson(request);
    const config = await upsertProviderConfig(body);
    sendJson(response, 200, sanitizeModelConfig(config));
    return;
  }
  if (request.method === 'DELETE' && requestUrl.pathname.startsWith('/api/model-config/providers/')) {
    const providerId = decodeURIComponent(requestUrl.pathname.slice('/api/model-config/providers/'.length));
    const config = await deleteProviderConfig(providerId);
    sendJson(response, 200, sanitizeModelConfig(config));
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/model') {
    const body = await readJson(request);
    const provider = String(body.provider || '').trim();
    const modelId = String(body.modelId || '').trim();
    if (!provider || !modelId) {
      sendJson(response, 400, { error: 'provider and modelId are required.' });
      return;
    }
    const result = await requireRuntime().request({ type: 'set_model', provider, modelId });
    sendJson(response, 200, result.data || {});
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/prompt') {
    await handleTextCommand(request, response, 'prompt', 'message');
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/steer') {
    await handleTextCommand(request, response, 'steer', 'message');
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/follow-up') {
    await handleTextCommand(request, response, 'follow_up', 'message');
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/abort') {
    const result = await requireRuntime().request({ type: 'abort' });
    sendJson(response, 202, result);
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/sessions') {
    const result = await requireRuntime().request({ type: 'new_session' });
    sendJson(response, 202, result.data || {});
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/sessions/selection') {
    if (pi && pi.isRunning) {
      sendJson(response, 409, { error: 'Stop runtime before changing the startup session.' });
      return;
    }
    sessionConfig = normalizeSessionSelection(await readJson(request));
    await writeSessionConfig(sessionConfig);
    sendJson(response, 200, { session: sessionConfig });
    return;
  }
  if (request.method === 'POST' && requestUrl.pathname === '/api/extension-ui-response') {
    const body = await readJson(request);
    const result = await requireRuntime().request({ type: 'extension_ui_response', ...body });
    sendJson(response, 202, result);
    return;
  }

  sendJson(response, 404, { error: 'Not found.' });
}

function sanitizeModelConfig(config) {
  const providers = {};
  for (const [providerId, provider] of Object.entries(config.providers || {})) {
    const nextProvider = { ...provider };
    if (typeof nextProvider.apiKey === 'string' && !nextProvider.apiKey.startsWith('$')) {
      nextProvider.apiKey = '';
      nextProvider.hasLiteralApiKey = true;
    }
    providers[providerId] = nextProvider;
  }
  return { path: config.path, providers };
}

function buildModelsFromConfig(config) {
  const models = [];
  for (const [providerId, provider] of Object.entries(config.providers || {})) {
    const providerModels = Array.isArray(provider.models) ? provider.models : [];
    for (const model of providerModels) {
      if (!model || !model.id) {
        continue;
      }
      models.push({
        ...model,
        provider: providerId,
        id: model.id,
        api: provider.api || '',
        baseUrl: provider.baseUrl || ''
      });
    }
  }
  return { models };
}

async function startRuntime() {
  if (pi && pi.isRunning) {
    broadcastRuntimeTrace('runtime', 'already running');
    return;
  }
  broadcastRuntimeTrace('runtime', `starting ${piCommand} in ${targetProject}`);
  const hasPi = await checkCommand(piCommand);
  if (!hasPi) {
    broadcastRuntimeTrace('runtime', `${piCommand} was not found in PATH`);
    throw new Error('Pi command was not found in PATH. Install it with: npm install -g --ignore-scripts @earendil-works/pi-coding-agent');
  }
  pi = new PiRpcClient({
    command: piCommand,
    cwd: targetProject,
    name: path.basename(targetProject) || 'pi-agent-gui',
    approve,
    tools,
    extraArgs: buildPiExtraArgs()
  });
  process.env.PI_AGENT_GUI_BRIDGE_BASE_URL = getBridgeBaseUrl();
  process.env.PI_AGENT_GUI_BRIDGE_URL = `${process.env.PI_AGENT_GUI_BRIDGE_BASE_URL}/ide-context`;
  pi.on('rpc-event', (event) => {
    const trace = formatRuntimeTraceEvent(event);
    if (trace) {
      broadcastRuntimeTrace('rpc', trace);
    }
    broadcast('pi:event', event);
  });
  pi.on('terminal-output', (entry) => broadcastTerminalOutput(entry));
  pi.on('status', (status) => broadcast('runtime:status', status));
  pi.on('error-event', (event) => broadcast('runtime:error', event));
  pi.start();
  try {
    await waitForRuntimeReady(pi);
    broadcastRuntimeTrace('runtime', 'RPC ready');
  } catch (error) {
    broadcastRuntimeTrace('runtime', `failed to become ready: ${error.message || String(error)}`);
    pi.stop();
    throw error;
  }
}

async function waitForRuntimeReady(client) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < 8000) {
    if (!client.isRunning) {
      throw new Error(lastError ? lastError.message : 'Pi runtime exited before RPC became ready.');
    }
    try {
      await client.request({ type: 'get_state' }, 2000);
      return;
    } catch (error) {
      lastError = error;
      await delay(250);
    }
  }
  throw new Error(lastError ? lastError.message : 'Timed out while waiting for Pi RPC to become ready.');
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireRuntime() {
  if (!pi || !pi.isRunning) {
    throw new Error('Pi runtime is not running. Press Start runtime first.');
  }
  return pi;
}

async function handleTextCommand(request, response, type, field) {
  const body = await readJson(request);
  const message = String(body[field] || '').trim();
  if (!message) {
    sendJson(response, 400, { error: 'Message is required.' });
    return;
  }
  const command = { type, [field]: message };
  if (body.streamingBehavior) {
    command.streamingBehavior = body.streamingBehavior;
  }
  let runtime;
  try {
    runtime = requireRuntime();
  } catch (error) {
    broadcastRuntimeTrace('request', `${type} rejected: ${error.message || String(error)}`);
    throw error;
  }
  broadcastRuntimeTrace('request', `${type} accepted by GUI server`);
  sendJson(response, 202, { accepted: true, command: type });
  runtime.request(command)
    .then((result) => {
      broadcastRuntimeTrace('response', `${type} completed`);
      broadcast('pi:event', { ...result, command: type, guiCommand: true });
    })
    .catch((error) => {
      broadcastRuntimeTrace('response', `${type} failed: ${error.message || String(error)}`);
      broadcast('pi:event', {
        type: 'response',
        command: type,
        guiCommand: true,
        success: false,
        error: error.message || String(error)
      });
    });
}

function getRuntime() {
  return {
    version: require('../package.json').version,
    host,
    port,
    targetProject,
    modelsConfigPath,
    piCommand,
    approve,
    tools: tools || null,
    extensionPath,
    session: sessionConfig,
    terminalOutput: terminalOutput.slice(-MAX_TERMINAL_OUTPUT),
    pi: pi ? pi.status() : { running: false, command: piCommand, cwd: targetProject }
  };
}

function readSessionConfig() {
  const sessionId = String(process.env.PI_AGENT_GUI_SESSION_ID || '').trim();
  const session = String(process.env.PI_AGENT_GUI_SESSION || '').trim();
  const sessionDir = String(process.env.PI_AGENT_GUI_SESSION_DIR || process.env.PI_CODING_AGENT_SESSION_DIR || '').trim();
  const resume = process.env.PI_AGENT_GUI_RESUME === '1';
  const continueSession = process.env.PI_AGENT_GUI_CONTINUE === '1';
  const noSession = process.env.PI_AGENT_GUI_NO_SESSION === '1';
  if (sessionId || session || sessionDir || resume || continueSession || noSession) {
    return normalizeSessionConfig({
      mode: noSession ? 'none' : continueSession ? 'continue' : resume ? 'resume' : session ? 'session' : sessionId ? 'session-id' : 'default',
      sessionId,
      session,
      sessionDir,
      resume,
      continue: continueSession,
      noSession
    });
  }
  return readStoredSessionConfig() || normalizeSessionConfig({
    mode: noSession ? 'none' : continueSession ? 'continue' : resume ? 'resume' : session ? 'session' : sessionId ? 'session-id' : 'default',
    sessionId,
    session,
    sessionDir,
    resume,
    continue: continueSession,
    noSession
  });
}

function readStoredSessionConfig() {
  try {
    const content = require('fs').readFileSync(guiSessionConfigPath, 'utf8');
    return normalizeSessionSelection(JSON.parse(content));
  } catch {
    return null;
  }
}

async function writeSessionConfig(config) {
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(guiSessionConfigPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}

function normalizeSessionConfig(config) {
  return normalizeSessionSelection({
    mode: config.mode,
    session: config.session,
    sessionId: config.sessionId,
    sessionDir: config.sessionDir
  });
}

function normalizeSessionSelection(body) {
  const mode = String(body.mode || 'default').trim();
  const sessionId = String(body.sessionId || '').trim();
  const session = String(body.session || '').trim();
  const sessionDir = String(body.sessionDir || '').trim();
  const allowedModes = new Set(['default', 'continue', 'resume', 'session', 'session-id', 'none']);
  if (!allowedModes.has(mode)) {
    throw new Error('Unsupported session mode.');
  }
  if (mode === 'session' && !session) {
    throw new Error('Session path or id is required.');
  }
  if (mode === 'session-id' && !sessionId) {
    throw new Error('Session id is required.');
  }
  return {
    mode,
    sessionId: mode === 'session-id' ? sessionId : null,
    session: mode === 'session' ? session : null,
    sessionDir: sessionDir || null,
    resume: mode === 'resume',
    continue: mode === 'continue',
    noSession: mode === 'none'
  };
}

async function readSessions() {
  const sessionDir = sessionConfig.sessionDir || process.env.PI_CODING_AGENT_SESSION_DIR || path.join(configDir, 'sessions');
  const files = await collectSessionFiles(sessionDir).catch(() => []);
  const sessions = [];
  for (const file of files.slice(0, MAX_SESSION_FILES)) {
    const session = await readSessionSummary(file, sessionDir).catch(() => null);
    if (session) {
      sessions.push(session);
    }
  }
  return {
    sessionDir,
    selected: sessionConfig,
    sessions,
    truncated: files.length > MAX_SESSION_FILES
  };
}

async function readMessages(requestedSession) {
  if (requestedSession) {
    return readSessionMessages(requestedSession);
  }
  if (pi && pi.isRunning) {
    const result = await pi.request({ type: 'get_messages' });
    return { source: 'runtime', readOnly: false, ...(result.data || { messages: [] }) };
  }
  if (sessionConfig.mode === 'session' && sessionConfig.session) {
    return readSessionMessages(sessionConfig.session);
  }
  return { messages: [], source: 'none', readOnly: true };
}

async function readSessionMessages(sessionPath) {
  const filePath = await resolveSessionFilePath(sessionPath);
  const content = await fs.readFile(filePath, 'utf8');
  const messages = [];
  const activities = [];
  const lines = content.split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const message = normalizeSessionHistoryMessage(parseJsonLine(line), messages.length);
    if (message) {
      messages.push(message);
      activities.push(...extractMessageActivities(message));
    }
  }
  return {
    messages: messages.slice(-MAX_SESSION_MESSAGES),
    activities: activities.slice(-MAX_SESSION_MESSAGES),
    source: 'session',
    readOnly: true,
    session: filePath,
    truncated: messages.length > MAX_SESSION_MESSAGES
  };
}

async function resolveSessionFilePath(sessionPath) {
  const sessionDir = path.resolve(sessionConfig.sessionDir || process.env.PI_CODING_AGENT_SESSION_DIR || path.join(configDir, 'sessions'));
  const value = String(sessionPath || '').trim();
  if (!value) {
    throw new Error('Session history is required.');
  }
  if (value.endsWith('.jsonl')) {
    return assertSessionFileInsideDir(path.resolve(value), sessionDir);
  }
  const files = await collectSessionFiles(sessionDir).catch(() => []);
  const matched = files.find((file) => extractSessionId(file.path) === value || path.basename(file.path, '.jsonl') === value);
  if (!matched) {
    throw new Error('Session history file was not found for this session id.');
  }
  return assertSessionFileInsideDir(matched.path, sessionDir);
}

function assertSessionFileInsideDir(filePath, sessionDir) {
  if (!filePath.endsWith('.jsonl')) {
    throw new Error('Session history must be a .jsonl file.');
  }
  const relativePath = path.relative(sessionDir, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Session history must be inside the configured session directory.');
  }
  return filePath;
}

function normalizeSessionHistoryMessage(record, index) {
  if (!record || record.type !== 'message') {
    return null;
  }
  const message = record.message || record;
  const role = typeof message.role === 'string' ? message.role : 'system';
  const content = message.content ?? message.text ?? message.message;
  const text = extractSessionMessageText(content).trim();
  const tools = extractSessionMessageTools(message, record, index);
  if (!text && !tools.length) {
    return null;
  }
  return {
    id: message.id || record.id || `session-${index}`,
    role,
    content: preserveSessionContent(content, text),
    toolName: message.toolName || record.toolName || null,
    details: message.details || record.details || null,
    tools,
    timestamp: message.timestamp || record.timestamp || null,
    sessionHistory: true
  };
}

function preserveSessionContent(content, text) {
  if (Array.isArray(content)) {
    return content;
  }
  if (content && typeof content === 'object') {
    return content;
  }
  return text;
}

function extractSessionMessageTools(message, record, index) {
  const tools = [];
  if (Array.isArray(message.tools)) {
    for (const [toolIndex, tool] of message.tools.entries()) {
      const normalized = normalizeSessionTool(tool, message, `tool-${index}-${toolIndex}`);
      if (normalized) {
        tools.push(normalized);
      }
    }
  }
  if (message.role === 'toolResult' || record.role === 'toolResult') {
    const normalized = normalizeSessionTool({ ...record, ...message, type: 'toolResult' }, message, `tool-result-${index}`);
    if (normalized) {
      tools.push(normalized);
    }
  }
  if (Array.isArray(message.content)) {
    for (const [contentIndex, item] of message.content.entries()) {
      if (!item || (item.type !== 'toolCall' && item.type !== 'toolResult')) {
        continue;
      }
      const normalized = normalizeSessionTool(item, message, `content-tool-${index}-${contentIndex}`);
      if (normalized) {
        tools.push(normalized);
      }
    }
  }
  return tools;
}

function normalizeSessionTool(tool, message, fallbackId) {
  if (!tool || typeof tool !== 'object') {
    return null;
  }
  const kind = tool.type === 'toolResult' || message.role === 'toolResult' ? 'result' : 'call';
  const name = tool.toolName || tool.name || message.toolName || 'tool';
  const status = tool.status || tool.state || (kind === 'result' ? 'result' : 'history');
  const text = extractSessionMessageText(tool.content || tool.text || tool.result || tool.partialResult || tool.output)
    || stringifySessionPayload(tool.args || tool.arguments || tool.input || tool.details || tool);
  return {
    id: tool.id || tool.toolCallId || fallbackId,
    name,
    status,
    kind,
    text,
    timestamp: tool.timestamp || message.timestamp || null,
    history: true
  };
}

function extractMessageActivities(message) {
  const activities = [];
  for (const tool of message.tools || []) {
    activities.push({
      ...tool,
      id: `history-${message.id}-${tool.id}`,
      timestamp: tool.timestamp || message.timestamp || null,
      history: true
    });
  }
  return activities;
}

function stringifySessionPayload(payload) {
  if (!payload) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

async function collectSessionFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectSessionFiles(absolutePath));
    } else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      const stats = await fs.stat(absolutePath);
      files.push({ path: absolutePath, stats });
    }
  }
  return files.sort((left, right) => right.stats.mtimeMs - left.stats.mtimeMs);
}

async function readSessionSummary(file, root) {
  const content = await fs.readFile(file.path, 'utf8');
  const allLines = content.split(/\r?\n/).filter(Boolean);
  const records = allLines.slice(0, 40).map((line) => parseJsonLine(line)).filter(Boolean);
  const first = records[0] || {};
  const nameRecord = records.find((record) => record.name);
  const modelRecord = records.find((record) => record.provider || record.modelId);
  const id = first.id || extractSessionId(file.path);
  const previewMessages = extractSessionPreviewMessages(allLines);
  return {
    id,
    name: nameRecord ? nameRecord.name : '',
    file: file.path,
    relativeFile: path.relative(root, file.path).replace(/\\/g, '/'),
    cwd: first.cwd || '',
    provider: modelRecord ? modelRecord.provider || '' : '',
    modelId: modelRecord ? modelRecord.modelId || '' : '',
    updatedAt: file.stats.mtime.toISOString(),
    size: file.stats.size,
    messageCount: previewMessages.count,
    previewMessages: previewMessages.items
  };
}

function extractSessionPreviewMessages(lines) {
  const items = [];
  let count = 0;
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const record = parseJsonLine(lines[index]);
    const message = normalizeSessionMessage(record);
    if (!message) {
      continue;
    }
    count += 1;
    if (items.length < MAX_SESSION_PREVIEW_RECORDS) {
      items.unshift(message);
    }
  }
  return { count, items };
}

function normalizeSessionMessage(record) {
  if (!record || record.type !== 'message') {
    return null;
  }
  const message = record.message || record;
  const role = typeof message.role === 'string' ? message.role : 'message';
  const text = extractSessionMessageText(message.content || message.text || message.message).replace(/\s+/g, ' ').trim();
  if (!text) {
    return null;
  }
  const truncated = text.length > MAX_SESSION_PREVIEW_TEXT;
  return {
    role,
    text: truncated ? `${text.slice(0, MAX_SESSION_PREVIEW_TEXT).trimEnd()}...` : text,
    timestamp: message.timestamp || record.timestamp || null
  };
}

function extractSessionMessageText(content) {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content.map((item) => extractSessionMessageText(item)).filter(Boolean).join('\n');
  }
  if (content && typeof content === 'object') {
    if (typeof content.text === 'string') {
      return content.text;
    }
    if (content.content) {
      return extractSessionMessageText(content.content);
    }
    if (content.input) {
      return extractSessionMessageText(content.input);
    }
  }
  return '';
}

function parseJsonLine(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function extractSessionId(filePath) {
  const base = path.basename(filePath, '.jsonl');
  const match = base.match(/_([0-9a-fA-F-]{16,})$/);
  return match ? match[1] : base;
}

function buildPiExtraArgs() {
  const args = ['--extension', extensionPath];
  if (sessionConfig.noSession) {
    args.push('--no-session');
    return args;
  }
  if (sessionConfig.sessionDir) {
    args.push('--session-dir', sessionConfig.sessionDir);
  }
  if (sessionConfig.continue) {
    args.push('--continue');
  }
  if (sessionConfig.resume) {
    args.push('--resume');
  }
  if (sessionConfig.session) {
    args.push('--session', sessionConfig.session);
  }
  if (sessionConfig.sessionId) {
    args.push('--session-id', sessionConfig.sessionId);
  }
  return args;
}

function getBridgeBaseUrl() {
  return `http://${host === '0.0.0.0' ? '127.0.0.1' : host}:${port}/api/bridge`;
}

function createDefaultIdeState() {
  return {
    previewMode: 'empty',
    activeFile: null,
    activeDiff: null,
    previewDirty: false,
    contextScope: 'all',
    contextItems: ['file', 'diff', 'git', 'unsaved'],
    contextFiles: [],
    gitFiles: [],
    updatedAt: new Date().toISOString()
  };
}

function normalizeIdeState(body) {
  const previewMode = ['empty', 'file', 'diff', 'error'].includes(body.previewMode) ? body.previewMode : 'empty';
  const contextItems = normalizeContextItems(body.contextItems, body.contextScope);
  const contextScope = normalizeLegacyContextScope(contextItems);
  const contextFiles = normalizeContextFiles(body.contextFiles);
  const gitFiles = Array.isArray(body.gitFiles) ? body.gitFiles.slice(0, 80).map((file) => ({
    status: String(file.status || '').slice(0, 8),
    path: normalizeRelativePath(file.path || '')
  })).filter((file) => file.path) : [];
  return {
    previewMode,
    activeFile: body.activeFile ? normalizeRelativePath(body.activeFile) : null,
    activeDiff: body.activeDiff ? normalizeRelativePath(body.activeDiff) : null,
    previewDirty: Boolean(body.previewDirty),
    contextScope,
    contextItems,
    contextFiles,
    gitFiles,
    updatedAt: new Date().toISOString()
  };
}

async function readIdeContext() {
  const gitStatus = await readGitStatus().catch(() => ({ root: targetProject, files: ideState.gitFiles || [] }));
  const gitFiles = Array.isArray(gitStatus.files) ? gitStatus.files : [];
  const contextItems = normalizeContextItems(ideState.contextItems, ideState.contextScope);
  const includeFile = contextItems.includes('file');
  const includeDiff = contextItems.includes('diff');
  const includeGit = contextItems.includes('git');
  const includeUnsaved = contextItems.includes('unsaved');
  const ide = {
    ...ideState,
    activeFile: includeFile ? ideState.activeFile : null,
    activeDiff: includeDiff ? ideState.activeDiff : null,
    previewDirty: includeUnsaved ? ideState.previewDirty : false,
    contextFiles: includeFile ? normalizeContextFiles(ideState.contextFiles) : [],
    gitFiles: includeGit ? gitFiles : []
  };
  const contextScope = normalizeLegacyContextScope(contextItems);
  return {
    root: targetProject,
    cwd: targetProject,
    contextScope,
    contextItems,
    ide,
    git: {
      root: gitStatus.root || targetProject,
      files: includeGit ? gitFiles : []
    },
    tools: {
      readFile: 'Use read_ide_file with ide.activeFile when file contents are needed.',
      readDiff: 'Use read_ide_diff with ide.activeDiff when diff contents are needed.',
      listChanges: 'Use list_ide_changes for the Git change list allowed by selected contextItems.',
      unsavedBuffers: 'Use get_unsaved_buffers before trusting disk content when ide.previewDirty is true.'
    }
  };
}

async function readBridgeIdeFile(relativePath) {
  assertBridgeScope('file');
  const filePath = normalizeBridgePath(relativePath, ideState.activeFile, 'No active file is available.');
  if (filePath !== ideState.activeFile) {
    if (!canReadContextFile(filePath) && !canReadAdditionalPath('file')) {
      throw new Error('The selected context only allows the active file.');
    }
  }
  return readProjectFile(filePath);
}

async function readBridgeIdeDiff(relativePath) {
  assertBridgeScope('diff');
  const diffPath = normalizeBridgePath(relativePath, ideState.activeDiff || ideState.activeFile, 'No active diff is available.');
  if (ideState.activeDiff && diffPath !== ideState.activeDiff) {
    if (!canReadAdditionalPath('diff')) {
      throw new Error('The selected context only allows the active diff.');
    }
  }
  return readGitDiff(diffPath);
}

async function readBridgeIdeChanges() {
  assertBridgeScope('git');
  return readGitStatus();
}

function readBridgeUnsavedBuffers() {
  assertBridgeScope('unsaved');
  const buffers = [];
  if (ideState.activeFile && ideState.previewDirty) {
    buffers.push({ path: ideState.activeFile, active: true, dirty: true, contentAvailable: false });
  }
  return { root: targetProject, buffers };
}

function assertBridgeScope(kind) {
  const contextItems = normalizeContextItems(ideState.contextItems, ideState.contextScope);
  if (kind === 'unsaved' && contextItems.includes('unsaved')) {
    return;
  }
  if (contextItems.includes(kind)) {
    return;
  }
  throw new Error(`Selected IDE context does not allow ${kind}.`);
}

function canReadAdditionalPath(kind) {
  const contextItems = normalizeContextItems(ideState.contextItems, ideState.contextScope);
  return contextItems.includes(kind) && contextItems.includes('git');
}

function canReadContextFile(filePath) {
  const contextItems = normalizeContextItems(ideState.contextItems, ideState.contextScope);
  return contextItems.includes('file') && normalizeContextFiles(ideState.contextFiles).includes(filePath);
}

function normalizeContextItems(items, legacyScope = 'all') {
  const allowed = ['file', 'diff', 'git', 'unsaved'];
  if (Array.isArray(items)) {
    return allowed.filter((key) => items.includes(key));
  }
  if (legacyScope === 'none') {
    return [];
  }
  if (legacyScope === 'file') {
    return ['file', 'unsaved'];
  }
  if (legacyScope === 'diff') {
    return ['diff'];
  }
  if (legacyScope === 'git') {
    return ['git'];
  }
  return allowed;
}

function normalizeLegacyContextScope(contextItems) {
  const selected = normalizeContextItems(contextItems);
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

function normalizeContextFiles(files) {
  if (!Array.isArray(files)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  for (const file of files.slice(0, 80)) {
    const filePath = normalizeRelativePath(file || '');
    if (!filePath || seen.has(filePath)) {
      continue;
    }
    seen.add(filePath);
    normalized.push(filePath);
  }
  return normalized;
}

function normalizeBridgePath(requestedPath, fallbackPath, fallbackError) {
  const value = normalizeRelativePath(requestedPath || fallbackPath || '');
  if (!value) {
    throw new Error(fallbackError);
  }
  return value;
}

async function readModelConfig() {
  try {
    const text = await fs.readFile(modelsConfigPath, 'utf8');
    const parsed = text.trim() ? JSON.parse(text) : {};
    const providers = parsed.providers && typeof parsed.providers === 'object' ? parsed.providers : {};
    return { path: modelsConfigPath, providers };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { path: modelsConfigPath, providers: {} };
    }
    throw error;
  }
}

async function upsertProviderConfig(body) {
  const providerId = normalizeId(body.providerId, 'providerId');
  const api = normalizeApi(body.api);
  const baseUrl = String(body.baseUrl || '').trim();
  const apiKey = String(body.apiKey || '').trim();
  const modelId = normalizeId(body.modelId, 'modelId');
  const modelName = String(body.modelName || '').trim();
  const contextWindow = normalizePositiveNumber(body.contextWindow);
  const maxTokens = normalizePositiveNumber(body.maxTokens);
  const reasoning = Boolean(body.reasoning);
  const disableDeveloperRole = Boolean(body.disableDeveloperRole);
  const disableReasoningEffort = Boolean(body.disableReasoningEffort);

  if (!baseUrl && api !== 'anthropic-messages') {
    throw new Error('baseUrl is required for this provider type.');
  }

  const config = await readModelConfig();
  const providers = { ...config.providers };
  const previousProvider = providers[providerId] && typeof providers[providerId] === 'object' ? providers[providerId] : {};
  const previousApiKey = typeof previousProvider.apiKey === 'string' ? previousProvider.apiKey.trim() : '';
  const nextApiKey = apiKey || previousApiKey;
  if (!nextApiKey) {
    throw new Error('apiKey is required. Use an environment reference like $OPENAI_API_KEY if you do not want to store the literal key.');
  }
  const models = Array.isArray(previousProvider.models) ? previousProvider.models.slice() : [];
  const model = {
    id: modelId,
    ...(modelName ? { name: modelName } : {}),
    ...(reasoning ? { reasoning: true } : {}),
    ...(contextWindow ? { contextWindow } : {}),
    ...(maxTokens ? { maxTokens } : {})
  };
  const modelIndex = models.findIndex((item) => item && item.id === modelId);
  if (modelIndex >= 0) {
    models[modelIndex] = { ...models[modelIndex], ...model };
  } else {
    models.push(model);
  }

  const provider = {
    ...previousProvider,
    ...(baseUrl ? { baseUrl } : {}),
    api,
    apiKey: nextApiKey,
    models
  };
  const compat = buildCompat(disableDeveloperRole, disableReasoningEffort);
  if (compat) {
    provider.compat = { ...(previousProvider.compat || {}), ...compat };
  }
  providers[providerId] = provider;
  const nextConfig = { providers };
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(modelsConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
  return { path: modelsConfigPath, providers };
}

async function deleteProviderConfig(providerId) {
  const id = normalizeId(providerId, 'providerId');
  const config = await readModelConfig();
  const providers = { ...config.providers };
  delete providers[id];
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(modelsConfigPath, `${JSON.stringify({ providers }, null, 2)}\n`, 'utf8');
  return { path: modelsConfigPath, providers };
}

function normalizeId(value, field) {
  const text = String(value || '').trim();
  if (!text) {
    throw new Error(`${field} is required.`);
  }
  return text;
}

function normalizeApi(value) {
  const api = String(value || '').trim();
  const allowed = new Set(['openai-completions', 'openai-responses', 'anthropic-messages', 'google-generative-ai']);
  if (!allowed.has(api)) {
    throw new Error('Unsupported provider API.');
  }
  return api;
}

function normalizePositiveNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error('Token limits must be positive numbers.');
  }
  return Math.round(number);
}

function buildCompat(disableDeveloperRole, disableReasoningEffort) {
  const compat = {};
  if (disableDeveloperRole) {
    compat.supportsDeveloperRole = false;
  }
  if (disableReasoningEffort) {
    compat.supportsReasoningEffort = false;
  }
  return Object.keys(compat).length ? compat : null;
}

async function readProjectTree(relativePath) {
  const directory = resolveProjectPath(relativePath);
  const stats = await fs.stat(directory);
  if (!stats.isDirectory()) {
    throw new Error('Project tree path must be a directory.');
  }
  const counter = { count: 0, truncated: false };
  const root = await buildTree(directory, normalizeRelativePath(relativePath), 0, counter);
  return {
    root: targetProject,
    path: root.path,
    entries: root.children || [],
    truncated: counter.truncated
  };
}

async function buildTree(absolutePath, relativePath, depth, counter) {
  if (depth >= MAX_TREE_DEPTH || counter.count >= MAX_TREE_ENTRIES) {
    counter.truncated = true;
    return { type: 'directory', name: path.basename(absolutePath), path: relativePath, children: [] };
  }
  const entries = (await fs.readdir(absolutePath, { withFileTypes: true })).sort((left, right) => {
    if (left.isDirectory() !== right.isDirectory()) {
      return left.isDirectory() ? 1 : -1;
    }
    return left.name.localeCompare(right.name);
  });
  const children = [];
  for (const entry of entries) {
    if (counter.count >= MAX_TREE_ENTRIES) {
      counter.truncated = true;
      break;
    }
    if (ignoredTreeNames.has(entry.name)) {
      continue;
    }
    const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const childAbsolutePath = path.join(absolutePath, entry.name);
    counter.count += 1;
    if (entry.isDirectory()) {
      children.push(await buildTree(childAbsolutePath, childRelativePath, depth + 1, counter));
    } else if (entry.isFile()) {
      children.push({ type: 'file', name: entry.name, path: childRelativePath });
    }
  }
  children.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === 'directory' ? -1 : 1;
    }
    return left.name.localeCompare(right.name);
  });
  return { type: 'directory', name: path.basename(absolutePath), path: relativePath, children };
}

async function readProjectFile(relativePath) {
  const filePath = resolveProjectPath(relativePath);
  const stats = await fs.stat(filePath);
  if (!stats.isFile()) {
    throw new Error('Project file path must be a file.');
  }
  const buffer = await fs.readFile(filePath);
  const truncated = buffer.length > MAX_FILE_BYTES;
  const content = buffer.subarray(0, MAX_FILE_BYTES).toString('utf8');
  return {
    path: normalizeRelativePath(relativePath),
    size: stats.size,
    truncated,
    content: stripNulls(content)
  };
}

async function writeProjectFile(relativePath, body) {
  const filePath = resolveProjectPath(relativePath);
  const stats = await fs.stat(filePath).catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error('Project file does not exist.');
    }
    throw error;
  });
  if (!stats.isFile()) {
    throw new Error('Project file path must be a file.');
  }
  const content = String(body.content ?? '');
  if (Buffer.byteLength(content, 'utf8') > MAX_FILE_BYTES) {
    throw new Error('File content is too large to save from the GUI.');
  }
  await fs.writeFile(filePath, content, 'utf8');
  const nextStats = await fs.stat(filePath);
  return {
    path: normalizeRelativePath(relativePath),
    size: nextStats.size,
    saved: true
  };
}

async function createEditCheckpoint(body = {}) {
  const status = await readGitStatus().catch(() => ({ files: [] }));
  const snapshots = [];
  const seen = new Set();
  for (const file of status.files || []) {
    const relativePath = normalizeGitPath(file.path);
    if (!relativePath || seen.has(relativePath)) {
      continue;
    }
    seen.add(relativePath);
    snapshots.push(await snapshotProjectFile(relativePath));
  }
  const id = `edit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const checkpoint = {
    id,
    messageId: String(body.messageId || ''),
    prompt: String(body.prompt || '').slice(0, 240),
    createdAt: new Date().toISOString(),
    accepted: false,
    snapshots
  };
  editCheckpoints.set(id, checkpoint);
  return buildEditCheckpointResponse(checkpoint, []);
}

async function snapshotProjectFile(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const filePath = resolveProjectPath(normalized);
  const stats = await fs.stat(filePath).catch((error) => {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  });
  if (!stats) {
    return { path: normalized, exists: false, content: '', skipped: false };
  }
  if (!stats.isFile()) {
    return { path: normalized, exists: true, content: '', skipped: true, reason: 'not-file' };
  }
  if (stats.size > MAX_FILE_BYTES) {
    return { path: normalized, exists: true, content: '', skipped: true, reason: 'too-large' };
  }
  return { path: normalized, exists: true, content: await fs.readFile(filePath, 'utf8'), skipped: false };
}

async function getEditCheckpointStatus(checkpointId) {
  const checkpoint = requireEditCheckpoint(checkpointId);
  const changedFiles = await collectCheckpointChangedFiles(checkpoint);
  return buildEditCheckpointResponse(checkpoint, changedFiles);
}

function acceptEditCheckpoint(checkpointId) {
  const checkpoint = requireEditCheckpoint(checkpointId);
  checkpoint.accepted = true;
  checkpoint.acceptedAt = new Date().toISOString();
  return buildEditCheckpointResponse(checkpoint, []);
}

async function restoreEditCheckpoint(checkpointId) {
  const checkpoint = requireEditCheckpoint(checkpointId);
  const changedFiles = await collectCheckpointChangedFiles(checkpoint);
  const restored = [];
  const skipped = [];
  for (const file of changedFiles) {
    const snapshot = getCheckpointSnapshot(checkpoint, file.path);
    if (snapshot && snapshot.skipped) {
      skipped.push({ path: file.path, reason: snapshot.reason || 'snapshot-skipped' });
      continue;
    }
    try {
      if (snapshot) {
        await restoreSnapshotFile(snapshot);
      } else {
        await restorePathToHead(file.path);
      }
      restored.push(file.path);
    } catch (error) {
      skipped.push({ path: file.path, reason: error.message || String(error) });
    }
  }
  checkpoint.restoredAt = new Date().toISOString();
  return { id: checkpoint.id, restored, skipped };
}

async function collectCheckpointChangedFiles(checkpoint) {
  const status = await readGitStatus().catch(() => ({ files: [] }));
  const changedFiles = [];
  for (const file of status.files || []) {
    const relativePath = normalizeGitPath(file.path);
    if (!relativePath) {
      continue;
    }
    const snapshot = getCheckpointSnapshot(checkpoint, relativePath);
    if (snapshot && !snapshot.skipped && await isFileSameAsSnapshot(snapshot)) {
      continue;
    }
    changedFiles.push({
      path: relativePath,
      status: file.status || '',
      stats: snapshot && !snapshot.skipped ? await compareSnapshotStats(snapshot) : file.stats || null,
      trackedAtCheckpoint: Boolean(snapshot)
    });
  }
  return changedFiles;
}

async function isFileSameAsSnapshot(snapshot) {
  const filePath = resolveProjectPath(snapshot.path);
  const stats = await fs.stat(filePath).catch((error) => {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  });
  if (!stats) {
    return !snapshot.exists;
  }
  if (!snapshot.exists || !stats.isFile() || stats.size > MAX_FILE_BYTES) {
    return false;
  }
  return await fs.readFile(filePath, 'utf8') === snapshot.content;
}

async function compareSnapshotStats(snapshot) {
  const filePath = resolveProjectPath(snapshot.path);
  const current = await fs.readFile(filePath, 'utf8').catch(() => '');
  return calculateLineStats(snapshot.exists ? snapshot.content : '', current);
}

async function readEditCheckpointDiff(checkpointId, relativePath) {
  const checkpoint = requireEditCheckpoint(checkpointId);
  const normalized = normalizeRelativePath(relativePath);
  const snapshot = getCheckpointSnapshot(checkpoint, normalized);
  if (!snapshot || snapshot.skipped) {
    throw new Error('This file was not tracked by the edit checkpoint.');
  }
  const current = await fs.readFile(resolveProjectPath(normalized), 'utf8').catch(() => '');
  const before = snapshot.exists ? snapshot.content : '';
  const diff = await createUnifiedDiff(before, current, normalized);
  return { path: normalized, diff, truncated: diff.length >= MAX_DIFF_BYTES };
}

async function createUnifiedDiff(before, after, relativePath) {
  if (before === after) {
    return '';
  }
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pi-agent-gui-diff-'));
  try {
    const beforePath = path.join(tempDir, 'before');
    const afterPath = path.join(tempDir, 'after');
    await fs.writeFile(beforePath, before, 'utf8');
    await fs.writeFile(afterPath, after, 'utf8');
    const output = await runGitNoIndexDiff(beforePath, afterPath);
    return output.includes('diff --git') ? relabelTemporaryDiffPaths(output, beforePath, afterPath, relativePath) : createFallbackUnifiedDiff(before, after, relativePath);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

async function runGitNoIndexDiff(beforePath, afterPath) {
  try {
    const result = await execFileAsync('git', ['diff', '--no-index', '--', beforePath, afterPath], {
      cwd: targetProject,
      windowsHide: true,
      maxBuffer: MAX_DIFF_BYTES
    });
    return result.stdout || '';
  } catch (error) {
    return error.stdout || '';
  }
}

function relabelTemporaryDiffPaths(diff, beforePath, afterPath, relativePath) {
  return String(diff || '')
    .split(path.resolve(beforePath).replace(/\\/g, '/')).join(`a/${relativePath}`)
    .split(path.resolve(afterPath).replace(/\\/g, '/')).join(`b/${relativePath}`)
    .split(beforePath.replace(/\\/g, '/')).join(`a/${relativePath}`)
    .split(afterPath.replace(/\\/g, '/')).join(`b/${relativePath}`);
}

function createFallbackUnifiedDiff(before, after, relativePath) {
  const beforeLines = String(before || '').split('\n');
  const afterLines = String(after || '').split('\n');
  const header = [`diff --git a/${relativePath} b/${relativePath}`, `--- a/${relativePath}`, `+++ b/${relativePath}`, `@@ -1,${beforeLines.length} +1,${afterLines.length} @@`];
  return [...header, ...beforeLines.map((line) => `-${line}`), ...afterLines.map((line) => `+${line}`)].join('\n');
}

function calculateLineStats(before, after) {
  const beforeLines = String(before || '').split('\n');
  const afterLines = String(after || '').split('\n');
  let prefix = 0;
  while (prefix < beforeLines.length && prefix < afterLines.length && beforeLines[prefix] === afterLines[prefix]) {
    prefix += 1;
  }
  let beforeSuffix = beforeLines.length - 1;
  let afterSuffix = afterLines.length - 1;
  while (beforeSuffix >= prefix && afterSuffix >= prefix && beforeLines[beforeSuffix] === afterLines[afterSuffix]) {
    beforeSuffix -= 1;
    afterSuffix -= 1;
  }
  return {
    added: Math.max(0, afterSuffix - prefix + 1),
    removed: Math.max(0, beforeSuffix - prefix + 1)
  };
}

async function restoreSnapshotFile(snapshot) {
  const filePath = resolveProjectPath(snapshot.path);
  if (!snapshot.exists) {
    await fs.rm(filePath, { force: true });
    return;
  }
  await fs.writeFile(filePath, snapshot.content, 'utf8');
}

async function restorePathToHead(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const filePath = resolveProjectPath(normalized);
  const headContent = await runGit(['show', `HEAD:${normalized}`]).catch(() => null);
  if (headContent === null) {
    await fs.rm(filePath, { force: true });
    return;
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, headContent, 'utf8');
}

function getCheckpointSnapshot(checkpoint, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return checkpoint.snapshots.find((snapshot) => snapshot.path === normalized) || null;
}

function requireEditCheckpoint(checkpointId) {
  const checkpoint = editCheckpoints.get(String(checkpointId || ''));
  if (!checkpoint) {
    throw new Error('Edit checkpoint was not found in this GUI session.');
  }
  return checkpoint;
}

function buildEditCheckpointResponse(checkpoint, changedFiles) {
  return {
    id: checkpoint.id,
    messageId: checkpoint.messageId,
    createdAt: checkpoint.createdAt,
    accepted: Boolean(checkpoint.accepted),
    files: changedFiles,
    snapshotCount: checkpoint.snapshots.length
  };
}

async function searchProject(query, scope) {
  const normalizedQuery = String(query || '').trim();
  const normalizedScope = ['all', 'name', 'content'].includes(scope) ? scope : 'all';
  if (normalizedQuery.length < 2) {
    return { root: targetProject, query: normalizedQuery, scope: normalizedScope, results: [], truncated: false };
  }
  const lowerQuery = normalizedQuery.toLowerCase();
  const results = [];
  const state = { truncated: false };
  await searchDirectory(targetProject, '', lowerQuery, normalizedScope, results, state);
  return { root: targetProject, query: normalizedQuery, scope: normalizedScope, results, truncated: state.truncated };
}

async function searchDirectory(absolutePath, relativePath, lowerQuery, scope, results, state) {
  if (results.length >= MAX_SEARCH_RESULTS) {
    state.truncated = true;
    return;
  }
  const entries = (await fs.readdir(absolutePath, { withFileTypes: true })).sort((left, right) => left.name.localeCompare(right.name));
  for (const entry of entries) {
    if (results.length >= MAX_SEARCH_RESULTS) {
      state.truncated = true;
      return;
    }
    if (ignoredTreeNames.has(entry.name)) {
      continue;
    }
    const childRelativePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
    const childAbsolutePath = path.join(absolutePath, entry.name);
    const nameMatches = childRelativePath.toLowerCase().includes(lowerQuery);
    if (entry.isDirectory()) {
      if (nameMatches && scope !== 'content') {
        results.push({ path: childRelativePath, type: 'directory', line: null, preview: childRelativePath, isDirectory: true });
        if (results.length >= MAX_SEARCH_RESULTS) {
          state.truncated = true;
          return;
        }
      }
      await searchDirectory(childAbsolutePath, childRelativePath, lowerQuery, scope, results, state);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    await searchFile(childAbsolutePath, childRelativePath, lowerQuery, scope, results);
  }
}

async function searchFile(absolutePath, relativePath, lowerQuery, scope, results) {
  const nameMatches = relativePath.toLowerCase().includes(lowerQuery);
  if (scope === 'name') {
    if (nameMatches) {
      results.push({ path: relativePath, type: 'file', line: null, preview: relativePath });
    }
    return;
  }
  const stats = await fs.stat(absolutePath);
  if (stats.size > MAX_SEARCH_FILE_BYTES) {
    if (nameMatches && scope === 'all') {
      results.push({ path: relativePath, type: 'file', line: null, preview: relativePath });
    }
    return;
  }
  const buffer = await fs.readFile(absolutePath);
  if (buffer.includes(0)) {
    if (nameMatches && scope === 'all') {
      results.push({ path: relativePath, type: 'file', line: null, preview: relativePath });
    }
    return;
  }
  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/);
  let matchedContent = false;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].toLowerCase().includes(lowerQuery)) {
      results.push({ path: relativePath, type: 'content', line: index + 1, preview: createSearchPreviewSnippet(lines[index], lowerQuery) });
      matchedContent = true;
      break;
    }
  }
  if (scope === 'all' && nameMatches && !matchedContent) {
    results.push({ path: relativePath, type: 'file', line: null, preview: relativePath });
  }
}

function createSearchPreviewSnippet(text, lowerQuery) {
  const value = String(text || '').trim();
  if (!value || !lowerQuery) {
    return value.slice(0, 180);
  }
  const found = value.toLowerCase().indexOf(lowerQuery);
  if (found === -1) {
    return value.slice(0, 180);
  }
  const beforeContext = 18;
  const afterContext = 78;
  const start = Math.max(0, found - beforeContext);
  const end = Math.min(value.length, found + lowerQuery.length + afterContext);
  return `${start > 0 ? '...' : ''}${value.slice(start, end)}${end < value.length ? '...' : ''}`;
}

async function readGitStatus() {
  const output = await runGit(['status', '--short']);
  const stats = await readGitNumstat();
  const files = output.split('\n').filter(Boolean).map((line) => ({
    status: line.slice(0, 2).trim() || line.slice(0, 2),
    path: line.slice(3).trim(),
    stats: stats.get(normalizeGitPath(line.slice(3).trim())) || null
  }));
  return { root: targetProject, files };
}

async function readGitNumstat() {
  const stats = new Map();
  const outputs = await Promise.all([
    runGit(['diff', '--numstat']).catch(() => ''),
    runGit(['diff', '--cached', '--numstat']).catch(() => '')
  ]);
  for (const output of outputs) {
    for (const line of output.split('\n').filter(Boolean)) {
      const [addedRaw, removedRaw, ...pathParts] = line.split('\t');
      const filePath = normalizeGitPath(pathParts.join('\t'));
      if (!filePath) {
        continue;
      }
      const current = stats.get(filePath) || { added: 0, removed: 0 };
      current.added += parseNumstatValue(addedRaw);
      current.removed += parseNumstatValue(removedRaw);
      stats.set(filePath, current);
    }
  }
  return stats;
}

function parseNumstatValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeGitPath(filePath) {
  return String(filePath || '').replace(/\\/g, '/').split(' -> ').pop();
}

async function readGitDiff(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const unstaged = await runGit(['diff', '--', normalized], MAX_DIFF_BYTES);
  const staged = await runGit(['diff', '--cached', '--', normalized], MAX_DIFF_BYTES);
  const output = combineGitDiff(staged, unstaged);
  return { path: normalized, diff: output, truncated: output.length >= MAX_DIFF_BYTES };
}

function combineGitDiff(staged, unstaged) {
  if (staged && unstaged) {
    return `# Staged changes\n${staged}\n# Unstaged changes\n${unstaged}`;
  }
  return unstaged || staged || '';
}

async function runGit(args, maxBuffer = 256 * 1024) {
  try {
    const result = await execFileAsync('git', args, {
      cwd: targetProject,
      windowsHide: true,
      maxBuffer
    });
    return result.stdout || '';
  } catch (error) {
    throw new Error(error.stderr || error.message || 'Git command failed.');
  }
}

function resolveProjectPath(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const resolved = path.resolve(targetProject, normalized);
  const relative = path.relative(targetProject, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Path is outside the target project.');
  }
  return resolved;
}

function normalizeRelativePath(relativePath) {
  return String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function stripNulls(text) {
  return text.includes('\u0000') ? '[Binary file preview is not available.]' : text;
}

async function sendStatic(response, fileName, contentType) {
  const filePath = path.join(mediaDir, fileName);
  try {
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store'
    });
    response.end(content);
  } catch (error) {
    sendJson(response, 404, { error: 'Static file not found.' });
  }
}

function openEventStream(response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive'
  });
  response.write('\n');
  clients.add(response);
  for (const event of recentEvents.slice(-20)) {
    writeEvent(response, event.type, event.payload);
  }
  requestClose(response, () => clients.delete(response));
}

function requestClose(response, callback) {
  response.on('close', callback);
}

function broadcast(type, payload) {
  recentEvents.push({ type, payload });
  if (recentEvents.length > 100) {
    recentEvents.shift();
  }
  for (const client of clients) {
    writeEvent(client, type, payload);
  }
}

function broadcastTerminalOutput(entry = {}) {
  const stream = ['stderr', 'stdout', 'trace'].includes(entry.stream) ? entry.stream : 'stdout';
  const payload = {
    timestamp: new Date().toISOString(),
    stream,
    text: String(entry.text || '')
  };
  terminalOutput.push(payload);
  if (terminalOutput.length > MAX_TERMINAL_OUTPUT) {
    terminalOutput.splice(0, terminalOutput.length - MAX_TERMINAL_OUTPUT);
  }
  broadcast('runtime:terminal', payload);
}

function broadcastRuntimeTrace(phase, text) {
  broadcastTerminalOutput({ stream: 'trace', text: `[${phase}] ${text}` });
}

function formatRuntimeTraceEvent(event = {}) {
  const type = String(event.type || 'event');
  if (type === 'message_update') {
    return '';
  }
  const parts = [event.type || 'event'];
  if (event.command) {
    parts.push(`command=${event.command}`);
  }
  if (event.toolName) {
    parts.push(`tool=${event.toolName}`);
  }
  if (event.id) {
    parts.push(`id=${event.id}`);
  }
  if (event.success === false) {
    parts.push('failed');
  }
  return parts.join(' ');
}

function writeEvent(response, type, payload) {
  response.write(`event: ${type}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error('Request body is too large.');
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  return text ? JSON.parse(text) : {};
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(data));
}

async function shutdown() {
  if (pi) {
    await pi.stop().catch(() => {});
  }
  server.close(() => process.exit(0));
}
