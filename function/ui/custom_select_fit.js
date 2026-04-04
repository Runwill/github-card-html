/**
 * CustomSelect 文字自适应工具
 *
 * 在下拉选项文本溢出容器宽度时，自动统一缩小所有选项的字号。
 * 由 custom_select.js 在构建选项时调用。
 *
 * IIFE 模块，挂载到 window._CustomSelectFit
 */
;(function () {
    'use strict';

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
     * Two-pass: first find the smallest needed size, then apply it to ALL options
     * so they appear uniform.
     *
     * @param {HTMLElement} dropdown  - The dropdown container element
     * @param {string}      openClass - CSS class indicating the dropdown is open
     */
    function fitOptionTexts(dropdown, openClass) {
        var items = Array.from(dropdown.children);
        if (!items.length) return;

        // Temporarily show dropdown off-screen for measurement
        var wasOpen = dropdown.parentElement.classList.contains(openClass);
        if (!wasOpen) {
            dropdown.style.cssText = 'opacity:0;visibility:hidden;display:block;position:absolute;pointer-events:none;';
        }

        requestAnimationFrame(function () {
            // Get content width: subtract scrollbar and padding from dropdown
            var dropStyle = getComputedStyle(dropdown);
            var dropPadL = parseFloat(dropStyle.paddingLeft) || 0;
            var dropPadR = parseFloat(dropStyle.paddingRight) || 0;
            var contentW = dropdown.clientWidth - dropPadL - dropPadR;
            if (contentW <= 0) { _cleanup(); return; }

            // Pass 1: find the smallest font-size needed across all items
            var globalMin = Infinity;
            items.forEach(function (item) {
                item.style.fontSize = ''; // reset
                item.style.whiteSpace = 'nowrap';
                var style = getComputedStyle(item);
                var padH = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
                var mrgH = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
                var availW = contentW - mrgH;
                var curSize = parseFloat(style.fontSize);
                var textW = measureTextWidth(item.textContent, curSize, style.fontFamily, style.fontWeight);
                var w = textW + padH;
                while (w > availW && curSize > MIN_SIZE) {
                    curSize -= 0.5;
                    w = measureTextWidth(item.textContent, curSize, style.fontFamily, style.fontWeight) + padH;
                }
                if (curSize < globalMin) globalMin = curSize;
            });

            // Pass 2: apply the smallest size to ALL options for uniformity
            if (globalMin < Infinity) {
                items.forEach(function (item) {
                    item.style.fontSize = globalMin + 'px';
                });
            }
            _cleanup();
        });

        function _cleanup() {
            if (!wasOpen) dropdown.style.cssText = '';
        }
    }

    window._CustomSelectFit = { fitOptionTexts: fitOptionTexts, measureTextWidth: measureTextWidth };
})();
