const fs = require('fs/promises');
const http = require('http');
const path = require('path');
const vscode = require('vscode');
const { isAuthorized } = require('./auth');
const { clearCustomEndpointKey, describeLmError, findCustomEndpointModel, listModels, sendChat, setCustomEndpointKey } = require('./lm');
const extensionPackage = require('../package.json');

const MAX_BODY_BYTES = 128 * 1024;

class MobileChatServer {
  constructor({ extensionUri, sessionStore, accessToken, requireToken, secrets }) {
    this.extensionUri = extensionUri;
    this.mediaDir = path.join(extensionUri.fsPath, 'media');
    this.sessionStore = sessionStore;
    this.accessToken = accessToken;
    this.requireToken = requireToken;
    this.secrets = secrets;
    this.server = null;
    this.host = '';
    this.port = 0;
    this.clients = new Set();
    this.activeRequests = new Map();
  }

  async start(host, port) {
    if (this.server) {
      return this.url;
    }

    this.host = host;
    this.port = port;
    this.server = http.createServer((request, response) => {
      this.route(request, response).catch((error) => {
        this.sendJson(response, 500, { error: error.message || String(error) });
      });
    });

    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(port, host, () => {
        this.server.off('error', reject);
        resolve();
      });
    });

    return this.url;
  }

  async stop() {
    for (const source of this.activeRequests.values()) {
      source.cancel();
    }
    this.activeRequests.clear();

    for (const client of this.clients) {
      client.end();
    }
    this.clients.clear();

    if (!this.server) {
      return;
    }
    await new Promise((resolve) => this.server.close(resolve));
    this.server = null;
  }

  get url() {
    const baseUrl = `http://${this.host}:${this.port}/`;
    if (!this.requireToken) {
      return baseUrl;
    }
    return `${baseUrl}?token=${encodeURIComponent(this.accessToken)}`;
  }

  async route(request, response) {
    const requestUrl = new URL(request.url || '/', `http://${this.host}:${this.port}`);

    if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname === '/events') {
      if (!isAuthorized(request.url || '/', request.headers, this.accessToken, this.requireToken)) {
        this.sendJson(response, 401, { error: 'Unauthorized mobile chat request.' });
        return;
      }
    }

    if (request.method === 'GET' && requestUrl.pathname === '/') {
      await this.sendStatic(response, 'index.html', 'text/html; charset=utf-8');
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/app.js') {
      await this.sendStatic(response, 'app.js', 'text/javascript; charset=utf-8');
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/style.css') {
      await this.sendStatic(response, 'style.css', 'text/css; charset=utf-8');
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/events') {
      this.openEventStream(response);
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/models') {
      this.sendJson(response, 200, { models: await listModels(this.secrets) });
      return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/custom-endpoint-key') {
      await this.handleSetCustomEndpointKey(request, response);
      return;
    }
    if (request.method === 'DELETE' && requestUrl.pathname === '/api/custom-endpoint-key') {
      await this.handleClearCustomEndpointKey(request, response);
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/runtime') {
      this.sendJson(response, 200, {
        extensionId: `${extensionPackage.publisher}.${extensionPackage.name}`,
        version: extensionPackage.version,
        extensionPath: this.extensionUri.fsPath,
        host: this.host,
        port: this.port
      });
      return;
    }
    if (request.method === 'GET' && requestUrl.pathname === '/api/sessions') {
      this.sendJson(response, 200, { sessions: await this.sessionStore.listSessions() });
      return;
    }
    if (request.method === 'POST' && requestUrl.pathname === '/api/sessions') {
      const body = await this.readJson(request);
      const session = await this.sessionStore.createSession(body.title);
      this.broadcast('sessions:changed', { sessionId: session.id });
      this.sendJson(response, 201, { session });
      return;
    }

    const messageMatch = requestUrl.pathname.match(/^\/api\/sessions\/([^/]+)\/messages$/);
    if (messageMatch && request.method === 'GET') {
      const messages = await this.sessionStore.getMessages(messageMatch[1]);
      if (!messages) {
        this.sendJson(response, 404, { error: 'Session not found.' });
        return;
      }
      this.sendJson(response, 200, { messages });
      return;
    }
    if (messageMatch && request.method === 'POST') {
      await this.handleSendMessage(messageMatch[1], request, response);
      return;
    }

    const deleteMatch = requestUrl.pathname.match(/^\/api\/sessions\/([^/]+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      const deleted = await this.sessionStore.deleteSession(deleteMatch[1]);
      this.broadcast('sessions:changed', { sessionId: deleteMatch[1] });
      this.sendJson(response, deleted ? 200 : 404, { deleted });
      return;
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/workspace/status') {
      this.sendJson(response, 200, getWorkspaceStatus());
      return;
    }

    this.sendJson(response, 404, { error: 'Not found.' });
  }

  async handleSendMessage(sessionId, request, response) {
    const body = await this.readJson(request);
    const prompt = String(body.content || '').trim();
    const modelId = String(body.modelId || '');
    if (!prompt) {
      this.sendJson(response, 400, { error: 'Message content is required.' });
      return;
    }

    const session = await this.sessionStore.getSession(sessionId);
    if (!session) {
      this.sendJson(response, 404, { error: 'Session not found.' });
      return;
    }

    const userMessage = await this.sessionStore.appendMessage(sessionId, {
      role: 'user',
      content: prompt,
      modelId
    });
    const assistantMessage = await this.sessionStore.appendMessage(sessionId, {
      role: 'assistant',
      content: '',
      modelId
    });

    this.sendJson(response, 202, {
      userMessage,
      assistantMessage
    });
    this.broadcast('message:created', { sessionId, message: userMessage });
    this.broadcast('message:created', { sessionId, message: assistantMessage });

    const source = new vscode.CancellationTokenSource();
    this.activeRequests.set(assistantMessage.id, source);

    try {
      const result = await sendChat({
        session,
        modelId,
        secrets: this.secrets,
        prompt,
        token: source.token,
        onText: (chunk, content) => {
          this.broadcast('message:delta', {
            sessionId,
            messageId: assistantMessage.id,
            chunk,
            content
          });
        }
      });
      const saved = await this.sessionStore.updateAssistantMessage(sessionId, assistantMessage.id, result.content);
      this.broadcast('message:done', { sessionId, message: saved, modelId: result.modelId });
      this.broadcast('sessions:changed', { sessionId });
    } catch (error) {
      const message = describeLmError(error);
      await this.sessionStore.updateAssistantMessage(sessionId, assistantMessage.id, message);
      this.broadcast('message:error', { sessionId, messageId: assistantMessage.id, error: message });
    } finally {
      this.activeRequests.delete(assistantMessage.id);
      source.dispose();
    }
  }

  async handleSetCustomEndpointKey(request, response) {
    const body = await this.readJson(request);
    const modelId = String(body.modelId || '').trim();
    const apiKey = String(body.apiKey || '').trim();
    if (!modelId || !apiKey) {
      this.sendJson(response, 400, { error: 'Model id and API key are required.' });
      return;
    }

    const model = await findCustomEndpointModel(modelId);
    if (!model) {
      this.sendJson(response, 404, { error: 'Custom endpoint model not found.' });
      return;
    }

    await setCustomEndpointKey(this.secrets, model, apiKey);
    this.sendJson(response, 200, { modelId: model.id, hasMobileApiKey: true, canSendDirectly: true });
  }

  async handleClearCustomEndpointKey(request, response) {
    const body = await this.readJson(request);
    const modelId = String(body.modelId || '').trim();
    if (!modelId) {
      this.sendJson(response, 400, { error: 'Model id is required.' });
      return;
    }

    const model = await findCustomEndpointModel(modelId);
    if (!model) {
      this.sendJson(response, 404, { error: 'Custom endpoint model not found.' });
      return;
    }

    await clearCustomEndpointKey(this.secrets, model);
    this.sendJson(response, 200, { modelId: model.id, hasMobileApiKey: false });
  }

  async readJson(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        throw new Error('Request body is too large.');
      }
      chunks.push(chunk);
    }
    if (!chunks.length) {
      return {};
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  openEventStream(response) {
    response.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    response.write('\n');
    this.clients.add(response);
    response.on('close', () => this.clients.delete(response));
  }

  broadcast(type, payload) {
    const data = JSON.stringify({ type, payload });
    for (const client of this.clients) {
      client.write(`event: ${type}\n`);
      client.write(`data: ${data}\n\n`);
    }
  }

  async sendStatic(response, fileName, contentType) {
    const filePath = path.join(this.mediaDir, fileName);
    const content = await fs.readFile(filePath);
    response.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; connect-src 'self'; script-src 'self'; style-src 'self'; base-uri 'none'; frame-ancestors 'none'"
    });
    response.end(content);
  }

  sendJson(response, statusCode, payload) {
    response.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    response.end(JSON.stringify(payload));
  }
}

function getWorkspaceStatus() {
  const folders = vscode.workspace.workspaceFolders || [];
  const diagnostics = vscode.languages.getDiagnostics();
  const problemCount = diagnostics.reduce((total, [, items]) => total + items.length, 0);
  return {
    workspaceFolders: folders.map((folder) => folder.name),
    activeFile: vscode.window.activeTextEditor ? vscode.workspace.asRelativePath(vscode.window.activeTextEditor.document.uri) : '',
    diagnostics: problemCount
  };
}

module.exports = {
  MobileChatServer
};
