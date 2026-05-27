/** CustomSelect 文字自适应 — 选项溢出时统一缩小字号。由 custom_select.js 调用。 */
    var MIN_SIZE = 9; // px minimum

    /** Measure text width using a temporary canvas (cached). */
    var _measureCanvas = null;
    function measureTextWidth(text, fontSize, fontFamily, fontWeight) {
        if (!_measureCanvas) _measureCanvas = document.createElement('canvas').getContext('2d');
        _measureCanvas.font = (fontWeight || '') + ' ' + fontSize + 'px ' + (fontFamily || 'sans-serif');
        return _measureCanvas.measureText(text).width;
    }

    /**
     * Auto-shrink font-size on dropdown option items that overflow.
     * Two-pass: first binary-search the smallest needed size (0.1px precision),
     * then apply it to ALL options for uniformity.
     *
     * padding 若为 em 单位会随字号同步缩小，算法通过 padRatio 模拟；
     * 若为 px 则 padRatio 仅在 origSize 时准确，缩小后略偏乐观，
     * TOLERANCE 补偿 canvas 测量与 DOM 的误差以及该偏差。
     *
      * @param {HTMLElement} dropdown  - The dropdown container element
      * @param {string}      openClass - CSS class indicating the dropdown is open
      * @param {HTMLElement} owner     - Optional owner wrapper when dropdown is portaled
     */
    function fitOptionTexts(dropdown, openClass, owner) {
        var items = Array.from(dropdown.children);
        if (!items.length) return;

        // Temporarily show dropdown off-screen for measurement
        var wasOpen = dropdown.classList.contains(openClass) ||
            (owner && owner.classList && owner.classList.contains(openClass)) ||
            (dropdown.parentElement && dropdown.parentElement.classList.contains(openClass));
        var previousStyle = null;
        if (!wasOpen) {
            previousStyle = {
                opacity: dropdown.style.opacity,
                visibility: dropdown.style.visibility,
                display: dropdown.style.display,
                position: dropdown.style.position,
                pointerEvents: dropdown.style.pointerEvents
            };
            dropdown.style.opacity = '0';
            dropdown.style.visibility = 'hidden';
            dropdown.style.display = 'block';
            dropdown.style.position = 'absolute';
            dropdown.style.pointerEvents = 'none';
        }

        var dropStyle = getComputedStyle(dropdown);
        var dropPadL = parseFloat(dropStyle.paddingLeft) || 0;
        var dropPadR = parseFloat(dropStyle.paddingRight) || 0;
        var contentW = dropdown.clientWidth - dropPadL - dropPadR;
        if (contentW <= 0) { _cleanup(); return; }

        var TOLERANCE = 1;           // px — canvas/DOM 误差余量
        var PRECISION = 0.1;         // px — 二分搜索精度
        var MAX_ITER  = 20;          // 最多迭代次数

        // Pass 1: binary-search the smallest needed font-size
        var globalMin = Infinity;
        items.forEach(function (item) {
            item.style.fontSize = '';
            item.style.whiteSpace = 'nowrap';
            var style = getComputedStyle(item);
            var origSize = parseFloat(style.fontSize);
            var padH = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
            var mrgH = (parseFloat(style.marginLeft) || 0) + (parseFloat(style.marginRight) || 0);
            var availW = contentW - mrgH - TOLERANCE;

            var textW = measureTextWidth(item.textContent, origSize, style.fontFamily, style.fontWeight);
            if (textW + padH <= availW) {
                if (origSize < globalMin) globalMin = origSize;
                return;
            }

            // Binary search: largest font-size where text + padding <= availW
            var lo = MIN_SIZE, hi = origSize;
            for (var i = 0; i < MAX_ITER && hi - lo > PRECISION; i++) {
                var mid = (lo + hi) / 2;
                var w = measureTextWidth(item.textContent, mid, style.fontFamily, style.fontWeight) + padH;
                if (w <= availW) lo = mid;
                else hi = mid;
            }
            if (lo < globalMin) globalMin = lo;
        });

        // Pass 2: apply uniform size (rounded to 0.1px)
        if (globalMin < Infinity) {
            var rounded = Math.round(globalMin * 10) / 10;
            items.forEach(function (item) {
                item.style.fontSize = rounded + 'px';
            });
        }
        _cleanup();

        function _cleanup() {
            if (!previousStyle) return;
            dropdown.style.opacity = previousStyle.opacity;
            dropdown.style.visibility = previousStyle.visibility;
            dropdown.style.display = previousStyle.display;
            dropdown.style.position = previousStyle.position;
            dropdown.style.pointerEvents = previousStyle.pointerEvents;
        }
    }

    window._CustomSelectFit = { fitOptionTexts: fitOptionTexts, measureTextWidth: measureTextWidth };
