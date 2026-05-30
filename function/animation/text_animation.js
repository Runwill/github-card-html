    const TEXT_SELECTOR = 'h1, h2, h3, .indent, padding, .panel-enter-target';

    function elements(scope, selector) {
        return Array.from((scope || document).querySelectorAll(selector));
    }

    function assignAnimationIndexes(scope) {
        elements(scope, TEXT_SELECTOR).forEach((element, index) => {
            element.style.setProperty('--index', index);
        });
    }

    function startAnimations(scope) {
        elements(scope, TEXT_SELECTOR).forEach(element => {
            element.classList.add('animate-in');
            element.addEventListener('animationend', () => {
                element.classList.add('animate-done');
            }, { once: true });
        });
    }

    function replayAnimations(panel) {
        if (!panel) return;
        const targets = elements(panel, TEXT_SELECTOR);
        if (!targets.length) return;

        targets.forEach(element => element.classList.remove('animate-in', 'animate-done', 'visible'));
        void panel.offsetWidth;

        assignAnimationIndexes(panel);
        startAnimations(panel);
    }

    function listenTabSwitch() {
        const hook = () => {
            document.querySelectorAll('#main-tabs a[href^="#panel_"]').forEach(link => {
                link.addEventListener('click', () => {
                    const panel = document.querySelector(link.getAttribute('href') || '');
                    if (panel && !panel.classList.contains('is-active')) {
                        requestAnimationFrame(() => replayAnimations(panel));
                    }
                }, { passive: true });
            });
        };
        if (window.partialsReady?.then) {
            window.partialsReady.then(hook).catch(hook);
        } else {
            hook();
        }
    }

    function init() {
        window.textAnimationController = {
            startAnimations: () => startAnimations(document),
            replayAnimations
        };
        assignAnimationIndexes(document);
        document.body.classList.add('loaded');
        listenTabSwitch();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
