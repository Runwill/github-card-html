/**
 * Card Move Animator
 * 
 * 负责在远程同步（或本地非拖拽操作）移动牌时播放弧形飞行动画，
 * 以及对布局受影响的牌播放 FLIP 挤压/滑动动画。
 *
 * 设计：
 *   1. 调用方在修改数据模型 **之前** 调用 snapshotBeforeMove() 拍快照
 *   2. 修改数据模型 & 触发 updateUI()
 *   3. 在 updateUI() **之后** 调用 animateAfterMove() 播放动画
 *
 * 弧形动画使用二次贝塞尔曲线（< 1/4 圆弧），配合 ease-in-out 缓动。
 */
(function () {
    'use strict';

    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    // ─── 配置 ────────────────────────────────────────────────────────────
    const CONFIG = {
        arcSpeed: 0.9,           // px/ms – 弧形飞行恒定速度
        arcDurationMin: 200,     // ms – 最短飞行时间
        arcDurationMax: 700,     // ms – 最长飞行时间
        layoutDuration: 280,     // ms – 周围牌的 FLIP 过渡
        arcBulge: 0.28,          // 弧线凸出系数（弦长的百分比），< 0.5 保证 < 1/4 圆弧
        ghostZIndex: '100001',
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)', // Material ease-in-out
    };

    // ─── 快照数据 ─────────────────────────────────────────────────────────
    // cardId -> { rect: DOMRect, areaPath: string }
    let _snapshot = null;
    // areaPath -> [ { el, rect } ]  布局快照
    let _layoutSnapshot = null;
    let _fallbackCardSize = null;

    const Targets = window.Game.UI.CardMoveTargets;

    /**
     * 根据 areaPath 返回对应的 DOM 容器元素
    * areaPath 格式: "pile" | "discardPile" | "treatmentArea" | "player:N:hand" | "player:N:judgeArea" | "player:N:equip" | "player:N:equip:slot:M"
     */
    function getContainerForArea(areaPath) {
        return Targets?.getContainerForAreaPath?.(areaPath) || null;
    }

    /**
     * 获取区域的"摘要锚点"——当牌没有被渲染时，用该元素的位置作为起/终点
     * 对于牌堆/弃牌堆 → 对应容器
     * 对于角色的手牌/判定/装备 → 角色摘要卡片
     */
    function getFallbackAnchor(areaPath) {
        return Targets?.getFallbackAnchorForAreaPath?.(areaPath) || null;
    }

    /**
     * 在 area 容器中按 cardId 查找已渲染的 .card-placeholder 元素
     */
    function findCardElement(container, cardId, areaObj) {
        return Targets?.findCardElement?.(container, cardId, areaObj) || null;
    }

    function resolveAreaForPath(areaPath) {
        return Targets?.resolveAreaForPath?.(areaPath) || null;
    }

    function parseCssPx(value, fallback) {
        const num = parseFloat(value);
        return Number.isFinite(num) && num > 0 ? num : fallback;
    }

    function getFallbackCardSize() {
        if (_fallbackCardSize) return _fallbackCardSize;
        const cs = getComputedStyle(document.documentElement);
        const sample = document.querySelector('.card-placeholder');
        const sampleRect = sample ? sample.getBoundingClientRect() : null;
        const width = parseCssPx(cs.getPropertyValue('--card-w'), sampleRect && sampleRect.width || 100);
        const height = parseCssPx(cs.getPropertyValue('--card-h'), sampleRect && sampleRect.height || width * 1.4);
        _fallbackCardSize = { width, height };
        return _fallbackCardSize;
    }

    function resetFallbackCardSize() {
        _fallbackCardSize = null;
    }

    function makeCardRectAtAnchor(anchor, preferredSize = null) {
        if (!anchor) return null;
        const anchorRect = anchor.getBoundingClientRect();
        const size = preferredSize || getFallbackCardSize();
        const left = anchorRect.left + anchorRect.width / 2 - size.width / 2;
        const top = anchorRect.top + anchorRect.height / 2 - size.height / 2;
        return {
            left,
            top,
            width: size.width,
            height: size.height,
            right: left + size.width,
            bottom: top + size.height
        };
    }

    function getFallbackRect(areaPath, preferredSize = null) {
        return makeCardRectAtAnchor(getFallbackAnchor(areaPath), preferredSize);
    }

    function targetIndexFromPayload(payload) {
        const position = Number(payload && payload.position);
        return Number.isFinite(position) && position > 0 ? position - 1 : -1;
    }

    function findAnimationTarget(areaPath, payload) {
        return Targets?.findAnimationTargetForAreaPath?.(areaPath, {
            cardId: payload && payload.cardId,
            targetIndex: targetIndexFromPayload(payload)
        }) || null;
    }

    function directChildWithClass(parent, className) {
        return Array.from(parent.children).find(child => child.classList.contains(className)) || null;
    }

    function composeCardAppearanceHTML(faceHTML, annotationsHTML = '') {
        return `<div class="card-face-content">${faceHTML || ''}</div>`
            + `<div class="card-annotations">${annotationsHTML || ''}</div>`;
    }

    function getCardElementAppearance(el, options = {}) {
        if (!el) return null;
        const faceEl = directChildWithClass(el, 'card-face-content');
        const annotationsEl = directChildWithClass(el, 'card-annotations');
        const faceHTML = faceEl ? faceEl.innerHTML : el.innerHTML;
        const hasMoverLabel = !!annotationsEl?.querySelector('.card-mover-label');
        const annotationsHTML = options.includeMoverLabel && annotationsEl ? annotationsEl.innerHTML : '';
        return {
            innerHTML: composeCardAppearanceHTML(faceHTML, annotationsHTML),
            dataCardKey: el.getAttribute('data-card-key') || '',
            hasMoverLabel
        };
    }

    function getModelAppearance(card, areaObj) {
        if (!card || !window.Game.UI.getCardAppearanceForArea) return null;
        return window.Game.UI.getCardAppearanceForArea(card, areaObj, { forceFaceDown: false });
    }

    // ─── 快照 API ─────────────────────────────────────────────────────────

    /**
     * 在数据模型修改之前调用。
     * 记录被移动卡牌当前在 DOM 中的位置，以及所有可能受影响区域中卡牌的位置。
     *
     * @param {Object} payload  { cardId, fromAreaPath, toAreaPath }
     */
    function snapshotBeforeMove(payload) {
        resetFallbackCardSize();
        _snapshot = {};
        _layoutSnapshot = {};

        const { cardId, fromAreaPath, toAreaPath } = payload;
        // ── 被移动卡牌的当前位置 ──
        const fromContainer = getContainerForArea(fromAreaPath);
        const fromAreaObj = resolveAreaForPath(fromAreaPath);
        const toAreaObj = resolveAreaForPath(toAreaPath);
        const cardObj = window.Game.Models?.findCardById?.(cardId, window.Game.GameState, { playersFirst: true }) || null;

        let cardRect = null;

        let cardAppearance = null; // { innerHTML, dataCardKey }

        if (fromContainer && fromAreaObj) {
            const el = findCardElement(fromContainer, cardId, fromAreaObj);
            if (el) {
                cardRect = el.getBoundingClientRect();
                cardAppearance = getCardElementAppearance(el);
            }
        }

        // 如果在容器中找不到（未渲染），使用 fallback 锚点
        if (!cardRect) {
            cardRect = getFallbackRect(fromAreaPath);
        }

        if (!cardAppearance) {
            cardAppearance = getModelAppearance(cardObj, fromAreaObj);
        }

        const targetAppearance = getModelAppearance(cardObj, toAreaObj);

        // 如果没能从源 DOM 和模型获取外观，默认显示牌背
        if (!cardAppearance) {
            cardAppearance = { innerHTML: '', dataCardKey: 'CardBack' };
        }

        _snapshot[cardId] = {
            rect: cardRect,
            areaPath: fromAreaPath,
            appearance: cardAppearance,
            targetAppearance: targetAppearance || null
        };

        // ── 布局快照：记录受影响区域中所有牌的当前位置 ──
        const layoutAreaPaths = Array.isArray(payload.layoutAreaPaths) ? payload.layoutAreaPaths : [fromAreaPath, toAreaPath];
        layoutAreaPaths.forEach(ap => {
            if (!ap || _layoutSnapshot[ap]) return;
            const container = getContainerForArea(ap);
            if (!container) return;
            const items = Array.from(container.children).filter(
                c => c.classList.contains('card-placeholder')
            );
            _layoutSnapshot[ap] = items.map(el => ({
                el,
                cardId: el.getAttribute('data-card-id') || '',
                rect: el.getBoundingClientRect()
            }));
        });
    }

    /**
     * 在数据模型修改 + updateUI() 之后调用。
     * 比较快照，对被移动的牌播放弧形飞行动画，对布局受影响的牌播放 FLIP 动画。
     *
     * @param {Object} payload  { cardId, toAreaPath, position }
     */
    function animateAfterMove(payload) {
        if (!_snapshot) return;
        resetFallbackCardSize();
        const { cardId, toAreaPath } = payload;
        const snap = _snapshot[cardId];
        const E = window.Game.UI._CardMoveEngine;
        if (!snap || !snap.rect) { E.cleanup(); return; }

        // ── 目标位置 ──
        let targetRect = null;
        let prevStackCard = null; // 堆叠区域底下需要临时显示的卡
        const target = findAnimationTarget(toAreaPath, payload);
        const toContainer = target && target.zone ? target.zone : getContainerForArea(toAreaPath);
        const isToStacked = toContainer && toContainer.classList.contains('area-stacked');

        // ── 强制跳过 spread 容器内的 margin 过渡，获取最终布局位置 ──
        const _spreadTransitionEls = [];
        [toContainer, getContainerForArea(snap.areaPath)].forEach(c => {
            if (!c || !c.classList.contains('area-spread')) return;
            const cards = c.querySelectorAll('.card-placeholder');
            cards.forEach(card => {
                _spreadTransitionEls.push({ el: card, prev: card.style.transition });
                card.style.transition = 'none';
            });
        });
        if (_spreadTransitionEls.length) {
            void (toContainer || document.body).offsetHeight; // force reflow
        }

        if (target && target.target) {
            if (target.isCard) {
                const targetEl = target.target;
                targetRect = targetEl.getBoundingClientRect();
                // 暂时隐藏目标元素，等动画结束后恢复
                targetEl.style.visibility = 'hidden';
                // 标记以便恢复
                targetEl._animRestore = true;

                // ── 堆叠区域：强制显示下方的牌，防止牌堆变空白 ──
                if (isToStacked) {
                    const prev = targetEl.previousElementSibling;
                    if (prev && prev.classList.contains('card-placeholder')) {
                        prev.style.display = 'flex';
                        prevStackCard = prev;
                    }
                }
            } else {
                targetRect = makeCardRectAtAnchor(target.target, snap.rect);
            }
        }

        if (!targetRect) {
            targetRect = getFallbackRect(toAreaPath, snap.rect);
        }

        if (!targetRect) { E.cleanup(); return; }

        // 来源端堆叠区域：updateUI 后 CSS 已自动将 is-top-card 切换到新顶牌，
        // 无需额外操作。

        // ── 恢复 spread 容器内的过渡 ──
        if (_spreadTransitionEls.length) {
            requestAnimationFrame(() => {
                _spreadTransitionEls.forEach(({ el, prev }) => {
                    el.style.transition = prev;
                });
            });
        }

        // ── 创建飞行幽灵 ──
        E.animateArcFlight(snap.rect, targetRect, cardId, toAreaPath, prevStackCard);

        // ── 布局 FLIP 动画（仅对非堆叠区域有意义）──
        E.animateLayoutShift();

        E.cleanup();
    }

    function animateLayoutAfterMove() {
        if (!_layoutSnapshot) return;
        window.Game.UI._CardMoveEngine?.animateLayoutShift?.();
        window.Game.UI._CardMoveEngine?.cleanup?.();
    }

    function clearSnapshot() {
        _snapshot = null;
        _layoutSnapshot = null;
    }


    // ── 内部 API 供 card_move_animation.js 使用 ──
    window.Game.UI._CardMoveInternal = {
        CONFIG,
        get snapshot() { return _snapshot; },
        set snapshot(v) { _snapshot = v; },
        get layoutSnapshot() { return _layoutSnapshot; },
        set layoutSnapshot(v) { _layoutSnapshot = v; },
        getContainerForArea,
        findCardElement,
        getFallbackAnchor,
        getFallbackRect,
        resolveAreaForPath,
        getCardElementAppearance,
        resetFallbackCardSize,
    };

    // ─── 导出 ─────────────────────────────────────────────────────────────
    window.Game.UI.CardMoveAnimator = {
        snapshotBeforeMove,
        animateAfterMove,
        animateLayoutAfterMove,
        clearSnapshot,
    };

})();
