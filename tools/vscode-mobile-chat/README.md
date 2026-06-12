# VS Code Mobile Chat

A local VS Code extension prototype that exposes an independent mobile chat client for Copilot language models.

## Current Scope

- Starts a local HTTP server from a VS Code command.
- Serves a mobile-first browser UI.
- Keeps mobile sessions separate from native VS Code Copilot Chat sessions.
- Requires every message send to include an explicit `sessionId`.
- Uses VS Code chat model settings for the mobile model picker, then sends through either the VS Code Language Model API or a configured custom endpoint bridge.
- Stores mobile sessions in the extension global storage folder.

## Commands

- `Mobile Chat: Start Server`
- `Mobile Chat: Stop Server`
- `Mobile Chat: Open Client`
- `Mobile Chat: Set Custom Endpoint Key`
- `Mobile Chat: Clear Custom Endpoint Key`
- `Mobile Chat: Show Custom Endpoint Key Status`

## Development Run

Open this folder as a VS Code extension development target, then run the extension host. Start the server with `Mobile Chat: Start Server`.

The default URL is `http://127.0.0.1:3011/`. If token protection is enabled, use the URL shown by the start command notification.

## One-Click Tailscale Run

Run `start-tailscale.bat --install` once after changing the extension files. After that, run `start-tailscale.bat` normally. The extension activates with the VS Code window, watches the temporary launch config written by the bat, also accepts a VS Code URI activation hint, starts the mobile server on `0.0.0.0:3001`, disables token checks for the Tailscale entry, and prints the Tailscale URL when `tailscale ip -4` is available. If this is the first run after installing or updating the extension, reload the existing window once and run the bat again. The printed URL is direct, for example `http://100.95.190.86:3001/`.

Use the printed URL on your phone, for example:

```text
http://100.x.y.z:3001/?token=generated-token
```

The Tailscale bat disables token checks by default, so the normal phone URL is just `http://100.x.y.z:3001/`.

This keeps the old mobile access shape while replacing the OpenCode proxy with the VS Code extension bridge.

## Model Picker

The mobile picker reads display-safe entries from VS Code's `chatLanguageModels.json` first, then `vscodeMobileChat.customModels`, then the Language Model API fallback. API keys from `chatLanguageModels.json` stay in the extension host and are never returned to the mobile browser. Models marked as VS Code Language Model API entries do not need a mobile key; the picker only keeps them when VS Code's public language model API exposes a matching model to this extension.

`chat-completions` custom endpoint entries can be sent directly by the extension host only when the JSON file contains a real API key. Some VS Code custom models store the key as an `${input:...}` secret reference; VS Code resolves that secret internally, but this bridge cannot read it through the public extension API. Those entries are still listed, but sending to them reports a clear unsupported-secret error instead of forwarding the unresolved placeholder and producing a 401.

To make those endpoint models usable from the phone, either run `Mobile Chat: Set Custom Endpoint Key` on the desktop once, or open the mobile page on port 3001, choose the endpoint model, and use the model toolbar's `Set key` action. The key is saved in this extension's VS Code SecretStorage on the desktop. It is not written to `chatLanguageModels.json`, not returned by `/api/models`, and not stored in the mobile browser. Use `Mobile Chat: Show Custom Endpoint Key Status` or the mobile model status text to check which endpoints are ready. Use `Mobile Chat: Clear Custom Endpoint Key` or the mobile `Clear` action to remove a saved key. The send button is disabled while the selected model is not ready.

The mobile `Key` action sends the key from the phone to the computer once over the same 3001 connection used for chat. Keep this entry on trusted Tailscale/private networks; do not expose the server on an untrusted network when entering keys.

Use `/api/runtime` to verify which installed extension version is currently serving port 3001 after installing an update.

## Boundaries

This tool does not read or control native Copilot Chat sessions. The mobile browser has its own session store and only reuses VS Code model and workspace capabilities exposed through public APIs.
