(function () {
  const STORAGE_KEY = 'user_key_bindings';
  const BUTTON_ID = 'key-settings-button';
  
  // Actions Definition
  const ACTIONS = {
      'expand_all_terms': { label: 'Expand All Terms', default: null, btnId: 'key-bind-expand-all' },
      // default: { key: 'Control' } means the key 'Control' itself.
      'inspect_details': { label: 'Inspect Details (Hold)', default: { key: 'Control' }, btnId: 'key-bind-inspect' }
  };

  let bindings = {};
  let isRecording = false;
  let recordingAction = null;

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
    // Dispatch event for other modules
    try {
        window.dispatchEvent(new CustomEvent('keybindings-changed'));
    } catch(e) {}
  }

  function getBinding(action) {
      if (bindings[action]) return bindings[action];
      return ACTIONS[action] ? ACTIONS[action].default : null;
  }

  function getBindingText(action) {
    const bind = getBinding(action);
    if (!bind) return window.i18n ? window.i18n.t('keySettings.notSet') : 'Not Set';
    return bind.key.toUpperCase();
  }

  function updateUI() {
    Object.keys(ACTIONS).forEach(action => {
        const conf = ACTIONS[action];
        const btn = document.getElementById(conf.btnId);
        if (btn) {
            btn.textContent = getBindingText(action);
            btn.classList.remove('btn--primary');
        }
    });
  }

  function handleRecord(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!recordingAction) return;

    // Clear binding on Escape/Backspace
    if (e.key === 'Escape' || e.key === 'Backspace') {
      delete bindings[recordingAction];
      saveBindings();
      stopRecording();
      return;
    }

    // We allow modifier keys to be bound directly for 'inspect_details'.
    // e.key for Alt is "Alt", for Control is "Control".
    const binding = {
      key: e.key
      // Note: We are not storing ctrlKey/altKey state flags, just the primary key pressed.
      // This is a simplified "Single Key" binding system.
    };

    bindings[recordingAction] = binding;
    saveBindings();
    stopRecording();
  }

  function startRecording(action) {
    isRecording = true;
    recordingAction = action;
    
    const conf = ACTIONS[action];
    const btn = document.getElementById(conf.btnId);
    if (btn) {
      btn.textContent = window.i18n ? window.i18n.t('keySettings.pressKey') : 'Press key...';
      btn.classList.add('btn--primary');
    }
    
    document.addEventListener('keydown', handleRecord, { capture: true, once: true });
    document.addEventListener('mousedown', cancelRecording, { capture: true, once: true });
  }

  function stopRecording() {
    isRecording = false;
    recordingAction = null;
    
    document.removeEventListener('keydown', handleRecord, { capture: true });
    document.removeEventListener('mousedown', cancelRecording, { capture: true });
    updateUI(); 
  }

  function cancelRecording(e) {
    // If clicking the button itself, let the click handler handle it (stop vs start)
    if (recordingAction) {
        const conf = ACTIONS[recordingAction];
        if (e.target.id === conf.btnId) return;
    }
    stopRecording();
  }

  /**
   * Check if the event matches the binding for the given action.
   * Useful for 'trigger' actions (keydown).
   */
  function checkBinding(e, action) {
    const bind = getBinding(action);
    if (!bind) return false;
    
    if (!(e instanceof KeyboardEvent)) return false;

    // Strict matching for trigger: The key pressed MUST be the bound key.
    return e.key.toLowerCase() === bind.key.toLowerCase();
  }
  
  /**
   * Check if the action is currently "active" (held down).
   * Useful for state checks (is specific key held?).
   * Supports both KeyboardEvent (is this the key?) and MouseEvent (is the modifier held?).
   */
  function isActionActive(e, action) {
      const bind = getBinding(action);
      if (!bind) return false;

      const targetKey = bind.key.toLowerCase();

      // IF the bound key IS a modifier (Alt, Control, Shift, Meta),
      // we can check the modifier flags on ANY event (Mouse or Keyboard).
      if (targetKey === 'alt') return e.altKey;
      if (targetKey === 'control') return e.ctrlKey;
      if (targetKey === 'shift') return e.shiftKey;
      if (targetKey === 'meta') return e.metaKey;

      // If it's a regular key (e.g. "Space" or "A"), we can only check it if
      // 1. This is a KeyboardEvent and e.key matches.
      // 2. We don't really know if "A" is held during a MouseEvent without tracking global state.
      //    For now, we only support modifier keys for MouseEvent checks.
      if (e instanceof KeyboardEvent) {
          return e.key.toLowerCase() === targetKey;
      }

      return false;
  }

  function expandAllTerms() {
    const panel = document.getElementById('panel_term');
    if (!panel) return;
    const toggles = panel.querySelectorAll('.collapsible__toggle.is-collapsed');
    toggles.forEach(btn => btn.click());
    if(toggles.length > 0) console.log(`Expanded ${toggles.length} terms.`);
  }

  function init() {
    loadBindings();

    const setupUI = () => {
      const openBtn = document.getElementById(BUTTON_ID);
      if (openBtn) {
        openBtn.addEventListener('click', () => {
          if (window.CardUI?.Manager?.Controllers?.modal) {
            window.CardUI.Manager.Controllers.modal.showModal('key-settings-modal');
          } else {
             // Fallback
             const modal = document.getElementById('key-settings-modal');
             const backdrop = document.getElementById('modal-backdrop');
             if(modal && backdrop) {
                 backdrop.classList.add('show');
                 modal.classList.add('show');
                 modal.style.display = 'block';
                 backdrop.style.display = 'block';
             }
          }
          updateUI();
        });
      }
      
      // Close logic for fallback
      const backdrop = document.getElementById('modal-backdrop');
      if (backdrop) {
            backdrop.addEventListener('click', () => {
                const modal = document.getElementById('key-settings-modal');
                if (modal && modal.style.display === 'block' && !window.CardUI?.Manager?.Controllers?.modal) {
                    modal.classList.remove('show');
                    backdrop.classList.remove('show');
                    setTimeout(() => {
                        modal.style.display = 'none';
                        backdrop.style.display = 'none';
                    }, 300);
                }
            });
      }

      // Bind record buttons
      Object.keys(ACTIONS).forEach(action => {
          const conf = ACTIONS[action];
          const btn = document.getElementById(conf.btnId);
          if (btn) {
              // Clone to remove old listeners
              const newBtn = btn.cloneNode(true);
              btn.parentNode.replaceChild(newBtn, btn);
              
              newBtn.addEventListener('click', (e) => {
                  e.stopPropagation();
                  if (isRecording && recordingAction === action) {
                      stopRecording();
                  } else {
                      if (isRecording) stopRecording();
                      startRecording(action);
                  }
              });
          }
      });
    };

    if (window.partialsReady) {
      window.partialsReady.then(setupUI);
    } else if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setupUI);
    } else {
      setupUI();
    }

    // Global Key Listener
    document.addEventListener('keydown', (e) => {
      if (isRecording) return; 
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      if (checkBinding(e, 'expand_all_terms')) {
        e.preventDefault();
        expandAllTerms();
      }
    });
  }
  
  // Expose API
  window.KeySettings = {
      isActionActive,
      checkBinding, // Expose for triggers
      ACTIONS
  };

  init();
})();
