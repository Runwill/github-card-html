#!/usr/bin/env node
/**
 * 自动为 HTML 文件中的本地静态资源追加/更新版本参数 v=VERSION
 * 使用方式（在项目根或 card-html 目录执行）：
 *   node card-html/scripts/bust-version.js 20251019
 * 若不传版本号，则使用当前时间戳（YYYYMMDDHHmm）。
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VERSION = (process.argv[2] || getTimestamp());

try {
  main();
} catch (err) {
  console.error('[bust-version] Failed:', err);
  process.exit(1);
}

function main(){
  const htmlFiles = collectFiles(ROOT, file => file.toLowerCase().endsWith('.html'));
  const moduleFiles = collectBrowserModuleFiles(ROOT);
  let changed = 0;
  for (const file of htmlFiles){
    const before = fs.readFileSync(file, 'utf8');
    const after = processHtml(before, VERSION);
    if (after !== before){
      fs.writeFileSync(file, after, 'utf8');
      changed++;
      console.log('[bust-version] updated:', path.relative(ROOT, file));
    }
  }
  for (const file of moduleFiles){
    const before = fs.readFileSync(file, 'utf8');
    const after = processModuleImports(before, VERSION);
    if (after !== before){
      fs.writeFileSync(file, after, 'utf8');
      changed++;
      console.log('[bust-version] updated:', path.relative(ROOT, file));
    }
  }
  console.log(`[bust-version] Done. Files updated: ${changed}. Version: ${VERSION}`);
}

function getTimestamp(){
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth()+1);
  const DD = pad(d.getDate());
  const HH = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}${MM}${DD}${HH}${mm}`;
}

function collectFiles(dir, matchFile){
  const out = [];
  const stack = [dir];
  const skipDirs = new Set(['node_modules', '.git', '.vscode']);
  while (stack.length){
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries){
      const p = path.join(cur, e.name);
      if (e.isDirectory()){
        if (!skipDirs.has(e.name)) stack.push(p);
      } else if (e.isFile() && matchFile(p)){
        out.push(p);
      }
    }
  }
  return out;
}

function collectBrowserModuleFiles(root){
  const roots = ['function', 'game', 'editor']
    .map(name => path.join(root, name))
    .filter(dir => fs.existsSync(dir));
  return roots.flatMap(dir => collectFiles(dir, file => file.toLowerCase().endsWith('.js')));
}

function processHtml(html, version){
  return html
    .replace(/(<meta\s+name=["']asset-version["']\s+content=)["'][^"']*["'](\s*\/?>)/i, `$1"${version}"$2`)
    .replace(/\b(href|src)\s*=\s*"(?!https?:|\/\/|data:|#)([^"]*)"/gi, (match, attr, url) => {
      const nextUrl = updateVersionParam(url, version);
      return nextUrl === url ? match : `${attr}="${nextUrl}"`;
    });
}

function processModuleImports(source, version){
  return source
    .replace(/(\bimport\s+(?:[^'"]*?\s+from\s*)?["'])([^"']+)(["'])/g, replaceModuleUrl(version))
    .replace(/(\bimport\s*\(\s*["'])([^"']+)(["']\s*\))/g, replaceModuleUrl(version));
}

function replaceModuleUrl(version){
  return (match, before, url, after) => {
    if (!shouldBustModuleUrl(url)) return match;
    const nextUrl = updateVersionParam(url, version);
    return nextUrl === url ? match : `${before}${nextUrl}${after}`;
  };
}

function shouldBustModuleUrl(url){
  if (!url || !url.trim()) return false;
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return false;
  return url.startsWith('.') || url.startsWith('/');
}

function updateVersionParam(url, version){
  const [beforeHash, hash = ''] = url.split('#');
  const [assetPath, query = ''] = beforeHash.split('?');
  if (!assetPath.trim()) return url;
  const params = new URLSearchParams(query);
  params.set('v', version);
  return `${assetPath}?${params.toString()}${hash ? `#${hash}` : ''}`;
}
