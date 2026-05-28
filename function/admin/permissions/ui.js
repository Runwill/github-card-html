import { elem as makeEl } from '../log_utils.js?v=202605230600';

const w = window;
  const ns = w.TokensPerm = w.TokensPerm || {};

  function bindPermTooltip(el, permName){
    try {
      if (!el) return;
      const specializedKey = 'perm.tooltip.' + String(permName);
      let keyForAttr = specializedKey;
      let params = null;
      try {
        const lang = (w.i18n && w.i18n.getLang && w.i18n.getLang()) || 'zh';
        const resolved = w.t ? w.t(specializedKey) : specializedKey;
        if (lang !== 'debug' && resolved === specializedKey) {
          keyForAttr = 'perm.tooltip.prefix';
          params = { name: String(permName) };
        }
      } catch(_) {
        keyForAttr = 'perm.tooltip.prefix';
        params = { name: String(permName) };
      }
      el.setAttribute('data-i18n-attr', 'data-tooltip');
      el.setAttribute('data-i18n-data-tooltip', keyForAttr);
      if (params) el.setAttribute('data-i18n-params-data-tooltip', JSON.stringify(params)); else el.removeAttribute('data-i18n-params-data-tooltip');
      try { el.setAttribute('data-tooltip', w.t ? w.t(keyForAttr, params) : (params ? (params.name||'') : keyForAttr)); } catch(_){ }
    } catch(_){ }
  }

  function tag(text, more=false, tip){
    const s = makeEl('span', 'perm-tag' + (more ? ' perm-tag--more' : ''), text);
    const tooltip = (tip || text);
    try { s.setAttribute('data-tooltip', tooltip); } catch { s.title = tooltip; }
    return s;
  }

  function spinnerBtn(btn, spinning){ if (!btn) return; btn.disabled=!!spinning; btn.classList.toggle('is-loading', !!spinning); }

  function toggleSection(panel, open){
    if (!panel) return;
    const DURATION = 220;
    const FALLBACK = DURATION + 160;
    const TRANSITION = 'height 220ms ease, opacity 150ms ease, transform 220ms ease';
    if (panel.__animating) return;
    const isHidden = (panel.style.display === 'none') || panel.classList.contains('is-collapsed');
    const shouldOpen = (open == null) ? isHidden : !!open;
    if (shouldOpen && !isHidden) return;
    if (!shouldOpen && isHidden) return;
    panel.__animating = true;

    if (shouldOpen){
      panel.style.display = 'block';
      const prevTransition = panel.style.transition;
      panel.style.transition = 'none';
      const prevVisibility = panel.style.visibility;
      const prevPointer = panel.style.pointerEvents;
      panel.style.visibility = 'hidden';
      panel.style.pointerEvents = 'none';
      panel.classList.remove('is-collapsed');
      panel.style.height = 'auto';
      let target = panel.getBoundingClientRect().height;

      // 还原到起始收起状态
      panel.classList.add('is-collapsed');
      panel.style.height = '0px';
      panel.style.opacity = '0';
      panel.style.visibility = prevVisibility || '';
      panel.style.pointerEvents = prevPointer || '';
      void panel.offsetHeight;

      // 若无法测得高度，直接无动画展开，避免卡死
      if (!target || target <= 0) {
        panel.classList.remove('is-collapsed');
        panel.style.transition = prevTransition || '';
        panel.style.height = '';
        panel.style.opacity = '';
        panel.__animating = false;
        return;
      }

      requestAnimationFrame(()=>{
        panel.style.transition = TRANSITION;
        panel.classList.remove('is-collapsed');
        panel.style.height = target + 'px';
        panel.style.opacity = '1';
        const done = ()=>{
          panel.style.transition = prevTransition || '';
          panel.style.height = '';
          panel.style.opacity = '';
          panel.__animating = false;
        };
        w.CollapsibleAnim.onTransitionEnd(panel, done, FALLBACK, e => e.target === panel && e.propertyName === 'height');
      });
    } else {
      const start = panel.getBoundingClientRect().height || panel.scrollHeight;
      panel.style.height = start + 'px';
      panel.style.opacity = '1';
      void panel.offsetHeight;
      panel.style.transition = TRANSITION;
      panel.style.height = '0px';
      panel.style.opacity = '0';
      panel.classList.add('is-collapsed');
      const done = ()=>{
        panel.style.transition = '';
        panel.style.height = '';
        panel.style.opacity = '';
        panel.style.display = 'none';
        panel.__animating = false;
      };
      w.CollapsibleAnim.onTransitionEnd(panel, done, FALLBACK, e => e.target === panel && e.propertyName === 'height');
    }
  }

  ns.UI = { bindPermTooltip, makeEl, tag, spinnerBtn, toggleSection };
