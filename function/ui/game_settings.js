(function () {
  const STORAGE_KEY_SPEED = 'card_game_speed_setting';
  const STORAGE_KEY_INERTIA = 'card_game_inertia_setting';
  const GAME_SETTINGS_BUTTON_ID = 'game-settings-button';
  
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

  function init() {
    const setupUI = () => {
      // === Game Settings Modal ===
      const gameSettingsBtn = document.getElementById(GAME_SETTINGS_BUTTON_ID);
      if (gameSettingsBtn) {
        gameSettingsBtn.addEventListener('click', () => {
          var OV = window.CardUI?.Manager?.Controllers?.overlay;
          if (OV) {
            OV.open('game-settings-modal');
          }
          initGameSettingsUI();
        });
      }

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
  }
  
  // Expose API + backward compat (was on window.KeySettings)
  window.GameSettings = {
      load: loadGameSettings,
      initUI: initGameSettingsUI
  };
  window.KeySettings = window.KeySettings || {};
  window.KeySettings.loadGameSettings = loadGameSettings;

  init();
})();
