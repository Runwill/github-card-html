const fs = require('fs/promises');
const http = require('http');
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
const ignoredTreeNames = new Set(['.git', 'node_modules', '.venv', 'env', 'dist', 'build', 'coverage', '.vite']);
const rootDir = path.resolve(__dirname, '..');
const mediaDir = path.join(rootDir, 'media');
const defaultTarget = path.resolve(rootDir, '..', '..');
const host = process.env.PI_AGENT_GUI_HOST || '127.0.0.1';
const port = Number(process.env.PI_AGENT_GUI_PORT || 3002);
const targetProject = path.resolve(process.env.PI_AGENT_GUI_TARGET || defaultTarget);
const piCommand = process.env.PI_AGENT_GUI_PI_COMMAND || 'pi';
const approve = process.env.PI_AGENT_GUI_APPROVE === '1';
const tools = process.env.PI_AGENT_GUI_TOOLS || '';
const configDir = path.resolve(process.env.PI_CODING_AGENT_DIR || path.join(process.env.USERPROFILE || process.env.HOME || '', '.pi', 'agent'));
const modelsConfigPath = path.join(configDir, 'models.json');

const clients = new Set();
let pi = null;
const recentEvents = [];

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    sendJson(response, 500, { error: error.message || String(error) });
  });
});

server.listen(port, host, () => {
  console.log(`Pi Agent GUI listening at http://${host}:${port}/`);
  console.log(`Target project: ${targetProject}`);
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
      pi.stop();
    }
    sendJson(response, 202, getRuntime());
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/state') {
    const result = await requireRuntime().request({ type: 'get_state' });
    sendJson(response, 200, result.data || {});
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/messages') {
    const result = await requireRuntime().request({ type: 'get_messages' });
    sendJson(response, 200, result.data || { messages: [] });
    return;
  }
  if (request.method === 'GET' && requestUrl.pathname === '/api/models') {
    const result = await requireRuntime().request({ type: 'get_available_models' });
    sendJson(response, 200, result.data || { models: [] });
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
  if (request.method === 'GET' && requestUrl.pathname === '/api/project/search') {
    sendJson(response, 200, await searchProject(requestUrl.searchParams.get('q') || ''));
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

async function startRuntime() {
  if (pi && pi.isRunning) {
    return;
  }
  const hasPi = await checkCommand(piCommand);
  if (!hasPi) {
    throw new Error('Pi command was not found in PATH. Install it with: npm install -g --ignore-scripts @earendil-works/pi-coding-agent');
  }
  pi = new PiRpcClient({
    command: piCommand,
    cwd: targetProject,
    name: path.basename(targetProject) || 'pi-agent-gui',
    approve,
    tools
  });
  pi.on('rpc-event', (event) => broadcast('pi:event', event));
  pi.on('status', (status) => broadcast('runtime:status', status));
  pi.on('error-event', (event) => broadcast('runtime:error', event));
  pi.start();
  try {
    await waitForRuntimeReady(pi);
  } catch (error) {
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
  const result = await requireRuntime().request(command);
  sendJson(response, 202, result);
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
    pi: pi ? pi.status() : { running: false, command: piCommand, cwd: targetProject }
  };
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
  if (!apiKey) {
    throw new Error('apiKey is required. Use an environment reference like $OPENAI_API_KEY if you do not want to store the literal key.');
  }

  const config = await readModelConfig();
  const providers = { ...config.providers };
  const previousProvider = providers[providerId] && typeof providers[providerId] === 'object' ? providers[providerId] : {};
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
    apiKey,
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

async function searchProject(query) {
  const normalizedQuery = String(query || '').trim();
  if (normalizedQuery.length < 2) {
    return { root: targetProject, query: normalizedQuery, results: [], truncated: false };
  }
  const lowerQuery = normalizedQuery.toLowerCase();
  const results = [];
  const state = { truncated: false };
  await searchDirectory(targetProject, '', lowerQuery, results, state);
  return { root: targetProject, query: normalizedQuery, results, truncated: state.truncated };
}

async function searchDirectory(absolutePath, relativePath, lowerQuery, results, state) {
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
    if (entry.isDirectory()) {
      await searchDirectory(childAbsolutePath, childRelativePath, lowerQuery, results, state);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    await searchFile(childAbsolutePath, childRelativePath, lowerQuery, results);
  }
}

async function searchFile(absolutePath, relativePath, lowerQuery, results) {
  const nameMatches = relativePath.toLowerCase().includes(lowerQuery);
  const stats = await fs.stat(absolutePath);
  if (stats.size > MAX_SEARCH_FILE_BYTES) {
    if (nameMatches) {
      results.push({ path: relativePath, type: 'name', line: null, preview: relativePath });
    }
    return;
  }
  const buffer = await fs.readFile(absolutePath);
  if (buffer.includes(0)) {
    if (nameMatches) {
      results.push({ path: relativePath, type: 'name', line: null, preview: relativePath });
    }
    return;
  }
  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/);
  let matchedContent = false;
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].toLowerCase().includes(lowerQuery)) {
      results.push({ path: relativePath, type: 'content', line: index + 1, preview: lines[index].trim().slice(0, 180) });
      matchedContent = true;
      break;
    }
  }
  if (nameMatches && !matchedContent) {
    results.push({ path: relativePath, type: 'name', line: null, preview: relativePath });
  }
}

async function readGitStatus() {
  const output = await runGit(['status', '--short']);
  const files = output.split('\n').filter(Boolean).map((line) => ({
    status: line.slice(0, 2).trim() || line.slice(0, 2),
    path: line.slice(3).trim()
  }));
  return { root: targetProject, files };
}

async function readGitDiff(relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  const args = ['diff', '--', normalized];
  const output = await runGit(args, MAX_DIFF_BYTES);
  return { path: normalized, diff: output, truncated: output.length >= MAX_DIFF_BYTES };
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

function shutdown() {
  if (pi) {
    pi.stop();
  }
  server.close(() => process.exit(0));
}
