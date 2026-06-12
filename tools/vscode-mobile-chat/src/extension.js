const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createAccessToken } = require('./auth');
const { MobileChatServer } = require('./server');
const { SessionStore } = require('./sessions');
const {
  clearCustomEndpointKey,
  getCustomEndpointKeyStatus,
  listCustomEndpointModels,
  setCustomEndpointKey
} = require('./lm');

let mobileServer;
let accessToken;
let outputChannel;
let lastLaunchConfigSignature = '';

function trace(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  try {
    fs.appendFileSync(path.join(os.tmpdir(), 'vscode-mobile-chat.log'), line, 'utf8');
  } catch {
    // Best effort diagnostic log only.
  }
  if (outputChannel) {
    outputChannel.appendLine(message);
  }
}

function activate(context) {
  trace('activate');
  const sessionStore = new SessionStore(context.globalStorageUri);
  const launchConfig = readLaunchConfig();
  accessToken = launchConfig.token || process.env.VSCODE_MOBILE_CHAT_TOKEN || createAccessToken();
  outputChannel = vscode.window.createOutputChannel('VS Code Mobile Chat');
  context.subscriptions.push(outputChannel);

  context.subscriptions.push(
    vscode.commands.registerCommand('vscodeMobileChat.startServer', async () => {
      const commandLaunchConfig = readLaunchConfig();
      trace('command startServer');
      const url = await startServer(context, sessionStore, commandLaunchConfig);
      const action = await vscode.window.showInformationMessage(`Mobile Chat server started: ${url}`, 'Open');
      if (action === 'Open') {
        await vscode.env.openExternal(vscode.Uri.parse(url));
      }
    }),
    vscode.commands.registerCommand('vscodeMobileChat.stopServer', async () => {
      if (!mobileServer) {
        vscode.window.showInformationMessage('Mobile Chat server is not running.');
        return;
      }
      await mobileServer.stop();
      mobileServer = undefined;
      vscode.window.showInformationMessage('Mobile Chat server stopped.');
    }),
    vscode.commands.registerCommand('vscodeMobileChat.openClient', async () => {
      const commandLaunchConfig = readLaunchConfig();
      trace('command openClient');
      const url = await startServer(context, sessionStore, commandLaunchConfig);
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }),
    vscode.commands.registerCommand('vscodeMobileChat.setCustomEndpointKey', async () => {
      const model = await pickCustomEndpointModel();
      if (!model) {
        return;
      }
      const apiKey = await vscode.window.showInputBox({
        title: `Set API key for ${formatModelLabel(model)}`,
        prompt: 'The key is stored in VS Code SecretStorage on this desktop and is never sent to the phone browser.',
        password: true,
        ignoreFocusOut: true,
        validateInput: (value) => value.trim() ? undefined : 'API key is required.'
      });
      if (!apiKey) {
        return;
      }
      await setCustomEndpointKey(context.secrets, model, apiKey);
      vscode.window.showInformationMessage(`Mobile Chat key saved for ${formatModelLabel(model)}.`);
    }),
    vscode.commands.registerCommand('vscodeMobileChat.clearCustomEndpointKey', async () => {
      const model = await pickCustomEndpointModel();
      if (!model) {
        return;
      }
      await clearCustomEndpointKey(context.secrets, model);
      vscode.window.showInformationMessage(`Mobile Chat key cleared for ${formatModelLabel(model)}.`);
    }),
    vscode.commands.registerCommand('vscodeMobileChat.showCustomEndpointKeyStatus', async () => {
      const rows = await getCustomEndpointKeyStatus(context.secrets);
      if (!rows.length) {
        vscode.window.showInformationMessage('No chat-completions custom endpoint models were found.');
        return;
      }
      const text = rows.map((row) => `${formatModelLabel(row)}: ${row.hasSecretKey ? 'configured' : 'not configured'}`).join('\n');
      vscode.window.showInformationMessage(text, { modal: true });
    }),
    vscode.window.registerUriHandler({
      handleUri: async () => {
        const uriLaunchConfig = readLaunchConfig();
        trace('uri start');
        const url = await startServer(context, sessionStore, uriLaunchConfig);
        outputChannel.appendLine(`Mobile Chat started from URI: ${url}`);
      }
    })
  );

  if (launchConfig.autoStart || process.env.VSCODE_MOBILE_CHAT_AUTO_START === '1') {
    trace('auto-start from activate');
    startServer(context, sessionStore, launchConfig)
      .then((url) => {
        outputChannel.appendLine(`Mobile Chat auto-started: ${url}`);
        vscode.window.showInformationMessage(`Mobile Chat auto-started: ${url}`);
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`Mobile Chat auto-start failed: ${message}`);
        vscode.window.showErrorMessage(`Mobile Chat auto-start failed: ${message}`);
      });
  }

  startLaunchConfigWatcher(context, sessionStore);
}

