window.summonProgramPanel = async function summonProgramPanel() {
  try {
    const data = await loadProgramPanelData();
    if (!isRenderableProgramPanel(data)) return false;
    const panel = document.getElementById('panel_term');
    if (!panel) return false;
    const main = panel.querySelector('main') || panel;
    const html = renderProgramPanelData(data);
    if (!html) return false;
    main.innerHTML = html;
    panel.dataset.programPanelMode = 'generated';
    window.programPanelData = data;
    try {
      window.dispatchEvent(new CustomEvent('program-panel:rendered', { detail: { data, panel, main } }));
    } catch (_) {}
    return true;
  } catch (err) {
    console.warn('[program_panel] fallback to static panel', err);
    return false;
  }
};

async function loadProgramPanelData() {
  const endpoint = window.endpoints && typeof window.endpoints.programPanel === 'function'
    ? window.endpoints.programPanel()
    : '';
  if (endpoint) {
    try {
      const data = await fetchJsonCached(endpoint, { cache: 'no-cache' });
      if (isRenderableProgramPanel(data)) return data;
    } catch (_) {}
  }
  return fetchJsonCached('base/program_panel.json', { cache: 'no-cache' });
}

function isRenderableProgramPanel(data) {
  if (!data || typeof data !== 'object') return false;
  if (data.tree && Array.isArray(data.tree.children)) return true;
  return !!(data.view && data.view.main && Array.isArray(data.view.main.children));
}

function renderProgramPanelData(data) {
  if (data && data.tree && Array.isArray(data.tree.children)) {
    return renderProgramTreeNodes(data.tree.children, []);
  }
  const context = createProgramRenderContext(data);
  return renderProgramBlocks(data.view.main.children, context);
}

function renderProgramTreeNodes(nodes, path) {
  return (nodes || []).map((node, index) => renderProgramTreeNode(node, path.concat(index))).join('');
}

function renderProgramTreeNode(node, path) {
  if (!node) return '';
  if (typeof node === 'string') return escapeHtml(node);
  if (node.type === 'text') return escapeHtml(node.text || '');
  if (node.type === 'main') return renderProgramTreeNodes(node.children, path);
  if (node.type === 'term_heading') return renderProgramTreeHeading(node, path);
  if (node.type === 'body') return renderProgramTreeBody(node, path);
  if (node.type === 'container' || node.type === 'element') {
    return renderTag(node.tag, node.attrs, renderProgramTreeNodes(node.children, path));
  }
  return '';
}

function renderProgramTreeHeading(node, path) {
  const level = Math.max(1, Math.min(6, Number(node.level || 3)));
  return renderTag('h' + level, withProgramAttrs(node.attrs, 'heading', nodeKey(node, path)), renderInlineContent(node.title));
}

function renderProgramTreeBody(node, path) {
  return renderTag('div', withProgramAttrs(node.attrs || { class: 'indent' }, 'body', nodeKey(node, path)), renderInlineContent(node.content));
}

function nodeKey(node, path) {
  return String(node && (node._id || node.id) || 'path:' + (path || []).join('.'));
}

function createProgramRenderContext(data) {
  return {
    sections: new Map((data.sections || []).map(item => [item.id, item])),
    statements: new Map((data.statements || []).map(item => [item.id, item]))
  };
}

function renderProgramBlocks(blocks, context) {
  return (blocks || []).map(block => renderProgramBlock(block, context)).join('');
}

function renderProgramBlock(block, context) {
  if (!block) return '';
  if (block.type === 'text') return escapeHtml(block.text || '');
  if (block.type === 'sectionTitle') return renderProgramSectionTitle(block, context);
  if (block.type === 'statementRef') return renderProgramStatement(block, context);
  if (block.type === 'element') {
    return renderTag(block.tag, block.attrs, renderProgramBlocks(block.children, context));
  }
  return '';
}

function renderProgramSectionTitle(block, context) {
  const section = context.sections.get(block.id);
  if (!section) return '';
  return renderTag('h' + section.level, withProgramAttrs(section.attrs, 'section', section.id), renderInlineContent(section.title));
}

function renderProgramStatement(block, context) {
  const statement = context.statements.get(block.id);
  if (!statement) return '';
  return renderTag('div', withProgramAttrs(statement.attrs, 'statement', statement.id), renderInlineContent(statement.content));
}

function renderInlineContent(content) {
  if (typeof content === 'string') return escapeHtml(content);
  if (!Array.isArray(content)) return '';
  return (content || []).map(renderInlineNode).join('');
}

function renderInlineNode(node) {
  if (typeof node === 'string') return escapeHtml(node);
  if (!node || !node.tag) return '';
  return renderTag(node.tag, node.attrs, renderInlineContent(node.content));
}

function renderTag(tag, attrs, inner) {
  const attrText = Object.entries(attrs || {}).map(([key, value]) => value == null || value === '' ? '' : ` ${key}="${escapeAttr(value)}"`).join('');
  const body = inner || '';
  return `<${tag}${attrText}>${body}</${tag}>`;
}

function withProgramAttrs(attrs, kind, key) {
  return Object.assign({}, attrs || {}, {
    'data-program-kind': kind,
    'data-program-key': key
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
