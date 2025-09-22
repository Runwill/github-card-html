// 技能行复制：Ctrl 显示按钮 + 一键复制本行
(function(){
  // 权限白名单：仅审核员/管理员可用；与后端一致（admin, moderator）。
  // 可通过 window.skillCopyAllowedRoles = ['admin','moderator'] 在外部覆盖。
  try {
    const roleRaw = (localStorage.getItem('role') || '').trim();
    const roleLc = roleRaw.toLowerCase();
  const external = Array.isArray(window.skillCopyAllowedRoles) ? window.skillCopyAllowedRoles : null;
  const baseList = external || ['admin','moderator'];
    const baseListLc = baseList.map(r => String(r).toLowerCase());
    const isAllowed = baseListLc.includes(roleLc) || baseList.includes(roleRaw);
    if (!isAllowed) { return; }
  } catch (_) { /* 容错：异常时默认禁用 */ return; }

  // 切换 Ctrl 状态类
  function setCtrlPressed(on){
    document.documentElement.classList.toggle('ctrl-pressed', !!on);
  }

  let ctrlDown = false;

  // 键盘监听：keydown/keyup
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Control' && !ctrlDown){
      ctrlDown = true;
      setCtrlPressed(true);
    }
  }, true);

  window.addEventListener('keyup', (e) => {
    if (e.key === 'Control'){
      ctrlDown = false;
      setCtrlPressed(false);
    }
  }, true);

  // 失去窗口焦点时重置，避免状态卡住
  window.addEventListener('blur', () => {
    ctrlDown = false;
    setCtrlPressed(false);
  });

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      toast('已复制');
    }catch{
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      toast('已复制');
    }
  }

  function toast(msg){
    if (window.tokensAdmin && typeof window.tokensAdmin.showToast === 'function') {
      return window.tokensAdmin.showToast(msg || '已复制'); // 复用词元页 Toast 风格
    }
    if (window.showToast) return window.showToast(msg || '已复制'); // 其它全局实现（若存在）
    // 简易回退
    console.log(msg || '已复制');
  }

  function collectTextFrom(el){
    // 克隆节点，移除复制按钮等不需要的元素，避免把“复制”两字带入
    const clone = el.cloneNode(true);
    clone.querySelectorAll('.skill-copy-btn').forEach(n => n.remove());
    const text = clone.innerText || clone.textContent || '';
    return text.replace(/\s*\n\s*\n+/g, '\n').trim();
  }

  // 事件代理：点击复制当前技能行
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.skill-copy-btn');
    if (!btn) return;
    const row = btn.closest('.skill-row');
    if (!row) return;

    // 复制时只采集该行的主要文本：
    // - skillQuote（包含技能名）
    // - 紧随其后的描述内容节点（s.content 渲染为内联文本/HTML）
    // 由于行内含其它按钮/图标，直接使用整行 innerText，并按空白压缩
    const text = collectTextFrom(row);
    await copyText(text);
  });
})();
