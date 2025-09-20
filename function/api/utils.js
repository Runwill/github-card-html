// 轻量通用工具，避免与现有全局冲突：仅在未定义时挂载到 window。
;(function () {
  if (typeof window === 'undefined') return

  if (!window.getEndpointUrl) {
    window.getEndpointUrl = function (key, fallback) {
      try {
        return window.endpoints && typeof window.endpoints[key] === 'function'
          ? window.endpoints[key]()
          : fallback
      } catch (e) {
        return fallback
      }
    }
  }

  if (!window.fetchJSON) {
    window.fetchJSON = function (url, fallbackOnError = []) {
      return new Promise((resolve) => {
        $.ajax({ url, type: 'GET', dataType: 'json' })
          .done((data) => resolve(data))
          .fail(() => resolve(fallbackOnError))
      })
    }
  }
})()
