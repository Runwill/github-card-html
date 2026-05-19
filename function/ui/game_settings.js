(function () {
  const STORAGE_KEY_SPEED = 'card_game_speed_setting';
  const STORAGE_KEY_INERTIA = 'card_game_inertia_setting';
  const GAME_SETTINGS_BUTTON_ID = 'game-settings-button';
  
  // 惯性选项配置（轻左重右）
  const INERTIA_OPTIONS = [
    { value: 1.0, labelKey: 'gameSettings.inertia.instant' },
    { value: 0.8, labelKey: 'gameSettings.inertia.veryLight' },
    { value: 0.5, labelKey: 'gameSettings.inertia.light' },
    { value: 0.25, labelKey: 'gameSettings.inertia.medium' },
    { value: 0.15, labelKey: 'gameSettings.inertia.heavy' },
    { value: 0.1, labelKey: 'gameSettings.inertia.veryHeavy' }
  ];
  
  const DEFAULT_SPEED = 0;
  const DEFAULT_INERTIA_INDEX = 3; // 默认中等
  let currentInertiaIndex = DEFAULT_INERTIA_INDEX;
  const $ = id => document.getElementById(id);

  function optionLabel(opt) {
    return String(window.i18n.t(opt.labelKey)).replace(/^\s*[\d.]+\s*-\s*/, '');
  }

  function bindControl(id, event, handler) { const el = $(id); if (el) el['on' + event] = handler; }

  // 应用速度值到 UI + 存储 + 控制器
  function applySpeed(val) {
    const range = $('game-speed-range');
    const display = $('game-speed-val');
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
    const inertiaValue = $('inertia-value');
    const inertiaPrev = $('inertia-prev');
    const inertiaNext = $('inertia-next');
    if (inertiaValue && INERTIA_OPTIONS[currentInertiaIndex]) {
      inertiaValue.textContent = optionLabel(INERTIA_OPTIONS[currentInertiaIndex]);
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

    bindControl('game-speed-range', 'input', (e) => applySpeed(parseInt(e.target.value, 10)));

    // === Inertia Arrow Selector ===
    loadInertiaIndex();
    updateInertiaDisplay();

    bindControl('inertia-prev', 'click', () => {
      if (currentInertiaIndex > 0) { currentInertiaIndex--; saveAndApplyInertia(); }
    });
    bindControl('inertia-next', 'click', () => {
      if (currentInertiaIndex < INERTIA_OPTIONS.length - 1) { currentInertiaIndex++; saveAndApplyInertia(); }
    });

    // === Reset Button ===
    bindControl('game-settings-reset', 'click', () => {
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
      const gameSettingsBtn = $(GAME_SETTINGS_BUTTON_ID);
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
  
  window.KeySettings = window.KeySettings || {};
  window.KeySettings.loadGameSettings = loadGameSettings;

  init();
})();
