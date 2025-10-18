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

main().catch(err => { console.error('[bust-version] Failed:', err); process.exit(1); });

async function main(){
  const htmlFiles = await collectHtmlFiles(ROOT);
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

async function collectHtmlFiles(dir){
  const out = [];
  const stack = [dir];
  while (stack.length){
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries){
      const p = path.join(cur, e.name);
      if (e.isDirectory()){
        // 跳过常见构建产物或不需要的目录（按需调整）
        if (['node_modules', '.git', '.vscode'].includes(e.name)) continue;
        stack.push(p);
      } else if (e.isFile() && p.toLowerCase().endsWith('.html')){
        out.push(p);
      }
    }
  }
  return out;
}

function processHtml(html, version){
  let result = html;

  // 1) 更新/追加 <meta name="asset-version"> 的值（若存在）
  result = result.replace(/(<meta\s+name=["']asset-version["']\s+content=)["'][^"']*["'](\s*\/?>)/i, `$1"${version}"$2`);

  // 2) 为 href/src 的本地资源追加/更新 ?v= 版本参数
  // 匹配规则：
  // - 属性名：href|src
  // - 值：不以 http(s):、//、data:、# 开头
  // - 捕获 path + query（不含 #）
  const attrRegex = /(href|src)\s*=\s*"(?!https?:|\/\/|data:|#)([^"#]*?)(?:#|\")/gi;

  result = result.replace(attrRegex, (m, attr, urlPath) => {
    // urlPath 可能包含 query，如 "style.css?x=1"
    const [pathPart, queryPartRaw = ''] = urlPath.split('?');
    const queryPart = queryPartRaw ? `?${queryPartRaw}` : '';

    // 跳过空路径或内联脚本片段
    if (!pathPart || /^\s*$/.test(pathPart)) return m;

    const newQuery = updateQuery(queryPart, version);
    const rebuilt = `${attr}="${pathPart}${newQuery}"`;

    // 原匹配吃掉了结束引号，这里补上
    if (m.endsWith('"')){
      return rebuilt;
    }
    return rebuilt + '"';
  });

  return result;
}

function updateQuery(query, version){
  if (!query){
    return `?v=${version}`;
  }
  // 已有 v= 参数则替换
  if (/([?&])v=[^&]*/i.test(query)){
    return query.replace(/([?&])v=[^&]*/i, `$1v=${version}`);
  }
  // 没有 v= 则追加
  return query + (query.includes('?') ? `&v=${version}` : `?v=${version}`);
}
