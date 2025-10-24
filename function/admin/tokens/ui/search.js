(function () {
  // tokens/ui/search
  // 搜索与刷新、缩略开关（放在搜索框旁）

  const T = window.tokensAdmin;
  const { state, SEARCH_DELAY_MS } = T;

  function setupSearch() {
    try {
      const input = document.getElementById('tokens-search');
      const btn = document.getElementById('tokens-refresh-btn');

      // 刷新按钮
      if (btn && !btn.__bound) {
        btn.__bound = true;
        btn.addEventListener('click', () => window.tokensRefresh && window.tokensRefresh());
      }

      // 缩略模式切换，嵌入刷新按钮旁
      try {
        const parent = btn && btn.parentElement ? btn.parentElement : null;
        if (parent && !document.getElementById('tokens-compact-toggle')) {
          const tgl = document.createElement('button');
          tgl.id = 'tokens-compact-toggle';
          try { tgl.className = btn.className || 'btn btn--secondary'; } catch (_) { tgl.className = 'btn btn--secondary'; }
          tgl.type = 'button';
          // i18n: 标题通过 data-i18n-attr 绑定
          try {
            tgl.setAttribute('data-i18n-attr', 'title');
            tgl.setAttribute('data-i18n-title', 'tokens.mode.toggle.title');
          } catch(_){}

          const sync = () => {
            try {
              const key = state.compactMode ? 'tokens.mode.compact' : 'tokens.mode.detail';
              tgl.setAttribute('data-i18n', key);
              window.i18n && window.i18n.apply && window.i18n.apply(tgl);
            } catch {
              // 兜底中文
              tgl.textContent = state.compactMode ? '缩略' : '详细';
            }
            tgl.setAttribute('aria-pressed', state.compactMode ? 'true' : 'false');
            tgl.classList.toggle('is-active', !!state.compactMode);
          };

          tgl.addEventListener('click', () => {
            state.compactMode = !state.compactMode;
            sync();
            if (window.renderTokensDashboard) window.renderTokensDashboard(false);
          });

          sync();

          if (btn.nextSibling) parent.insertBefore(tgl, btn.nextSibling);
          else parent.appendChild(tgl);
        }
      } catch (_) {}

      // 搜索防抖
      if (!input || input.__bound) return;
      input.__bound = true;

      const onChange = () => {
        clearTimeout(state.timer);
        state.timer = setTimeout(() => {
          const text = (input.value || '');
          if (text === state.q) return;
          const trimmed = (text || '').trim();
          try {
            if (trimmed) {
              if (!state.searchBackupOpenTypes) {
                state.searchBackupOpenTypes = new Set(state.openTypes ? Array.from(state.openTypes) : []);
              }
              state.openTypes = new Set(['term-fixed', 'term-dynamic', 'card', 'character', 'skill']);
            } else {
              if (state.searchBackupOpenTypes) {
                state.openTypes = new Set(Array.from(state.searchBackupOpenTypes));
                state.searchBackupOpenTypes = null;
              }
            }
          } catch (_) {}
          state.q = text;
          if (window.renderTokensDashboard) window.renderTokensDashboard(false);
        }, SEARCH_DELAY_MS);
      };

      input.addEventListener('input', onChange);
    } catch (_) {}
  }

  Object.assign(window.tokensAdmin, { setupSearch });
})();
