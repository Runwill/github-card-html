const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3001;
const OPENCODE_HOST = '127.0.0.1:3000';
const OPENCODE_AUTH = 'Basic ' + Buffer.from('opencode:demo123').toString('base64');

// 简单的内存存储会话
let currentSessionId = null;

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 获取或创建会话
  if (req.url === '/api/session' && req.method === 'GET') {
    try {
      const sessions = await fetchFromOpenCode('/session');
      const mainSessions = sessions.filter(s => !s.parentID);
      
      if (mainSessions.length > 0) {
        currentSessionId = mainSessions[0].id;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId: currentSessionId }));
      } else {
        const newSession = await postToOpenCode('/session', { title: 'Mobile Chat' });
        currentSessionId = newSession.id;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessionId: currentSessionId }));
      }
    } catch (error) {
      console.error('Session error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to create session' }));
    }
    return;
  }

  // 获取所有会话列表（只返回主会话，过滤掉 subagent 子会话）
  if (req.url === '/api/sessions' && req.method === 'GET') {
    try {
      const sessions = await fetchFromOpenCode('/session');
      const mainSessions = sessions.filter(s => !s.parentID);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mainSessions));
    } catch (error) {
      console.error('Sessions list error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch sessions' }));
    }
    return;
  }

  // 切换到指定会话
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
  if (req.url === '/api/history' && req.method === 'GET') {
    if (!currentSessionId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No active session' }));
      return;
    }

    try {
      const messages = await fetchFromOpenCode(`/session/${currentSessionId}/message`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(messages));
    } catch (error) {
      console.error('History error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Failed to fetch history' }));
    }
    return;
  }

  // 处理 API 请求
  if (req.url === '/api/chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body);
        
        if (!currentSessionId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No active session' }));
          return;
        }

        // 发送消息到 OpenCode API（同步等待回复）
        const response = await postToOpenCode(`/session/${currentSessionId}/message`, {
          parts: [{ type: 'text', text: message }]
        });

        // 提取 AI 回复文本
        const reply = extractReply(response);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ reply }));
      } catch (error) {
        console.error('Chat error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to get response' }));
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end('Not found');
});

// 模拟 AI 回复函数
// TODO: 替换为真实的 LLM API 调用
async function getAIResponse(message) {
  // 这里应该调用 opencode 或 OpenAI API
  // 现在只是模拟回复
  
  const responses = {
    '检查项目状态': '项目 card-html 当前状态：\n\n✅ 所有服务运行正常\n✅ 最近一次提交：修复入场动画系统\n✅ 无未提交的更改\n\n需要我帮你做什么吗？',
    '有什么需要优化的？': '基于最近的代码审查，我发现几个可以优化的地方：\n\n1. **CSS 变量重复定义** - 可以提取到公共文件\n2. **入场动画系统** - 某些边缘情况还需要处理\n3. **移动端适配** - 部分页面在横屏模式下有布局问题\n\n你想从哪个开始？',
    '显示最近的修改': '最近 5 次提交：\n\n```\na1b2c3d 修复入场动画系统\n  - 统一动画触发机制\n  - 修复对局页和草稿页\n\ne4f5g6h 搜索框样式修复\n  - 恢复原始视觉效果\n  - 优化多主题支持\n\ni7j8k9l 按钮激活态修复\n  - 修复优先级问题\n  - 统一样式处理\n```',
    '更新公告': '已生成更新公告草稿：\n\n**修复：**\n- 入场动画系统在多个页面现在正常工作\n- 搜索框在所有主题下保持正确的视觉效果\n- 按钮激活状态在深色和优雅主题下更明显\n\n**优化：**\n- 统一了动画触发机制\n- 简化了样式优先级处理\n\n需要我发布这个公告吗？'
  };

  // 检查是否是快速操作
  if (responses[message]) {
    await new Promise(resolve => setTimeout(resolve, 800)); // 模拟延迟
    return responses[message];
  }

  // 通用回复
  await new Promise(resolve => setTimeout(resolve, 1000));
  return `收到你的消息："${message}"\n\n这是一个模拟回复。要启用真实的 AI 功能，需要配置 LLM API。\n\n你可以：\n1. 配置 OpenAI API key\n2. 使用 opencode 的 API\n3. 集成其他 LLM 服务\n\n需要我帮你配置吗？`;
}

// OpenCode API 辅助函数
function fetchFromOpenCode(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: OPENCODE_HOST.split(':')[0],
      port: OPENCODE_HOST.split(':')[1],
      path: path,
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

function postToOpenCode(path, body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: OPENCODE_HOST.split(':')[0],
      port: OPENCODE_HOST.split(':')[1],
      path: path,
      method: 'POST',
      headers: {
        'Authorization': OPENCODE_AUTH,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
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
    req.write(postData);
    req.end();
  });
}

function extractReply(response) {
  // OpenCode API 返回格式: { info: Message, parts: Part[] }
  if (response && response.parts && Array.isArray(response.parts)) {
    const textParts = response.parts.filter(p => p.type === 'text');
    return textParts.map(p => p.text).join('\n');
  }
  return '无法解析回复';
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Mobile Chat Server running at:`);
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://100.95.190.86:${PORT}`);
  console.log(`\n📱 Open on your phone to start chatting!\n`);
});
