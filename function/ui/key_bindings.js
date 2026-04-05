(function () {
  const STORAGE_KEY = 'user_key_bindings';
  const KEY_SETTINGS_BUTTON_ID = 'key-settings-button';
  
  // Actions Definition
  const ACTIONS = {
      'expand_all_terms': { label: 'Expand All Terms', default: null, btnId: 'key-bind-expand-all' },
      // default: { key: 'Control' } means the key 'Control' itself.
      'inspect_details': { label: 'Inspect Details (Hold)', default: { key: 'Control' }, btnId: 'key-bind-inspect' },
      'toggle_theme': { label: 'Toggle Theme', default: { key: 't' }, btnId: 'key-bind-toggle-theme' }
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

    // Backspace: Clear binding (not assigned)
    if (e.key === 'Backspace') {
      delete bindings[recordingAction];
      saveBindings();
      stopRecording();
      return;
    }
    
    // Escape: Reset to default
    if (e.key === 'Escape') {
      delete bindings[recordingAction]; // Remove custom, will use default
      saveBindings();
      stopRecording();
      return;
    }

    const binding = {
      key: e.key
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

      if (targetKey === 'alt') return e.altKey;
      if (targetKey === 'control') return e.ctrlKey;
      if (targetKey === 'shift') return e.shiftKey;
      if (targetKey === 'meta') return e.metaKey;

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
  }

  function init() {
    loadBindings();

    const setupUI = () => {
      // === Key Settings Modal ===
      const keySettingsBtn = document.getElementById(KEY_SETTINGS_BUTTON_ID);
      if (keySettingsBtn) {
        keySettingsBtn.addEventListener('click', () => {
          var OV = window.CardUI?.Manager?.Controllers?.overlay;
          if (OV) {
            OV.open('key-settings-modal');
          }
          updateUI();
        });
      }

      // Bind record buttons
      Object.keys(ACTIONS).forEach(action => {
          const conf = ACTIONS[action];
          const btn = document.getElementById(conf.btnId);
          if (btn) {
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
      if (checkBinding(e, 'toggle_theme')) {
        e.preventDefault();
        if (window.ThemeToggle?.toggle) window.ThemeToggle.toggle();
      }
    });
  }
  
  // Expose API
  window.KeySettings = {
      isActionActive,
      checkBinding,
      ACTIONS
  };

  init();
})();
