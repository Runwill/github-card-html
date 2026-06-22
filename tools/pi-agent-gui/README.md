# Pi Agent GUI

Pi Agent GUI is a first prototype for a shared desktop and mobile web interface on top of `pi --mode rpc`.

The GUI server owns one Pi RPC process. Desktop and mobile browsers connect to the same server, so both sides can see the same agent state, streamed messages, and tool execution events.

The project plan lives in [PLAN.md](PLAN.md). The main direction is to evolve from a thin RPC wrapper into a Pi-native GUI IDE bridge: project state, Git state, editor buffers, and GUI context should become Pi extension/custom tool capabilities instead of hidden prompt text.

## Start

Install Pi first if needed:

```powershell
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Start the GUI from this folder:

```powershell
npm start
```

For the normal phone/Tailscale workflow, use the helper from Windows Explorer or PowerShell. It binds the server to `0.0.0.0`, enables Pi approve mode, stops an older GUI server on the same port, and prints the phone URL:

```powershell
.\start-tailscale.bat
```

Default URLs:

- Local: `http://127.0.0.1:3002/`
- Tailscale: `http://YOUR_TAILSCALE_IP:3002/`

## Environment

- `PI_AGENT_GUI_HOST`: bind host, default `127.0.0.1`; `start-tailscale.bat` sets `0.0.0.0` for phone access.
- `PI_AGENT_GUI_PORT`: HTTP port, default `3002`.
- `PI_AGENT_GUI_TARGET`: project directory controlled by Pi, default is the repository root two levels above this tool.
- `PI_AGENT_GUI_PI_COMMAND`: Pi executable, default `pi`.
- `PI_AGENT_GUI_APPROVE`: pass `--approve` to Pi when set to `1`, default `0`; `start-tailscale.bat` sets `1` for the no-token local trusted workflow.
- `PI_AGENT_GUI_TOOLS`: optional comma-separated tool allowlist passed to `pi --tools`.
- `PI_AGENT_GUI_SESSION_ID`: optional Pi native session id passed to `--session-id`.
- `PI_AGENT_GUI_SESSION`: optional Pi native session path or id passed to `--session`.
- `PI_AGENT_GUI_SESSION_DIR`: optional Pi native session directory passed to `--session-dir`; `PI_CODING_AGENT_SESSION_DIR` is also honored.
- `PI_AGENT_GUI_CONTINUE`: pass `--continue` when set to `1`.
- `PI_AGENT_GUI_RESUME`: pass `--resume` when set to `1`.
- `PI_AGENT_GUI_NO_SESSION`: pass `--no-session` when set to `1`.

The Sessions panel can list local Pi session files from the active session directory and save the session mode used the next time the runtime starts. Pi currently exposes session selection as startup flags, so changing the startup session is disabled while the runtime is running. The running runtime can still create a new Pi session through the `New session` button.

## Model Configuration

The Provider form writes `C:\Users\Administrator\.pi\agent\models.json` for Pi. For OpenAI-compatible providers, `Base URL` is the API root used by the OpenAI SDK, not necessarily the same semantic field as VS Code custom endpoint `url`. For example, VS Code may accept `https://ai.lupoapi.com`, while Pi needs `https://ai.lupoapi.com/v1` so the SDK reaches `https://ai.lupoapi.com/v1/chat/completions`.

## IDE Bridge

When the runtime starts, the GUI automatically loads `extension/ide-bridge.js` through `pi --extension`. The bridge tools let Pi read the GUI's current project root, active file, active diff, dirty editor state, and Git changes without adding IDE context to the user prompt.

Available bridge tools:

- `get_ide_context`: read the current GUI IDE state selected by the added context chips.
- `read_ide_file`: read the active file or a project-relative file allowed by the selected context chips.
- `read_ide_diff`: read staged and unstaged diff for the active change or requested file.
- `list_ide_changes`: list current Git changes.
- `get_unsaved_buffers`: report unsaved GUI editor buffers so Pi does not assume disk content is current.

The composer shows an IDE state preview for the human operator only. Prompt, steer, and follow-up requests send exactly the text typed by the user; the agent should call the bridge tools when it needs the current file, selected diff, or visible source control state.

## Current Scope

- Start/stop one Pi RPC runtime.
- Send prompt, steer, follow-up, abort.
- List recent Pi sessions, choose the startup session, and create a new running session through Pi RPC.
- Read state, messages, and models from Pi.
- Stream Pi RPC events to every connected browser through SSE.
- Render assistant stream deltas and tool execution cards.

This is still a prototype IDE. It already exposes project files, search, Git status, diff preview, editing, model configuration, and the first Pi-native bridge tool; dangerous Git write workflows such as discard, stage, and commit are intentionally not implemented until the confirmation UI exists.

## Direction

The current GUI APIs for project files, Git status, search, preview, editing, and model configuration are useful first cuts. The first extension/custom tool bridge now exposes `get_ide_context`; later steps should add `read_ide_file`, `read_ide_diff`, and `list_ide_changes` when the agent needs deeper IDE context.


VISUAL_CHECKPOINT_MARKER_1782105300942
