const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

class SessionStore {
  constructor(storageUri) {
    this.storageDir = storageUri.fsPath;
    this.filePath = path.join(this.storageDir, 'mobile-chat-sessions.json');
    this.sessions = [];
    this.loaded = false;
  }

  async load() {
    if (this.loaded) {
      return;
    }

    await fs.mkdir(this.storageDir, { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
      this.sessions = [];
    }
    this.loaded = true;
  }

  async save() {
    await fs.mkdir(this.storageDir, { recursive: true });
    const payload = JSON.stringify({ sessions: this.sessions }, null, 2);
    await fs.writeFile(this.filePath, payload, 'utf8');
  }

  async listSessions() {
    await this.load();
    return [...this.sessions]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .map((session) => ({
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        modelId: session.modelId,
        messageCount: session.messages.length
      }));
  }

  async createSession(title = 'Mobile Chat') {
    await this.load();
    const now = new Date().toISOString();
    const session = {
      id: crypto.randomUUID(),
      title,
      createdAt: now,
      updatedAt: now,
      modelId: '',
      messages: []
    };
    this.sessions.push(session);
    await this.save();
    return session;
  }

  async getSession(sessionId) {
    await this.load();
    return this.sessions.find((session) => session.id === sessionId) || null;
  }

  async getMessages(sessionId) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }
    return session.messages;
  }

  async appendMessage(sessionId, message) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }
    const normalizedMessage = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...message
    };
    session.messages.push(normalizedMessage);
    session.updatedAt = normalizedMessage.createdAt;
    if (message.role === 'user' && session.title === 'Mobile Chat') {
      session.title = makeTitle(message.content);
    }
    if (message.modelId) {
      session.modelId = message.modelId;
    }
    await this.save();
    return normalizedMessage;
  }

  async updateAssistantMessage(sessionId, messageId, content) {
    const session = await this.getSession(sessionId);
    if (!session) {
      return null;
    }
    const message = session.messages.find((item) => item.id === messageId);
    if (!message) {
      return null;
    }
    message.content = content;
    session.updatedAt = new Date().toISOString();
    await this.save();
    return message;
  }

  async deleteSession(sessionId) {
    await this.load();
    const before = this.sessions.length;
    this.sessions = this.sessions.filter((session) => session.id !== sessionId);
    if (this.sessions.length === before) {
      return false;
    }
    await this.save();
    return true;
  }
}

function makeTitle(content) {
  const normalized = String(content || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'Mobile Chat';
  }
  return normalized.length > 32 ? `${normalized.slice(0, 32)}...` : normalized;
}

module.exports = {
  SessionStore
};
