(function () {
  const STORAGE_KEY = 'user_key_bindings';
  const STORAGE_KEY_SPEED = 'card_game_speed_setting';
  const STORAGE_KEY_INERTIA = 'card_game_inertia_setting';
  const KEY_SETTINGS_BUTTON_ID = 'key-settings-button';
  const GAME_SETTINGS_BUTTON_ID = 'game-settings-button';
  
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
      // === Key Settings Modal ===
      const keySettingsBtn = document.getElementById(KEY_SETTINGS_BUTTON_ID);
      if (keySettingsBtn) {
        keySettingsBtn.addEventListener('click', () => {
          // 导航栈会自动隐藏 settings-menu 并保留在栈中
          var OV = window.CardUI?.Manager?.Controllers?.overlay;
          if (OV) {
            OV.open('key-settings-modal');
          }
          updateUI();
        });
      }
      
      // === Game Settings Modal ===
      const gameSettingsBtn = document.getElementById(GAME_SETTINGS_BUTTON_ID);
      if (gameSettingsBtn) {
        gameSettingsBtn.addEventListener('click', () => {
          // 导航栈会自动隐藏 settings-menu 并保留在栈中
          var OV = window.CardUI?.Manager?.Controllers?.overlay;
          if (OV) {
            OV.open('game-settings-modal');
          }
          initGameSettingsUI();
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
      
      // Initialize game settings controls
      initGameSettingsUI();
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
  
  // === Game Settings Functions ===
  
  // 惯性选项配置（轻左重右）
  const INERTIA_OPTIONS = [
    { value: 1.0, label: '即时' },
    { value: 0.8, label: '灵敏' },
    { value: 0.5, label: '轻盈' },
    { value: 0.25, label: '中等' },
    { value: 0.15, label: '较重' },
    { value: 0.1, label: '非常重' }
  ];
  
  const DEFAULT_SPEED = 0;
  const DEFAULT_INERTIA_INDEX = 3; // 默认中等
  let currentInertiaIndex = DEFAULT_INERTIA_INDEX;

  // 替换元素并绑定新监听器（消除 cloneNode 样板）
  function rebind(id, event, handler) {
    const el = document.getElementById(id);
    if (!el) return null;
    const fresh = el.cloneNode(true);
    el.parentNode.replaceChild(fresh, el);
    fresh.addEventListener(event, handler);
    return fresh;
  }

  // 应用速度值到 UI + 存储 + 控制器
  function applySpeed(val) {
    const range = document.getElementById('game-speed-range');
    const display = document.getElementById('game-speed-val');
    if (range) range.value = val;
    if (display) display.textContent = `${val}ms`;
    localStorage.setItem(STORAGE_KEY_SPEED, val);
    if (window.Game?.Controller?.setSpeed) window.Game.Controller.setSpeed(val);
  }

  function applyInertiaConfig(lerpFactor) {
    if (window.Game?.UI?.DragConfig) {
      window.Game.UI.DragConfig.lerpFactor = lerpFactor;
      console.log(`[Settings] Drag Inertia set to ${lerpFactor}`);
    }
  }

  function saveAndApplyInertia() {
    updateInertiaDisplay();
    const opt = INERTIA_OPTIONS[currentInertiaIndex];
    if (opt) {
      localStorage.setItem(STORAGE_KEY_INERTIA, opt.value);
      applyInertiaConfig(opt.value);
    }
  }

  function updateInertiaDisplay() {
    const inertiaValue = document.getElementById('inertia-value');
    const inertiaPrev = document.getElementById('inertia-prev');
    const inertiaNext = document.getElementById('inertia-next');
    if (inertiaValue && INERTIA_OPTIONS[currentInertiaIndex]) {
      inertiaValue.textContent = INERTIA_OPTIONS[currentInertiaIndex].label;
    }
    if (inertiaPrev) inertiaPrev.disabled = currentInertiaIndex <= 0;
    if (inertiaNext) inertiaNext.disabled = currentInertiaIndex >= INERTIA_OPTIONS.length - 1;
  }

  function loadInertiaIndex() {
    const saved = localStorage.getItem(STORAGE_KEY_INERTIA);
    if (saved !== null) {
      const idx = INERTIA_OPTIONS.findIndex(opt => opt.value === parseFloat(saved));
      if (idx !== -1) currentInertiaIndex = idx;
    }
  }
  
  function initGameSettingsUI() {
    // === Speed Slider ===
    const savedSpeed = localStorage.getItem(STORAGE_KEY_SPEED);
    if (savedSpeed !== null) applySpeed(parseInt(savedSpeed, 10));

    rebind('game-speed-range', 'input', (e) => applySpeed(parseInt(e.target.value, 10)));

    // === Inertia Arrow Selector ===
    loadInertiaIndex();
    updateInertiaDisplay();

    rebind('inertia-prev', 'click', () => {
      if (currentInertiaIndex > 0) { currentInertiaIndex--; saveAndApplyInertia(); }
    });
    rebind('inertia-next', 'click', () => {
      if (currentInertiaIndex < INERTIA_OPTIONS.length - 1) { currentInertiaIndex++; saveAndApplyInertia(); }
    });

    // === Reset Button ===
    rebind('game-settings-reset', 'click', () => {
      applySpeed(DEFAULT_SPEED);
      currentInertiaIndex = DEFAULT_INERTIA_INDEX;
      saveAndApplyInertia();
    });
  }
  
  function loadGameSettings() {
    const savedSpeed = localStorage.getItem(STORAGE_KEY_SPEED);
    if (savedSpeed !== null) {
      const val = parseInt(savedSpeed, 10);
      if (!isNaN(val) && window.Game?.Controller?.setSpeed) window.Game.Controller.setSpeed(val);
    }
    const savedInertia = localStorage.getItem(STORAGE_KEY_INERTIA);
    if (savedInertia !== null) applyInertiaConfig(parseFloat(savedInertia));
  }
  
  // Expose API
  window.KeySettings = {
      isActionActive,
      checkBinding, // Expose for triggers
      ACTIONS,
      loadGameSettings // Expose for game to call on start
  };

  init();
})();
