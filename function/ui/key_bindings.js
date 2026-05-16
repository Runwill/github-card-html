(function () {
  const STORAGE_KEY = 'user_key_bindings';
  const KEY_SETTINGS_BUTTON_ID = 'key-settings-button';
  
  // Actions Definition
    const ACTIONS = Object.assign({
      'inspect_details': { label: 'Inspect Details (Toggle)', default: { key: 'Control' }, btnId: 'key-bind-inspect' },
      'expand_all_terms': { label: 'Expand All Terms', default: null, btnId: 'key-bind-expand-all' },
      'toggle_theme': { label: 'Toggle Theme', default: { key: 'T' }, btnId: 'key-bind-toggle-theme' }
    }, window.CardEditorKeyActions || {});

  let bindings = {};
  let isRecording = false;
  let recordingAction = null;

  function loadBindings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        bindings = JSON.parse(saved);
      }
      if (Object.prototype.hasOwnProperty.call(bindings, 'toggle_theme') && bindings.toggle_theme === null) {
        delete bindings.toggle_theme;
        saveBindings();
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
      if (Object.prototype.hasOwnProperty.call(bindings, action)) return bindings[action];
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

  function setupCategoryTabs() {
    const modal = document.getElementById('key-settings-modal');
    if (!modal) return;
    const tabs = Array.from(modal.querySelectorAll('[data-key-settings-category]'));
    const panes = Array.from(modal.querySelectorAll('[data-key-settings-pane]'));
    if (!tabs.length || !panes.length) return;

    const activateCategory = (category, shouldFocus) => {
      tabs.forEach(tab => {
        const active = tab.dataset.keySettingsCategory === category;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.setAttribute('tabindex', active ? '0' : '-1');
        if (active && shouldFocus) tab.focus();
      });
      panes.forEach(pane => {
        const active = pane.dataset.keySettingsPane === category;
        pane.classList.toggle('is-active', active);
        pane.hidden = !active;
      });
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => activateCategory(tab.dataset.keySettingsCategory, false));
      tab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
        if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        activateCategory(tabs[nextIndex].dataset.keySettingsCategory, true);
      });
    });

    const initial = tabs.find(tab => tab.classList.contains('is-active')) || tabs[0];
    activateCategory(initial.dataset.keySettingsCategory, false);
  }

  function handleRecord(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!recordingAction) return;

    // Backspace: Clear binding (not assigned)
    if (e.key === 'Backspace') {
      bindings[recordingAction] = null;
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

      setupCategoryTabs();

      // Bind record buttons
      Object.keys(ACTIONS).forEach(action => {
          const conf = ACTIONS[action];
          const btn = document.getElementById(conf.btnId);
          if (btn && !btn.__keyBindingBound) {
            btn.__keyBindingBound = true;
            btn.addEventListener('click', (e) => {
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
      checkBinding,
      getBinding,
      getBindingText,
      ACTIONS
  };

  init();
})();
