(function () {
  // tokens/state
  // 全局状态容器与常量

  window.tokensAdmin = window.tokensAdmin || {};

  const state = {
    data: null,
    q: '',
    timer: null,
    activeType: null,
    openTypes: new Set(),
    compactMode: false,
  };

  const SEARCH_DELAY_MS = 350;

  window.tokensAdmin.state = state;
  window.tokensAdmin.SEARCH_DELAY_MS = SEARCH_DELAY_MS;
})();
