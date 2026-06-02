    // 入场动画系统
    // CSS 只管 .panel-enter-target 一个选择器
    // JS 自动发现标准内容标签（h1/h2/h3/.indent/padding）并标记，也支持手动加 class

    const TARGET = '.panel-enter-target';
    const AUTO_TAGS = 'h1, h2, h3, .indent, padding';

    function panels() {
        return document.querySelectorAll('.tabs-panel');
    }

    function autoTag(panel) {
        panel.querySelectorAll(AUTO_TAGS).forEach(el => {
            if (!el.classList.contains('panel-enter-target')) el.classList.add('panel-enter-target');
        });
    }

    function assignIndexes(panel) {
        autoTag(panel);
        const all = Array.from(panel.querySelectorAll(TARGET));
        // 顶层 = 祖先链上没有"手动标记的容器"
        // 手动容器（div/section/header 等）的子元素跳过，整体入场
        // 自动标记的内容标签（h1/h2/h3/.indent/padding）不阻断子元素编号
        const topLevel = all.filter(el => {
            let p = el.parentElement;
            while (p && p !== panel) {
                if (p.matches(TARGET) && !p.matches(AUTO_TAGS)) return false;
                p = p.parentElement;
            }
            return true;
        });
        // 只给手动标记的容器设 --index（自动标记元素由 CSS 按类型设 --index）
        let manualIndex = 0;
        topLevel.forEach(el => {
            if (!el.matches(AUTO_TAGS)) {
                el.style.setProperty('--index', manualIndex++);
            }
        });
        // 嵌套元素立即标记完成，跟随父容器一起入场
        all.filter(el => !topLevel.includes(el)).forEach(el => el.classList.add('animate-done'));
        // padding 包裹手动容器时立即显示，避免子元素动画被父容器 opacity:0 遮挡
        all.filter(el => el.tagName === 'PADDING')
           .filter(el => Array.from(el.children).some(c => c.matches(TARGET) && !c.matches(AUTO_TAGS)))
           .forEach(el => el.classList.add('animate-done'));
    }

    function startAnimations(panel) {
        panel.querySelectorAll(TARGET).forEach(el => {
            if (el.classList.contains('animate-done')) return;
            if (el.offsetWidth === 0 && el.offsetHeight === 0) {
                el.classList.add('animate-done');
                return;
            }
            el.classList.add('animate-in');
            el.addEventListener('animationend', function handler(e) {
                if (e.target !== el) return;
                el.classList.add('animate-done');
                el.removeEventListener('animationend', handler);
            });
        });
    }

    function replayAnimations(panel) {
        if (!panel) return;
        const targets = panel.querySelectorAll(TARGET);
        if (!targets.length) return;

        targets.forEach(el => el.classList.remove('animate-in', 'animate-done', 'visible'));
        void panel.offsetWidth;

        assignIndexes(panel);
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

    function startAll() {
        panels().forEach(p => { assignIndexes(p); startAnimations(p); });
    }

    function init() {
        window.textAnimationController = { replayAnimations, startAnimations: startAll, replay: replayAnimations };
        panels().forEach(assignIndexes);
        document.body.classList.add('loaded');
        listenTabSwitch();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
