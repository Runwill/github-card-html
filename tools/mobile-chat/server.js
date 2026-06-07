const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const OPENCODE_HOST = '127.0.0.1:4096';
const OPENCODE_AUTH = 'Basic ' + Buffer.from('opencode:demo123').toString('base64');

const MSG_LIMIT = 80; // 超过此消息数则新建会话，避免上下文过长超时

let currentSessionId = null;
let defaultModel = null;

// 自动生成标题模式（agent 测试时创建的会话，不作为默认会话）
const AUTO_TITLE = /^(Mobile Chat|Test Chat|Quick|Quick Test|Test|Mobile Chat Test|Mobile Test|New session)/;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 获取可用模型列表（从桌面版配置中读取）
  if (req.url === '/api/models' && req.method === 'GET') {
    try {
      const providerData = await fetchFromOpenCode('/provider');
      const models = [];
      const connected = providerData.connected || [];
      const all = providerData.all || [];

      for (const p of all) {
        if (!connected.includes(p.id)) continue;
        const modelIds = p.models ? Object.keys(p.models) : [];
        for (const mId of modelIds) {
          const m = p.models[mId];
          models.push({
            id: p.id + '/' + mId,
            providerID: p.id,
            modelID: mId,
            name: m.name || mId,
            provider: new RegExp('token', 'i').test(p.id) ? 'Bailian' : (p.name || p.id)
          });
        }
      }

      // 用已启用提供商的默认模型
      const defaults = providerData.default || {};
      const defaultProvider = connected.find(c => defaults[c]);
      if (defaultProvider && defaults[defaultProvider]) {
        const defModelId = defaults[defaultProvider];
        defaultModel = { providerID: defaultProvider, modelID: defModelId };
      } else if (models.length > 0) {
        defaultModel = { providerID: models[0].providerID, modelID: models[0].modelID };
      }

      models.sort((a, b) => {
        if (a.provider !== b.provider) return a.provider.localeCompare(b.provider);
        return a.name.localeCompare(b.name);
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models, defaultModel }));
    } catch (error) {
      console.error('Models error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch models' }));
    }
    return;
  }

  // 获取或复用会话（默认打开最新的非自动标题会话）
  if (req.url === '/api/session' && req.method === 'GET') {
    try {
      const sessions = await fetchFromOpenCode('/session');
      const mainSessions = sessions.filter(s => !s.parentID);

      // 优先选最新的用户会话（非自动标题）
      const userSessions = mainSessions
        .filter(s => !AUTO_TITLE.test(s.title || s.slug || ''))
        .sort((a, b) => (b.time?.created || 0) - (a.time?.created || 0));

      if (userSessions.length > 0) {
        const latest = userSessions[0];
        const msgs = await fetchFromOpenCode(`/session/${latest.id}/message`);
        if (msgs.length <= MSG_LIMIT) {
          currentSessionId = latest.id;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sessionId: currentSessionId }));
          return;
        }
      }

      // 回退到最新任意会话
      const sorted = mainSessions.sort((a, b) => (b.time?.created || 0) - (a.time?.created || 0));
      if (sorted.length > 0) {
        currentSessionId = sorted[0].id;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId: currentSessionId }));
        return;
      }

      // 无会话则新建
      const newSession = await postToOpenCode('/session', { title: 'Mobile Chat' });
      currentSessionId = newSession.id;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ sessionId: currentSessionId }));
    } catch (error) {
      console.error('Session error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to create session' }));
    }
    return;
  }

  // 获取所有会话列表（过滤子会话和自动生成的测试会话）
  if (req.url === '/api/sessions' && req.method === 'GET') {
    try {
      const sessions = await fetchFromOpenCode('/session');
      const mainSessions = sessions.filter(s => !s.parentID);

      // 过滤：保留用户手动创建的会话（排除 agent 会话和自动标题）
      const userSessions = mainSessions.filter(s => {
        const title = s.title || s.slug || '';
        const sum = s.summary || {};
        const changes = (sum.additions || 0) + (sum.deletions || 0) + (sum.files || 0);
        if (AUTO_TITLE.test(title) && changes === 0) return false;
        return true;
      });

      userSessions.sort((a, b) => (b.time?.created || 0) - (a.time?.created || 0));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(userSessions.slice(0, 30)));
    } catch (error) {
      console.error('Sessions list error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch sessions' }));
    }
    return;
  }

  // 删除会话
  if (req.url.startsWith('/api/sessions/') && req.method === 'DELETE') {
    const sessionId = req.url.split('/api/sessions/')[1];
    if (!sessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing session ID' }));
      return;
    }
    try {
      await deleteFromOpenCode('/session/' + sessionId);
      if (currentSessionId === sessionId) {
        currentSessionId = null;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (error) {
      console.error('Delete session error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to delete session' }));
    }
    return;
  }

  // 切换会话
  if (req.url.startsWith('/api/switch-session/') && req.method === 'POST') {
    const sessionId = req.url.split('/api/switch-session/')[1];
    currentSessionId = sessionId;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ sessionId: currentSessionId }));
    return;
  }

  // 创建新会话
  if (req.url === '/api/new-session' && req.method === 'POST') {
    try {
      const newSession = await postToOpenCode('/session', { title: 'Mobile Chat' });
      currentSessionId = newSession.id;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newSession));
    } catch (error) {
      console.error('New session error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to create session' }));
    }
    return;
  }

  // 获取会话历史
  if (req.url.startsWith('/api/history') && req.method === 'GET') {
    if (!currentSessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No active session' }));
      return;
    }

    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const offset = parseInt(url.searchParams.get('offset')) || 0;

      const allMessages = await fetchFromOpenCode(`/session/${currentSessionId}/message`);
      const total = allMessages.length;

      const startIdx = Math.max(0, total - offset - limit);
      const endIdx = total - offset;
      const messages = allMessages.slice(startIdx, endIdx);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        messages,
        total,
        offset,
        limit,
        hasMore: startIdx > 0
      }));
    } catch (error) {
      console.error('History error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch history' }));
    }
    return;
  }

  // 发送聊天消息（使用真实 opencode API）
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.setTimeout(290000);

    req.on('end', async () => {
      try {
        const { message, modelId } = JSON.parse(body);

        if (!currentSessionId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No active session' }));
          return;
        }

        let model = defaultModel;
        if (modelId && modelId.includes('/')) {
          const [providerID, modelID] = modelId.split('/');
          model = { providerID, modelID };
        }

        const requestBody = {
          parts: [{ type: 'text', text: message }]
        };
        if (model) requestBody.model = model;

        const response = await postToOpenCode(`/session/${currentSessionId}/message`, requestBody);
        const reply = extractReply(response);

        if (reply === null) {
          // AI 回复可能在其他 parts 中，返回完整响应调试
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply: '', raw: response }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ reply }));
        }
      } catch (error) {
        console.error('Chat error:', error);
        try {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Failed: ' + error.message }));
        } catch (_) { /* client already disconnected */ }
      }
    });
    return;
  }

  // 提供静态文件
  if (req.url === '/' || req.url === '/index.html') {
    const htmlPath = path.join(__dirname, 'index.html');
    fs.readFile(htmlPath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading HTML');
        return;
      }
      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(data);
    });
    return;
  }

  // Git 状态
  if (req.url === '/api/git-status' && req.method === 'GET') {
    try {
      const status = await fetchFromOpenCode('/file/status');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(Array.isArray(status) ? status : []));
    } catch (error) {
      console.error('Git status error:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    }
    return;
  }

  // Git 分支
  if (req.url === '/api/git-branch' && req.method === 'GET') {
    try {
      const vcs = await fetchFromOpenCode('/vcs');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(vcs));
    } catch (error) {
      console.error('Git branch error:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    }
    return;
  }

  // 会话 diff
  if (req.url.startsWith('/api/session-diff/') && req.method === 'GET') {
    const sid = req.url.split('/api/session-diff/')[1];
    try {
      const diff = await fetchFromOpenCode(`/session/${sid}/diff`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(Array.isArray(diff) ? diff : []));
    } catch (error) {
      console.error('Session diff error:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify([]));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// OpenCode API 辅助函数
function fetchFromOpenCode(apiPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: OPENCODE_HOST.split(':')[0],
      port: OPENCODE_HOST.split(':')[1],
      path: apiPath,
      method: 'GET',
      headers: {
        'Authorization': OPENCODE_AUTH,
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function postToOpenCode(apiPath, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: OPENCODE_HOST.split(':')[0],
      port: OPENCODE_HOST.split(':')[1],
      path: apiPath,
      method: 'POST',
      headers: {
        'Authorization': OPENCODE_AUTH,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 300000
    };

    const req = http.request(options, (res) => {
      res.setEncoding('utf8');
      let data = '';
      res.on('data', chunk => data += chunk);

      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse response: ' + data.substring(0, 100)));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('OpenCode API timeout'));
    });

    req.on('error', (e) => {
      reject(new Error('OpenCode API error: ' + e.message));
    });

    req.write(postData);
    req.end();
  });
}

function extractReply(response) {
  if (response && response.parts && Array.isArray(response.parts)) {
    const textParts = response.parts.filter(p => p.type === 'text' && p.text);
    if (textParts.length > 0) {
      return textParts.map(p => p.text).join('\n');
    }
  }
  return null;
}

function deleteFromOpenCode(apiPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: OPENCODE_HOST.split(':')[0],
      port: OPENCODE_HOST.split(':')[1],
      path: apiPath,
      method: 'DELETE',
      headers: {
        'Authorization': OPENCODE_AUTH,
        'Accept': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(true);
        } else {
          reject(new Error('Delete failed: ' + res.statusCode));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nMobile Chat Server running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://100.95.190.86:${PORT}`);
  console.log(`\nOpen on your phone to start chatting!\n`);
});
