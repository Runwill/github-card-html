import { elem as makeEl } from '../log_utils.js?v=202607072241';

const w = window;
  const ns = w.TokensPerm = w.TokensPerm || {};

  function bindPermTooltip(el){
    return el;
  }

  function tag(text, more=false){
    const s = makeEl('span', 'perm-tag' + (more ? ' perm-tag--more' : ''), text);
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