async function startServer(context, sessionStore, launchConfig = {}) {
  const config = vscode.workspace.getConfiguration('vscodeMobileChat');
  const host = launchConfig.host || process.env.VSCODE_MOBILE_CHAT_HOST || config.get('host', '127.0.0.1');
  const port = Number(launchConfig.port || process.env.VSCODE_MOBILE_CHAT_PORT || config.get('port', 3011));
  const requireToken = launchConfig.requireToken === false || process.env.VSCODE_MOBILE_CHAT_REQUIRE_TOKEN === '0'
    ? false
    : config.get('requireToken', true);

  if (!mobileServer) {
    mobileServer = new MobileChatServer({
      extensionUri: context.extensionUri,
      sessionStore,
      accessToken,
      requireToken,
      secrets: context.secrets
    });
    context.subscriptions.push({ dispose: () => mobileServer && mobileServer.stop() });
  }

  const url = await mobileServer.start(host, port);
  outputChannel.appendLine(`Mobile Chat server URL: ${url}`);
  return url;
}

function readLaunchConfig() {
  const configPath = path.join(os.tmpdir(), 'vscode-mobile-chat-launch.json');
  try {
    const content = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '');
    const parsed = JSON.parse(content);
    if (!parsed.expiresAt || Date.parse(parsed.expiresAt) < Date.now()) {
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

function startLaunchConfigWatcher(context, sessionStore) {
  const configPath = path.join(os.tmpdir(), 'vscode-mobile-chat-launch.json');

  const checkLaunchConfig = () => {
    let stats;
    try {
      stats = fs.statSync(configPath);
    } catch {
      return;
    }

    const signature = `${stats.mtimeMs}:${stats.size}`;
    if (signature === lastLaunchConfigSignature) {
      return;
    }
    lastLaunchConfigSignature = signature;

    const launchConfig = readLaunchConfig();
    if (!launchConfig.autoStart) {
      return;
    }

    startServer(context, sessionStore, launchConfig)
      .then((url) => trace(`Mobile Chat started from launch config: ${url}`))
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        trace(`Mobile Chat launch config start failed: ${message}`);
      });
  };

  trace('launch config watcher started');
  checkLaunchConfig();
  const timer = setInterval(checkLaunchConfig, 1000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
}
async function pickCustomEndpointModel() {
  const models = await listCustomEndpointModels();
  if (!models.length) {
    vscode.window.showInformationMessage('No chat-completions custom endpoint models were found.');
    return undefined;
  }
  const picked = await vscode.window.showQuickPick(models.map((model) => ({
    label: formatModelLabel(model),
    description: model.hasSecretKey ? 'key configured' : 'no mobile key',
    detail: model.url,
    model
  })), {
    title: 'Select a custom endpoint model'
  });
  return picked && picked.model;
}

function formatModelLabel(model) {
  return `${model.name || model.rawModelId || model.id} (${model.providerName || model.vendor || 'custom endpoint'})`;
}

function deactivate() {
  if (mobileServer) {
    return mobileServer.stop();
  }
  return undefined;
}

module.exports = {
  activate,
  deactivate
};
