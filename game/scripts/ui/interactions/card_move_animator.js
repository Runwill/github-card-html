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

    // ─── 区域 → DOM 容器映射 ─────────────────────────────────────────────
    function getGlobalAreaElement(areaPath) {
        if (areaPath === 'pile') return document.getElementById('pile-container');
        if (areaPath === 'discardPile') return document.getElementById('discard-pile-container');
        if (areaPath === 'treatmentArea') return document.getElementById('treatment-area-container');
        return null;
    }

    function getPlayerPathInfo(areaPath) {
        if (!areaPath) return null;
        const parts = areaPath.split(':');
        const gs = window.Game.GameState;
        if (parts[0] !== 'player' || !gs || !gs.players) return null;
        const playerIdx = parseInt(parts[1]);
        const player = gs.players[playerIdx];
        if (!player) return null;
        const perspIdx = (gs.perspectiveIndex != null) ? gs.perspectiveIndex : 0;
        return { parts, player, isSelf: playerIdx === perspIdx };
    }

    /**
     * 根据 areaPath 返回对应的 DOM 容器元素
     * areaPath 格式: "pile" | "discardPile" | "treatmentArea" | "player:N:hand" | "player:N:judgeArea" | "player:N:equip:M"
     */
    function getContainerForArea(areaPath) {
        if (!areaPath) return null;
        const globalEl = getGlobalAreaElement(areaPath);
        if (globalEl) return globalEl;

        const info = getPlayerPathInfo(areaPath);
        if (info && info.parts[2] === 'hand' && info.isSelf) return document.getElementById('hand-cards-container');
        return null;
    }

    /**
     * 获取区域的"摘要锚点"——当牌没有被渲染时，用该元素的位置作为起/终点
     * 对于牌堆/弃牌堆 → 对应容器
     * 对于角色的手牌/判定/装备 → 角色摘要卡片
     */
    function getFallbackAnchor(areaPath) {
        if (!areaPath) return null;
        const globalEl = getGlobalAreaElement(areaPath);
        if (globalEl) return globalEl;

        const info = getPlayerPathInfo(areaPath);
        if (info) {
            if (info.isSelf) {
                // 主视角: 用 hand-cards-container 或 char-avatar
                if (info.parts[2] === 'hand') return document.getElementById('hand-cards-container');
                return document.querySelector('.current-character-panel .char-avatar') || document.getElementById('hand-cards-container');
            }
            // 其他角色: 用角色摘要元素
            return document.getElementById(`player-summary-${info.player.id}`);
        }
        return null;
    }

    /**
     * 在 area 容器中按 cardId 查找已渲染的 .card-placeholder 元素
     */
    function findCardElement(container, cardId, areaObj) {
        if (!container || !areaObj || !areaObj.cards) return null;
        const idx = areaObj.cards.findIndex(c => c && c.id === cardId);
        if (idx < 0) return null;
        const children = Array.from(container.children).filter(
            c => c.classList.contains('card-placeholder')
        );
        return children[idx] || null;
    }

    function resolveAreaForPath(areaPath) {
        if (!areaPath) return null;
        const Models = window.Game.Models || {};
        if (Models.resolveAreaByPath) return Models.resolveAreaByPath(areaPath);
        const SyncMgr = window.Game.Online && window.Game.Online.SyncManager;
        if (SyncMgr && SyncMgr._resolveArea) return SyncMgr._resolveArea(areaPath);
        const Engine = window.Game.UI && window.Game.UI._CardMoveEngine;
        if (Engine && Engine.resolveAreaLocal) return Engine.resolveAreaLocal(areaPath);
        return null;
    }

    function findCardInArea(areaObj, cardId) {
        if (!areaObj || !areaObj.cards) return null;
        return areaObj.cards.find(c => c && c.id === cardId) || null;
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

    function makeCardRectAtAnchor(anchor) {
        if (!anchor) return null;
        const anchorRect = anchor.getBoundingClientRect();
        const size = getFallbackCardSize();
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

    function getFallbackRect(areaPath) {
        return makeCardRectAtAnchor(getFallbackAnchor(areaPath));
    }

    function getCardElementAppearance(el) {
        if (!el) return null;
        let innerHTML = el.innerHTML;
        if (el.querySelector('.card-mover-label')) {
            const clone = el.cloneNode(true);
            clone.querySelectorAll('.card-mover-label').forEach(node => node.remove());
            innerHTML = clone.innerHTML;
        }
        return {
            innerHTML,
            dataCardKey: el.getAttribute('data-card-key') || ''
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
        const cardObj = findCardInArea(fromAreaObj, cardId);

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
        [fromAreaPath, toAreaPath].forEach(ap => {
            if (!ap || _layoutSnapshot[ap]) return;
            const container = getContainerForArea(ap);
            if (!container) return;
            const items = Array.from(container.children).filter(
                c => c.classList.contains('card-placeholder')
            );
            _layoutSnapshot[ap] = items.map(el => ({
                el,
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
        const toContainer = getContainerForArea(toAreaPath);
        const toAreaObj = E.resolveAreaLocal(toAreaPath);
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

        if (toContainer && toAreaObj) {
            const targetEl = findCardElement(toContainer, cardId, toAreaObj);
            if (targetEl) {
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
            }
        }

        if (!targetRect) {
            targetRect = getFallbackRect(toAreaPath);
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
        getCardElementAppearance,
        resetFallbackCardSize,
    };

    // ─── 导出 ─────────────────────────────────────────────────────────────
    window.Game.UI.CardMoveAnimator = {
        snapshotBeforeMove,
        animateAfterMove,
        getContainerForArea,
        getFallbackAnchor,
        CONFIG,
    };

})();
