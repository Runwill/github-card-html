const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'partials', 'panel_term.html');
const TARGET = path.join(ROOT, 'base', 'program_panel.json');

const STRUCTURAL_TAGS = new Set(['div', 'main', 'padding', 'h1', 'h2', 'h3', 'a']);
const VOID_HTML_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

function decodeEntity(value) {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseAttrs(raw) {
  const attrs = {};
  const re = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = re.exec(raw || ''))) {
    const name = match[1];
    if (!name || name === '/') continue;
    attrs[name] = decodeEntity(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

function appendChild(parent, node) {
  if (!node) return;
  parent.children.push(node);
}

function parseHtmlFragment(html) {
  const root = { type: 'root', children: [] };
  const stack = [root];
  const tokenRe = /<!--[\s\S]*?-->|<\/?[^>]+>|[^<]+/g;
  let match;

  while ((match = tokenRe.exec(html))) {
    const token = match[0];
    const parent = stack[stack.length - 1];

    if (!token || token.startsWith('<!--')) continue;
    if (token[0] !== '<') {
      appendChild(parent, { type: 'text', text: token });
      continue;
    }

    const closeMatch = token.match(/^<\/\s*([^\s>]+)\s*>$/);
    if (closeMatch) {
      const tag = closeMatch[1].toLowerCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tag === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const openMatch = token.match(/^<\s*([^\s/>]+)([\s\S]*?)>$/);
    if (!openMatch) continue;
    const tag = openMatch[1].toLowerCase();
    const rawAttrs = openMatch[2] || '';
    const node = { type: 'element', tag, attrs: parseAttrs(rawAttrs), children: [] };
    appendChild(parent, node);

    const selfClosing = /\/\s*>$/.test(token);
    if (!selfClosing && !VOID_HTML_TAGS.has(tag)) stack.push(node);
  }

  return root.children;
}

function normalizeText(value) {
  const raw = String(value || '').replace(/\s+/g, ' ');
  return raw.trim() ? raw : '';
}

function normalizeTextNode(value) {
  return normalizeText(decodeEntity(value));
}

function withoutEmptyAttrs(attrs) {
  return attrs && Object.keys(attrs).length ? attrs : undefined;
}

function classNames(attrs) {
  return String(attrs && attrs.class || '').split(/\s+/).filter(Boolean);
}

function hasClass(attrs, className) {
  return classNames(attrs).includes(className);
}

function uniqueTerms(terms) {
  return Array.from(new Set((terms || []).filter(Boolean)));
}

function collectScrollTerms(nodes, terms = []) {
  for (const node of nodes || []) {
    if (!node || typeof node !== 'object') continue;
    if (node.tag && hasClass(node.attrs, 'scroll')) terms.push(node.tag);
    collectScrollTerms(node.content, terms);
  }
  return uniqueTerms(terms);
}

function attachTerms(out, content) {
  const terms = collectScrollTerms(content);
  if (terms.length) {
    out.terms = terms;
    if (terms.length === 1) out.term = terms[0];
  }
  return out;
}

function buildData(panel) {
  const concepts = new Map();

  function noteConcept(tag) {
    if (!tag || STRUCTURAL_TAGS.has(tag)) return;
    const existing = concepts.get(tag) || { term: tag, appearances: 0 };
    existing.appearances += 1;
    concepts.set(tag, existing);
  }

  function inlineFromNode(node) {
    if (!node) return null;
    if (node.type === 'text') {
      const text = normalizeTextNode(node.text);
      return text || null;
    }
    if (node.type !== 'element') return null;
    noteConcept(node.tag);
    const out = { tag: node.tag };
    const attrs = withoutEmptyAttrs(node.attrs);
    const children = (node.children || []).map(inlineFromNode).filter(Boolean);
    if (attrs) out.attrs = attrs;
    if (children.length) out.content = children;
    return out;
  }

  function inlineContent(node) {
    return (node.children || []).map(inlineFromNode).filter(Boolean);
  }

  function blockFromNode(node) {
    if (!node) return null;
    if (node.type === 'text') {
      const text = normalizeTextNode(node.text);
      return text ? { type: 'text', text } : null;
    }
    if (node.type !== 'element') return null;
    const tag = node.tag;
    const heading = tag.match(/^h([1-3])$/);
    if (heading) {
      const title = inlineContent(node);
      const out = {
        type: 'term_heading',
        level: Number(heading[1]),
        attrs: node.attrs || {},
        title
      };
      return attachTerms(out, title);
    }
    if (tag === 'div' && String(node.attrs && node.attrs.class || '').split(/\s+/).includes('indent')) {
      const content = inlineContent(node);
      return {
        type: 'body',
        variant: 'rich_text',
        attrs: node.attrs || {},
        content
      };
    }
    noteConcept(tag);
    const children = (node.children || []).map(blockFromNode).filter(Boolean);
    const out = { type: tag === 'padding' || tag === 'div' ? 'container' : 'element', tag, children };
    const attrs = withoutEmptyAttrs(node.attrs);
    if (attrs) out.attrs = attrs;
    return out;
  }

  function findMain(node) {
    if (!node) return null;
    if (node.type === 'element' && node.tag === 'main') return node;
    for (const child of node.children || []) {
      const found = findMain(child);
      if (found) return found;
    }
    return null;
  }

  const mainNode = findMain(panel) || panel;
  const tree = {
    type: 'main',
    children: (mainNode.children || []).map(blockFromNode).filter(Boolean)
  };
  const conceptList = Array.from(concepts.values()).sort((a, b) => a.term.localeCompare(b.term));

  return {
    version: 2,
    panelId: 'panel_term',
    source: 'partials/panel_term.html',
    renderer: 'program_panel.v2',
    concepts: conceptList,
    tree
  };
}

function findPanel(nodes) {
  const stack = nodes.slice();
  while (stack.length) {
    const node = stack.shift();
    if (node.type === 'element' && node.tag === 'div' && node.attrs && node.attrs.id === 'panel_term') return node;
    if (node.children) stack.unshift(...node.children);
  }
  return null;
}

const html = fs.readFileSync(SOURCE, 'utf8');
const roots = parseHtmlFragment(html);
const panel = findPanel(roots);
if (!panel) {
  console.error('panel_term not found');
  process.exit(1);
}

const data = buildData(panel);
fs.writeFileSync(TARGET, JSON.stringify(data, null, 2) + '\n', 'utf8');

function countTreeNodes(node) {
  if (!node) return 0;
  return 1 + (node.children || []).reduce((sum, child) => sum + countTreeNodes(child), 0);
}

function countTermHeadings(node) {
  if (!node) return 0;
  const self = node.type === 'term_heading' ? 1 : 0;
  return self + (node.children || []).reduce((sum, child) => sum + countTermHeadings(child), 0);
}

function countBodies(node) {
  if (!node) return 0;
  const self = node.type === 'body' ? 1 : 0;
  return self + (node.children || []).reduce((sum, child) => sum + countBodies(child), 0);
}

console.log(JSON.stringify({
  target: path.relative(ROOT, TARGET),
  concepts: data.concepts.length,
  treeNodes: countTreeNodes(data.tree),
  headings: countTermHeadings(data.tree),
  bodies: countBodies(data.tree)
}, null, 2));
