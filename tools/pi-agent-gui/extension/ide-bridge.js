import { Type } from 'typebox';

export default function registerIdeBridge(pi) {
  pi.registerTool({
    name: 'get_ide_context',
    label: 'IDE context',
    description: 'Read the current Pi Agent GUI IDE context, including active file, active diff, dirty editor state, project root, and Git changes.',
    promptSnippet: 'Read current GUI IDE context',
    promptGuidelines: [
      'Use get_ide_context when the user refers to the current file, selected diff, visible project, or GUI source control state.',
      'After get_ide_context returns paths, use file or Git tools to inspect contents only when needed.'
    ],
    parameters: Type.Object({}),
    async execute() {
      const bridgeUrl = process.env.PI_AGENT_GUI_BRIDGE_URL || 'http://127.0.0.1:3002/api/bridge/ide-context';
      const response = await fetch(bridgeUrl, { headers: { accept: 'application/json' } });
      if (!response.ok) {
        throw new Error(`Pi Agent GUI bridge returned ${response.status}`);
      }
      const context = await response.json();
      return {
        content: [{ type: 'text', text: JSON.stringify(context, null, 2) }],
        details: context
      };
    }
  });
}