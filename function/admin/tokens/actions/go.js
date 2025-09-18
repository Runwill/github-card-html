(function () {
  // tokens/actions/go
  // “跳转”按钮：优先滚动到各面板目标，失败再回退到 .html 链接

  const T = window.tokensAdmin;

  function bindGo(rootEl) {
    if (rootEl.__goDocBound) return;
    rootEl.__goDocBound = true;

    rootEl.addEventListener('click', function (ev) {
      const btn = ev.target && ev.target.closest ? ev.target.closest('.btn-go-doc') : null;
      if (!btn) return;

      const card = btn.closest('.token-card[data-coll][data-id]');
      if (!card) return;

      const coll = card.getAttribute('data-coll');
      const id = card.getAttribute('data-id');
      const doc = T.findDocInState(coll, id) || {};

      // 1) 面板内定位（术语/牌/武将/技能）
      try {
        if (coll === 'term-fixed' || coll === 'term-dynamic') {
          const tag = (doc && typeof doc.en === 'string') ? doc.en : null;
          if (tag && window.scrollActions && typeof window.scrollActions.scrollToTagAndFlash === 'function') {
            window.scrollActions.scrollToTagAndFlash('panel_term', tag, { behavior: 'smooth', stop: true });
            return;
          }
        }

        if (coll === 'card') {
          const tagSel = (doc && typeof doc.en === 'string') ? (doc.en + '.scroll') : null;
          if (tagSel && window.scrollActions && typeof window.scrollActions.scrollToSelectorAndFlash === 'function') {
            window.scrollActions.scrollToSelectorAndFlash('panel_card', tagSel, { behavior: 'smooth', stop: true });
            return;
          }
        }

        if (coll === 'character') {
          const cls = (doc && (typeof doc.id === 'number' || typeof doc.id === 'string')) ? ('characterID' + String(doc.id)) : null;
          if (cls && window.scrollActions && typeof window.scrollActions.scrollToClassWithCenter === 'function') {
            window.scrollActions.scrollToClassWithCenter('panel_character', cls, '.container', { behavior: 'smooth', stop: true });
            return;
          }
        }

  if (coll === 'skill') {
          const skillClass = (doc && typeof doc.name === 'string') ? doc.name : null;
          if (skillClass && window.scrollActions && typeof window.scrollActions.scrollToClassAndFlash === 'function') {
            window.scrollActions.scrollToClassAndFlash('panel_skill', skillClass, { behavior: 'smooth', stop: true });
            return;
          }
        }
      } catch (_) {}

      // 2) 回退：打开 doc 中的 .html 链接
      const findHtml = (o) => {
        try {
          if (!o || typeof o !== 'object') return null;
          if (typeof o.html === 'string' && /\.html(\?|#|$)/i.test(o.html)) return o.html;
          const stack = [o];
          const seen = new Set();
          while (stack.length) {
            const cur = stack.pop();
            if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
            seen.add(cur);
            for (const k of Object.keys(cur)) {
              const v = cur[k];
              if (typeof v === 'string' && /\.html(\?|#|$)/i.test(v)) return v;
              if (v && typeof v === 'object') stack.push(v);
            }
          }
          return null;
        } catch (_) { return null; }
      };

      const hrefRaw = findHtml(doc);
      if (!hrefRaw) {
        try { if (window.showTokensToast) window.showTokensToast('未找到跳转目标'); } catch (_) {}
        return;
      }

      try {
        let url = String(hrefRaw).trim();
        if (!/^https?:\/\//i.test(url)) {
          if (url.startsWith('./') || url.startsWith('/')) {
            // keep
          } else if (/^[\w-]+\.html(\?|#|$)/i.test(url)) {
            url = './pages/' + url;
          }
        }
        window.open(url, '_blank');
      } catch (e) {
        alert(e.message || '无法打开链接');
      }
    });
  }

  Object.assign(window.tokensAdmin, { bindGo });
})();
