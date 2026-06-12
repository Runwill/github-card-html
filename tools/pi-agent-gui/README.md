# Pi Agent GUI

Pi Agent GUI is a first prototype for a shared desktop and mobile web interface on top of `pi --mode rpc`.

The GUI server owns one Pi RPC process. Desktop and mobile browsers connect to the same server, so both sides can see the same agent state, streamed messages, and tool execution events.

## Start

Install Pi first if needed:

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Start the GUI from this folder:

```powershell
npm start
```

Or use the Tailscale helper from Windows Explorer or PowerShell:

```powershell
.\start-tailscale.bat
```

Default URLs:

- Local: `http://127.0.0.1:3002/`
- Tailscale: `http://YOUR_TAILSCALE_IP:3002/`

## Environment

- `PI_AGENT_GUI_HOST`: bind host, default `127.0.0.1`.
- `PI_AGENT_GUI_PORT`: HTTP port, default `3002`.
- `PI_AGENT_GUI_TARGET`: project directory controlled by Pi, default is the repository root two levels above this tool.
- `PI_AGENT_GUI_PI_COMMAND`: Pi executable, default `pi`.
- `PI_AGENT_GUI_APPROVE`: pass `--approve` to Pi when set to `1`, default `0`.
- `PI_AGENT_GUI_TOOLS`: optional comma-separated tool allowlist passed to `pi --tools`.

## Current Scope

- Start/stop one Pi RPC runtime.
- Send prompt, steer, follow-up, abort.
- Read state, messages, and models from Pi.
- Stream Pi RPC events to every connected browser through SSE.
- Render assistant stream deltas and tool execution cards.

This is not a full IDE yet. VS Code remains the recommended place to review file diffs and source control changes made by Pi.
