window.add_button_wave = function add_button_wave() {
    if (document.__waveButtonBound) return;
    document.__waveButtonBound = true;
    document.addEventListener('click', (event) => {
        const button = event.target.closest('.ripple-button');
        if (button && document.documentElement.dataset.theme !== 'elegant') createRipple(event, button);
    }, true);
};

function createRipple(event, button) {
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const distance = (a, b) => a * a + b * b;
    const radius = Math.sqrt(Math.max(
        distance(x, y),
        distance(rect.width - x, y),
        distance(x, rect.height - y),
        distance(rect.width - x, rect.height - y)
    ));

    const ripple = document.createElement('span');
    ripple.className = 'wave-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.style.width = `${radius * 2}px`;
    ripple.style.height = `${radius * 2}px`;
    ripple.style.background = getRippleColor(window.getComputedStyle(button));
    button.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    setTimeout(() => ripple.remove(), 400);
}

function getRippleColor(computedStyle) {
    const bg = computedStyle.backgroundColor;
    const rgb = bg.match(/\d+/g);
    if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') {
        const textRgb = computedStyle.color.match(/\d+/g);
        return textRgb && textRgb.length >= 3 ? `rgba(${textRgb[0]}, ${textRgb[1]}, ${textRgb[2]}, 0.2)` : 'rgba(255, 255, 255, 0.2)';
    }
    const brightness = rgb && rgb.length >= 3 ? (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000 : 128;
    return brightness > 128 ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.3)';
}
