import { Type } from 'typebox';

export default function registerIdeBridge(pi) {
  pi.registerTool({
    name: 'get_ide_context',
    label: 'IDE context',
    description: 'Read the current Pi Agent GUI IDE context selected by the GUI context chips, including allowed files, active diff, dirty editor state, project root, and Git changes.',
    promptSnippet: 'Read current GUI IDE context',
    promptGuidelines: [
      'Use get_ide_context when the user refers to the current file, selected diff, visible project, or GUI source control state.',
      'Respect the returned contextItems and contextFiles: omitted activeFile, activeDiff, dirty state, Git files, or file paths are intentionally hidden by the GUI selection.',
      'After get_ide_context returns paths, use file or Git tools to inspect contents only when needed.'
    ],
    parameters: Type.Object({}),
    async execute() {
      return fetchBridgeJson('/ide-context');
    }
  });

  pi.registerTool({
    name: 'read_ide_file',
    label: 'Read IDE file',
    description: 'Read a project file through the Pi Agent GUI bridge, respecting the selected context chips and project path safety rules. Defaults to the active file.',
    promptSnippet: 'Read the active GUI file',
    promptGuidelines: [
      'Use read_ide_file when the user refers to the current file or a file path shown by get_ide_context.',
      'If the GUI reports an unsaved buffer for the same path, mention that disk content may be stale.'
    ],
    parameters: Type.Object({
      path: Type.Optional(Type.String({ description: 'Project-relative path. Omit to read the active GUI file.' }))
    }),
    async execute(input = {}) {
      return fetchBridgeJson(`/ide-file${buildQuery({ path: input.path })}`);
    }
  });

  pi.registerTool({
    name: 'read_ide_diff',
    label: 'Read IDE diff',
    description: 'Read the staged and unstaged Git diff for a project file through the Pi Agent GUI bridge. Defaults to the active diff.',
    promptSnippet: 'Read the active GUI diff',
    promptGuidelines: [
      'Use read_ide_diff when the user refers to the current diff or selected Git change.',
      'Respect context denial errors; they mean the human operator intentionally hid that source.'
    ],
    parameters: Type.Object({
      path: Type.Optional(Type.String({ description: 'Project-relative path. Omit to read the active GUI diff.' }))
    }),
    async execute(input = {}) {
      return fetchBridgeJson(`/ide-diff${buildQuery({ path: input.path })}`);
    }
  });

  pi.registerTool({
    name: 'list_ide_changes',
    label: 'List IDE changes',
    description: 'List Git changes visible to the Pi Agent GUI bridge, respecting the selected context chips.',
    promptSnippet: 'List GUI Git changes',
    promptGuidelines: [
      'Use list_ide_changes before reviewing or summarizing current Git work.',
      'Use read_ide_diff for individual files after inspecting the list.'
    ],
    parameters: Type.Object({}),
    async execute() {
      return fetchBridgeJson('/ide-changes');
    }
  });

  pi.registerTool({
    name: 'get_unsaved_buffers',
    label: 'Get unsaved buffers',
    description: 'Return GUI editor buffers that have unsaved changes. The prototype exposes dirty metadata so the agent can avoid assuming disk content is current.',
    promptSnippet: 'Check GUI unsaved buffers',
    promptGuidelines: [
      'Call get_unsaved_buffers when get_ide_context reports previewDirty or before making claims about the active file contents.',
      'If contentAvailable is false, ask the user to save or paste the unsaved changes before relying on exact content.'
    ],
    parameters: Type.Object({}),
    async execute() {
      return fetchBridgeJson('/unsaved-buffers');
    }
  });
}

async function fetchBridgeJson(pathname) {
  const baseUrl = process.env.PI_AGENT_GUI_BRIDGE_BASE_URL || 'http://127.0.0.1:3002/api/bridge';
  const legacyContextUrl = process.env.PI_AGENT_GUI_BRIDGE_URL;
  const url = legacyContextUrl && pathname === '/ide-context' ? legacyContextUrl : `${baseUrl}${pathname}`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Pi Agent GUI bridge returned ${response.status}${text ? `: ${text}` : ''}`);
  }
  const details = await response.json();
  return {
    content: [{ type: 'text', text: JSON.stringify(details, null, 2) }],
    details
  };
}

function buildQuery(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && String(value).trim()) {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}