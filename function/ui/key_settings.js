(function () {
  const STORAGE_KEY = 'user_key_bindings';
  const BUTTON_ID = 'key-settings-button';
  const BIND_BTN_ID = 'key-bind-expand-all';
  const ACTION_EXPAND_ALL = 'expand_all_terms';

  let bindings = {};
  let isRecording = false;

  function loadBindings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        bindings = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load key bindings', e);
    }
  }

  function saveBindings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  }

  function getBindingText(action) {
    const bind = bindings[action];
    if (!bind) return window.i18n ? window.i18n.t('keySettings.notSet') : '未设置';
    
    // 仅显示按键名，不显示修饰键
    return bind.key.toUpperCase();
  }

  function updateUI() {
    const btn = document.getElementById(BIND_BTN_ID);
    if (btn) {
      btn.textContent = getBindingText(ACTION_EXPAND_ALL);
    }
  }

  function handleRecord(e) {
    e.preventDefault();
    e.stopPropagation();

    // 如果按下 Escape 或 Backspace，则清除绑定
    if (e.key === 'Escape' || e.key === 'Backspace') {
      delete bindings[ACTION_EXPAND_ALL];
      saveBindings();
      updateUI();
      stopRecording();
      return;
    }

    // 忽略单独的修饰键
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;

    // 仅记录按键，不记录修饰键状态
    const binding = {
      key: e.key,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      metaKey: false
    };

    bindings[ACTION_EXPAND_ALL] = binding;
    saveBindings();
    updateUI();
    stopRecording();
  }

  function startRecording() {
    isRecording = true;
    const btn = document.getElementById(BIND_BTN_ID);
    if (btn) {
      btn.textContent = window.i18n ? window.i18n.t('keySettings.pressKey') : '请按下按键...';
      btn.classList.add('btn--primary'); // 高亮
    }
    document.addEventListener('keydown', handleRecord, { capture: true, once: true });
    // 点击其他地方取消录制
    document.addEventListener('click', cancelRecording, { capture: true, once: true });
  }

  function stopRecording() {
    isRecording = false;
    const btn = document.getElementById(BIND_BTN_ID);
    if (btn) {
      btn.classList.remove('btn--primary');
    }
    document.removeEventListener('keydown', handleRecord, { capture: true });
    document.removeEventListener('click', cancelRecording, { capture: true });
    updateUI(); // 恢复显示（如果取消了）
  }

  function cancelRecording(e) {
    // 如果点击的是绑定按钮自己，不要取消（因为那是触发录制的事件）
    if (e.target.id === BIND_BTN_ID) return;
    stopRecording();
  }

  function checkBinding(e, action) {
    const bind = bindings[action];
    if (!bind) return false;
    
    // 严格检查：按键匹配，且所有修饰键都未按下
    return e.key.toLowerCase() === bind.key.toLowerCase() &&
           !e.ctrlKey &&
           !e.altKey &&
           !e.shiftKey &&
           !e.metaKey;
  }

  function expandAllTerms() {
    const panel = document.getElementById('panel_term');
    if (!panel) return;
    
    // 找到所有折叠的 toggle 按钮
    // 注意：collapsible.js 给收起的元素加了 .is-collapsed 类
    // 对应的按钮也有 .is-collapsed 类
    const toggles = panel.querySelectorAll('.collapsible__toggle.is-collapsed');
    if (toggles.length === 0) return;

    toggles.forEach(btn => {
      btn.click();
    });
    
    // 简单的提示
    console.log('Expanded ' + toggles.length + ' terms.');
  }

  function init() {
    loadBindings();

    const setupUI = () => {
      // 绑定打开弹窗按钮
      const openBtn = document.getElementById(BUTTON_ID);
      if (openBtn) {
        openBtn.addEventListener('click', () => {
          // 使用 CardUI 框架打开弹窗，以保证样式和行为一致
          if (window.CardUI && window.CardUI.Manager && window.CardUI.Manager.Controllers && window.CardUI.Manager.Controllers.modal) {
            window.CardUI.Manager.Controllers.modal.showModal('key-settings-modal');
          } else {
            // Fallback: 手动操作 DOM (仅当 CardUI 未加载时)
            console.warn('CardUI framework not found, using fallback modal logic');
            const sb = document.getElementById('sidebar-menu');
            if(sb) {
                sb.classList.remove('show');
                sb.style.display = 'none';
            }
            const sbb = document.getElementById('sidebar-backdrop');
            if(sbb) {
                sbb.classList.remove('show');
                sbb.style.display = 'none';
            }
            
            const modal = document.getElementById('key-settings-modal');
            const backdrop = document.getElementById('modal-backdrop');
            
            if(modal && backdrop) {
                backdrop.style.display = 'block';
                modal.style.display = 'block';
                // 强制重绘
                void backdrop.offsetWidth;
                void modal.offsetWidth;
                
                backdrop.classList.add('show');
                modal.classList.add('show');
            }
          }
          updateUI();
        });
      } else {
        console.warn('Key settings button not found');
      }

      // 绑定录制按钮
      const bindBtn = document.getElementById(BIND_BTN_ID);
      if (bindBtn) {
        bindBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // 防止触发 document click 取消
          if (isRecording) {
              stopRecording();
          } else {
              startRecording();
          }
        });
      }
    };

    // 等待 partials 加载完成
    if (window.partialsReady) {
      window.partialsReady.then(setupUI);
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupUI);
    } else {
      setupUI();
    }

    // 全局按键监听
    document.addEventListener('keydown', (e) => {
      if (isRecording) return; // 录制时由 handleRecord 处理
      
      // 如果在输入框中，不触发快捷键
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (checkBinding(e, ACTION_EXPAND_ALL)) {
        e.preventDefault();
        expandAllTerms();
      }
    });
    
    // 监听点击遮罩关闭弹窗 (如果是手动模式)
    const backdrop = document.getElementById('modal-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', () => {
            const modal = document.getElementById('key-settings-modal');
            if (modal && modal.style.display === 'block') {
                 if (window.CardUI && window.CardUI.Manager && window.CardUI.Manager.Controllers && window.CardUI.Manager.Controllers.modal) {
                    window.CardUI.Manager.Controllers.modal.hideModal('key-settings-modal');
                 } else {
                    modal.classList.remove('show');
                    backdrop.classList.remove('show');
                    setTimeout(() => {
                        modal.style.display = 'none';
                        backdrop.style.display = 'none';
                    }, 300);
                 }
            }
        });
    }
  }

  init();
})();
