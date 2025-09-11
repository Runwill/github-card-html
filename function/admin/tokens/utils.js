(function () {
  // tokens/utils
  // 常用工具：HTML 转义、按路径设置/删除、颜色工具

  window.tokensAdmin = window.tokensAdmin || {};

  function esc(s) {
    return (s == null ? '' : String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])));
  }

  // 通过 a.b.c 或 a.0.b 路径设置值
  function setByPath(obj, path, value) {
    if (!obj || !path) return;
    const segs = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < segs.length; i++) {
      const k = segs[i];
      const last = i === segs.length - 1;
      const isIdx = /^\d+$/.test(k);
      if (last) {
        if (isIdx) { if (!Array.isArray(cur)) return; cur[Number(k)] = value; }
        else { cur[k] = value; }
      } else {
        const nextKey = segs[i + 1];
        const nextIsIdx = /^\d+$/.test(nextKey);
        if (isIdx) {
          const idx = Number(k);
          if (!Array.isArray(cur)) return;
          if (cur[idx] == null) cur[idx] = nextIsIdx ? [] : {};
          cur = cur[idx];
        } else {
          if (cur[k] == null) cur[k] = nextIsIdx ? [] : {};
          cur = cur[k];
        }
      }
    }
  }

  // 通过路径删除字段/元素
  function deleteFieldInDocByPath(obj, path) {
    if (!obj || !path) return;
    const segs = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i];
      const isIdx = /^\d+$/.test(k);
      cur = isIdx ? cur[Number(k)] : cur[k];
      if (cur == null) return;
    }
    const last = segs[segs.length - 1];
    if (/^\d+$/.test(last)) {
      if (Array.isArray(cur)) cur.splice(Number(last), 1);
    } else {
      if (cur && Object.prototype.hasOwnProperty.call(cur, last)) delete cur[last];
    }
  }

  // 颜色获取与亮色混合
  const getAccent = (o) => {
    const v = (o && typeof o.color === 'string') ? o.color.trim() : '';
    if (!v) return null;
    if (/^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v)) return v;
    if (/^[a-zA-Z]+$/.test(v)) return v;
    return null;
  };

  const computeTint = (col, ratio = 0.95) => {
    // 返回与主题背景（var(--surface)）按比例混合的 CSS 表达式，随主题切换自动适配。
    // 旧含义：ratio 为“白色占比”，例如 0.95 表示 95% 白 + 5% 原色。
    // 新实现：将“白色”替换为主题表面色 var(--surface)。为保持观感一致，保留相同的原色占比。
    if (!col) return '';
    const accentPct = Math.max(0, Math.min(100, Math.round((1 - ratio) * 100)));
    // 例：ratio=0.95 -> accentPct=5（5% 原色 + 95% 主题表面色）
    // 使用 CSS color-mix，确保在暗/亮主题切换时跟随 var(--surface) 变化。
    return `color-mix(in srgb, ${col} ${accentPct}%, var(--surface))`;
  };

  Object.assign(window.tokensAdmin, { esc, setByPath, deleteFieldInDocByPath, getAccent, computeTint });
})();
