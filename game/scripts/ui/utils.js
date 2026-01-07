(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // Helper: Hex to RGBA
    function hexToRgba(hex, alpha) {
        let c;
        if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
            c= hex.substring(1).split('');
            if(c.length== 3){
                c= [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c= '0x'+c.join('');
            return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','+alpha+')';
        }
        return hex;
    }

    // Helper: Get Adaptive Color
    function getAdaptiveColor(color) {
        if (!color) return null;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (!isDark && window.ColorUtils && typeof window.ColorUtils.invertColor === 'function') {
            try {
                return window.ColorUtils.invertColor(color, { mode: 'luma', output: 'auto' });
            } catch (e) {
                return color;
            }
        }
        return color;
    }

    window.Game.UI.hexToRgba = hexToRgba;
    window.Game.UI.getAdaptiveColor = getAdaptiveColor;
})();