const { spawn } = require('child_process');
const { EventEmitter } = require('events');
const { StringDecoder } = require('string_decoder');

class PiRpcClient extends EventEmitter {
  constructor(options = {}) {
    super();
    this.command = options.command || 'pi';
    this.cwd = options.cwd || process.cwd();
    this.name = options.name || 'pi-agent-gui';
    this.approve = Boolean(options.approve);
    this.tools = options.tools || '';
    this.extraArgs = Array.isArray(options.extraArgs) ? options.extraArgs : [];
    this.process = null;
    this.nextId = 1;
    this.pending = new Map();
    this.stdoutBuffer = '';
    this.stderrBuffer = '';
    this.stdoutDecoder = new StringDecoder('utf8');
    this.stderrDecoder = new StringDecoder('utf8');
  }

  get isRunning() {
    return Boolean(this.process && !this.process.killed && this.process.exitCode === null);
  }

  start() {
    if (this.isRunning) {
      return;
    }

    const args = ['--mode', 'rpc', '--name', this.name];
    if (this.approve) {
      args.push('--approve');
    }
    if (this.tools) {
      args.push('--tools', this.tools);
    }
    args.push(...this.extraArgs);

    try {
      this.process = spawn(this.command, args, {
        cwd: this.cwd,
        env: process.env,
        shell: process.platform === 'win32',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (error) {
      this.emit('error-event', { message: normalizeStartError(error) });
      throw error;
    }

    this.emit('status', this.status());
    this.process.stdout.on('data', (chunk) => this.handleStdout(chunk));
    this.process.stdout.on('end', () => this.flushStdout());
    this.process.stderr.on('data', (chunk) => this.handleStderr(chunk));
    this.process.stderr.on('end', () => this.flushStderr());
    this.process.on('error', (error) => {
      this.emit('error-event', { message: normalizeStartError(error) });
      this.rejectAll(error);
      this.emit('status', this.status());
    });
    this.process.on('exit', (code, signal) => {
      this.emit('rpc-event', { type: 'runtime_exit', code, signal });
      this.rejectAll(new Error(`Pi exited with code ${code}${signal ? ` and signal ${signal}` : ''}.`));
      this.process = null;
      this.emit('status', this.status());
    });
  }

  stop() {
    if (!this.process) {
      return;
    }
    this.process.kill();
  }

  status() {
    return {
      running: this.isRunning,
      command: this.command,
      cwd: this.cwd,
      name: this.name,
      approve: this.approve,
      tools: this.tools || null
    };
  }

  request(command, timeoutMs = 30000) {
    if (!this.isRunning || !this.process.stdin.writable) {
      return Promise.reject(new Error('Pi runtime is not running.'));
    }

    const id = `gui-${this.nextId++}`;
    const payload = { id, ...command };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Pi RPC command timed out: ${command.type}`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timeout });
      this.process.stdin.write(`${JSON.stringify(payload)}\n`, 'utf8', (error) => {
        if (!error) {
          return;
        }
        clearTimeout(timeout);
        this.pending.delete(id);
        reject(error);
      });
    });
  }

  handleStdout(chunk) {
    this.stdoutBuffer += this.stdoutDecoder.write(chunk);
    this.consumeLines();
  }

  handleStderr(chunk) {
    this.stderrBuffer += this.stderrDecoder.write(chunk);
    this.consumeStderr();
  }

  consumeStderr() {
    while (true) {
      const newlineIndex = this.stderrBuffer.indexOf('\n');
      if (newlineIndex === -1) {
        break;
      }
      let line = this.stderrBuffer.slice(0, newlineIndex);
      this.stderrBuffer = this.stderrBuffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      if (line.trim()) {
        this.emit('rpc-event', { type: 'runtime_stderr', text: line });
      }
    }
  }

  flushStderr() {
    this.stderrBuffer += this.stderrDecoder.end();
    if (!this.stderrBuffer) {
      return;
    }
    let line = this.stderrBuffer;
    this.stderrBuffer = '';
    if (line.endsWith('\r')) {
      line = line.slice(0, -1);
    }
    if (line.trim()) {
      this.emit('rpc-event', { type: 'runtime_stderr', text: line });
    }
  }

  consumeLines() {
    while (true) {
      const newlineIndex = this.stdoutBuffer.indexOf('\n');
      if (newlineIndex === -1) {
        break;
      }
      let line = this.stdoutBuffer.slice(0, newlineIndex);
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      if (!line.trim()) {
        continue;
      }
      this.handleLine(line);
    }
  }

  flushStdout() {
    this.stdoutBuffer += this.stdoutDecoder.end();
    if (!this.stdoutBuffer) {
      return;
    }
    let line = this.stdoutBuffer;
    this.stdoutBuffer = '';
    if (line.endsWith('\r')) {
      line = line.slice(0, -1);
    }
    if (line.trim()) {
      this.handleLine(line);
    }
  }

  handleLine(line) {
    let event;
    try {
      event = JSON.parse(line);
    } catch (error) {
      this.emit('rpc-event', { type: 'runtime_parse_error', line, error: error.message });
      return;
    }

    if (event.type === 'response' && event.id && this.pending.has(event.id)) {
      const pending = this.pending.get(event.id);
      this.pending.delete(event.id);
      clearTimeout(pending.timeout);
      if (event.success === false) {
        pending.reject(new Error(event.error || `Pi RPC command failed: ${event.command || event.id}`));
      } else {
        pending.resolve(event);
      }
    }

    this.emit('rpc-event', event);
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

function normalizeStartError(error) {
  if (error && error.code === 'ENOENT') {
    return 'Pi command was not found in PATH. Install it with: npm install -g --ignore-scripts @earendil-works/pi-coding-agent';
  }
  return error && error.message ? error.message : String(error);
}

module.exports = { PiRpcClient };

