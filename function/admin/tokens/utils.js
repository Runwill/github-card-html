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
    if (!col) return '';
    const hexToRgb = (h) => {
      let r, g, b;
      if (/^#([\da-fA-F]{3})$/.test(h)) {
        const m = h.slice(1); r = parseInt(m[0] + m[0], 16); g = parseInt(m[1] + m[1], 16); b = parseInt(m[2] + m[2], 16); return { r, g, b };
      }
      if (/^#([\da-fA-F]{6})$/.test(h)) {
        const m = h.slice(1); r = parseInt(m.slice(0, 2), 16); g = parseInt(m.slice(2, 4), 16); b = parseInt(m.slice(4, 6), 16); return { r, g, b };
      }
      return null;
    };
    const rgb = hexToRgb(col);
    if (rgb) {
      const r = Math.round(rgb.r * (1 - ratio) + 255 * ratio);
      const g = Math.round(rgb.g * (1 - ratio) + 255 * ratio);
      const b = Math.round(rgb.b * (1 - ratio) + 255 * ratio);
      return `rgba(${r}, ${g}, ${b}, 1)`;
    }
    return `color-mix(in srgb, ${col} ${Math.round(ratio * 100)}%, white)`;
  };

  Object.assign(window.tokensAdmin, { esc, setByPath, deleteFieldInDocByPath, getAccent, computeTint });
})();
