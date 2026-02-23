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

    // ─── 区域 → DOM 容器映射 ─────────────────────────────────────────────
    /**
     * 根据 areaPath 返回对应的 DOM 容器元素
     * areaPath 格式: "pile" | "discardPile" | "treatmentArea" | "player:N:hand" | "player:N:judgeArea" | "player:N:equip:M"
     */
    function getContainerForArea(areaPath) {
        if (!areaPath) return null;
        if (areaPath === 'pile') return document.getElementById('pile-container');
        if (areaPath === 'discardPile') return document.getElementById('discard-pile-container');
        if (areaPath === 'treatmentArea') return document.getElementById('treatment-area-container');

        const parts = areaPath.split(':');
        if (parts[0] === 'player') {
            const gs = window.Game.GameState;
            if (!gs || !gs.players) return null;
            const playerIdx = parseInt(parts[1]);
            const player = gs.players[playerIdx];
            if (!player) return null;

            const perspIdx = (gs.perspectiveIndex != null) ? gs.perspectiveIndex : 0;
            const isSelf = (playerIdx === perspIdx);

            if (parts[2] === 'hand') {
                if (isSelf) return document.getElementById('hand-cards-container');
                // 非主视角的手牌没有直接渲染容器 → 返回 null
                return null;
            }
            if (parts[2] === 'judgeArea' || parts[2] === 'equip') {
                // 判定区 / 装备区 通常渲染在窗口（CardViewer）里，
                // 没有固定 DOM 容器 → 返回 null
                return null;
            }
        }
        return null;
    }

    /**
     * 获取区域的"摘要锚点"——当牌没有被渲染时，用该元素的位置作为起/终点
     * 对于牌堆/弃牌堆 → 对应容器
     * 对于角色的手牌/判定/装备 → 角色摘要卡片
     */
    function getFallbackAnchor(areaPath) {
        if (!areaPath) return null;
        if (areaPath === 'pile') return document.getElementById('pile-container');
        if (areaPath === 'discardPile') return document.getElementById('discard-pile-container');
        if (areaPath === 'treatmentArea') return document.getElementById('treatment-area-container');

        const parts = areaPath.split(':');
        if (parts[0] === 'player') {
            const gs = window.Game.GameState;
            if (!gs || !gs.players) return null;
            const playerIdx = parseInt(parts[1]);
            const player = gs.players[playerIdx];
            if (!player) return null;

            const perspIdx = (gs.perspectiveIndex != null) ? gs.perspectiveIndex : 0;
            const isSelf = (playerIdx === perspIdx);

            if (isSelf) {
                // 主视角: 用 hand-cards-container 或 char-avatar
                if (parts[2] === 'hand') return document.getElementById('hand-cards-container');
                return document.querySelector('.current-character-panel .char-avatar') || document.getElementById('hand-cards-container');
            }
            // 其他角色: 用角色摘要元素
            return document.getElementById(`player-summary-${player.id}`);
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

    // ─── 快照 API ─────────────────────────────────────────────────────────

    /**
     * 在数据模型修改之前调用。
     * 记录被移动卡牌当前在 DOM 中的位置，以及所有可能受影响区域中卡牌的位置。
     *
     * @param {Object} payload  { cardId, fromAreaPath, toAreaPath }
     */
    function snapshotBeforeMove(payload) {
        _snapshot = {};
        _layoutSnapshot = {};

        const { cardId, fromAreaPath, toAreaPath } = payload;
        const SyncMgr = window.Game.Online && window.Game.Online.SyncManager;

        // ── 被移动卡牌的当前位置 ──
        const fromContainer = getContainerForArea(fromAreaPath);
        const fromAreaObj = fromAreaPath && SyncMgr ? SyncMgr._resolveArea
            ? SyncMgr._resolveArea(fromAreaPath) : _resolveAreaLocal(fromAreaPath) : null;

        let cardRect = null;

        let cardAppearance = null; // { innerHTML, dataCardKey }

        if (fromContainer && fromAreaObj) {
            const el = findCardElement(fromContainer, cardId, fromAreaObj);
            if (el) {
                cardRect = el.getBoundingClientRect();
                cardAppearance = {
                    innerHTML: el.innerHTML,
                    dataCardKey: el.getAttribute('data-card-key') || ''
                };
            }
        }

        // 如果在容器中找不到（未渲染），使用 fallback 锚点
        if (!cardRect) {
            const anchor = getFallbackAnchor(fromAreaPath);
            if (anchor) cardRect = anchor.getBoundingClientRect();
        }

        // 如果没能从源 DOM 获取外观，默认显示牌背
        if (!cardAppearance) {
            cardAppearance = { innerHTML: '', dataCardKey: 'CardBack' };
        }

        _snapshot[cardId] = {
            rect: cardRect,
            areaPath: fromAreaPath,
            appearance: cardAppearance
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
        const { cardId, toAreaPath } = payload;
        const snap = _snapshot[cardId];
        if (!snap || !snap.rect) { _cleanup(); return; }

        // ── 目标位置 ──
        let targetRect = null;
        let prevStackCard = null; // 堆叠区域底下需要临时显示的卡
        const toContainer = getContainerForArea(toAreaPath);
        const toAreaObj = _resolveAreaLocal(toAreaPath);
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
            const anchor = getFallbackAnchor(toAreaPath);
            if (anchor) targetRect = anchor.getBoundingClientRect();
        }

        if (!targetRect) { _cleanup(); return; }

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
        _animateArcFlight(snap.rect, targetRect, cardId, toAreaPath, prevStackCard);

        // ── 布局 FLIP 动画（仅对非堆叠区域有意义）──
        _animateLayoutShift();

        _cleanup();
    }

    // ─── 弧形飞行动画 ─────────────────────────────────────────────────────

    /**
     * 在 from → to 之间创建一个幽灵元素（克隆牌面），沿二次贝塞尔弧线飞行。
     * 曲线控制点垂直于连线方向偏移，偏移量 = 弦长 * arcBulge，保证弧度 < 90°。
     */
    function _animateArcFlight(fromRect, toRect, cardId, toAreaPath, prevStackCard) {
        // ── 确定 ghost 外观 ──
        // 规则：移动前或移动后对主视角可见 → 显示牌名；否则显示牌背
        const snap = _snapshot && _snapshot[cardId];
        const sourceAppearance = snap && snap.appearance;

        // 移动后目标元素的外观（updateUI 已执行）
        let targetAppearance = null;
        const toContainer = getContainerForArea(toAreaPath);
        const toAreaObj = _resolveAreaLocal(toAreaPath);
        if (toContainer && toAreaObj) {
            const tEl = findCardElement(toContainer, cardId, toAreaObj);
            if (tEl) {
                const key = tEl.getAttribute('data-card-key');
                if (key && key !== 'CardBack') {
                    targetAppearance = { innerHTML: tEl.innerHTML, dataCardKey: key };
                }
            }
        }

        // 只要任一端可见就用牌面，否则牌背
        const srcFace = sourceAppearance && sourceAppearance.dataCardKey && sourceAppearance.dataCardKey !== 'CardBack';
        const finalAppearance = srcFace ? sourceAppearance
            : targetAppearance ? targetAppearance
            : (sourceAppearance || { innerHTML: '', dataCardKey: 'CardBack' });

        // 创建幽灵
        const ghost = document.createElement('div');
        ghost.className = 'card-placeholder card-move-ghost';
        ghost.style.cssText = `
            position: fixed;
            left: 0; top: 0;
            width: ${fromRect.width}px;
            height: ${fromRect.height}px;
            z-index: ${CONFIG.ghostZIndex};
            pointer-events: none;
            will-change: transform, opacity;
            transition: none;
            margin: 0;
        `;

        ghost.setAttribute('data-card-key', finalAppearance.dataCardKey || 'CardBack');
        ghost.innerHTML = finalAppearance.innerHTML || '';

        document.body.appendChild(ghost);

        // 起点 / 终点中心
        const sx = fromRect.left + fromRect.width / 2;
        const sy = fromRect.top + fromRect.height / 2;
        const ex = toRect.left + toRect.width / 2;
        const ey = toRect.top + toRect.height / 2;

        // 弧线控制点：垂直于 start→end 向量，偏移 bulge*chordLength
        const dx = ex - sx, dy = ey - sy;
        const chord = Math.sqrt(dx * dx + dy * dy);
        const bulge = chord * CONFIG.arcBulge;
        // 法向量（左手边 = 向上/左弯）
        const nx = -dy / (chord || 1);
        const ny = dx / (chord || 1);
        const cx = (sx + ex) / 2 + nx * bulge;
        const cy = (sy + ey) / 2 + ny * bulge;

        // 目标尺寸
        const tw = toRect.width;
        const th = toRect.height;

        // 根据弦长计算飞行时间（恒定速度），并 clamp 到合理范围
        const arcDuration = Math.min(CONFIG.arcDurationMax,
            Math.max(CONFIG.arcDurationMin, chord / CONFIG.arcSpeed));

        const startTime = performance.now();

        function tick(now) {
            let t = (now - startTime) / arcDuration;
            if (t > 1) t = 1;

            // ease-in-out (smoothstep)
            const e = t * t * (3 - 2 * t);

            // 二次贝塞尔: B(t) = (1-t)²·P0 + 2(1-t)t·C + t²·P1
            const u = 1 - e;
            const px = u * u * sx + 2 * u * e * cx + e * e * ex;
            const py = u * u * sy + 2 * u * e * cy + e * e * ey;

            // 线性插值尺寸
            const w = fromRect.width + (tw - fromRect.width) * e;
            const h = fromRect.height + (th - fromRect.height) * e;

            ghost.style.transform = `translate(${px - w / 2}px, ${py - h / 2}px)`;
            ghost.style.width = w + 'px';
            ghost.style.height = h + 'px';

            // 尾部淡出 (最后 15%)
            if (t > 0.85) {
                ghost.style.opacity = String(1 - (t - 0.85) / 0.15);
            }

            if (t < 1) {
                requestAnimationFrame(tick);
            } else {
                ghost.remove();
                // 恢复堆叠区域下方牌的默认显示
                if (prevStackCard) {
                    prevStackCard.style.display = '';
                }
                // 恢复目标元素可见
                _restoreTarget(cardId, toAreaPath);
            }
        }

        requestAnimationFrame(tick);
    }

    /**
     * 恢复被隐藏的目标元素
     */
    function _restoreTarget(cardId, toAreaPath) {
        const container = getContainerForArea(toAreaPath);
        const areaObj = _resolveAreaLocal(toAreaPath);
        if (container && areaObj) {
            const el = findCardElement(container, cardId, areaObj);
            if (el && el._animRestore) {
                el.style.visibility = '';
                delete el._animRestore;
            }
        }
    }

    // ─── 布局 FLIP 动画 ──────────────────────────────────────────────────

    /**
     * 对快照中记录的其他牌执行 FLIP（First-Last-Invert-Play）动画，
     * 让它们从旧位置平滑滑动到新位置——即"挤压"效果。
     */
    function _animateLayoutShift() {
        if (!_layoutSnapshot) return;

        Object.keys(_layoutSnapshot).forEach(areaPath => {
            const container = getContainerForArea(areaPath);
            if (!container) return;

            // 堆叠区域内所有卡片 position:absolute 重叠，FLIP 无意义，跳过
            if (container.classList.contains('area-stacked')) return;

            const snapped = _layoutSnapshot[areaPath]; // [{el, rect}]
            if (!snapped || !snapped.length) return;

            snapped.forEach(({ el, rect: startRect }) => {
                // 元素可能已被移除（当前 DOM 中不存在）
                if (!el.isConnected) return;
                // 被移动的牌本身（有 _animRestore 标记）不参与 FLIP
                if (el._animRestore) return;

                const endRect = el.getBoundingClientRect();
                const dx = startRect.left - endRect.left;
                const dy = startRect.top - endRect.top;

                if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

                // Invert
                el.style.transform = `translate(${dx}px, ${dy}px)`;
                el.style.transition = 'none';

                // Play (next frame)
                requestAnimationFrame(() => {
                    el.style.transition = `transform ${CONFIG.layoutDuration}ms ${CONFIG.easing}`;
                    el.style.transform = '';

                    const cleanup = () => {
                        el.style.transition = '';
                        el.style.transform = '';
                        el.removeEventListener('transitionend', cleanup);
                    };
                    el.addEventListener('transitionend', cleanup, { once: true });
                    // Fallback cleanup
                    setTimeout(cleanup, CONFIG.layoutDuration + 50);
                });
            });
        });
    }

    // ─── 工具 ─────────────────────────────────────────────────────────────

    function _resolveAreaLocal(path) {
        if (!path) return null;
        const gs = window.Game.GameState;
        if (!gs) return null;
        if (gs[path]) return gs[path];
        const parts = path.split(':');
        if (parts[0] === 'player' && gs.players) {
            const p = gs.players[parseInt(parts[1])];
            if (!p) return null;
            if (parts[2] === 'hand') return p.hand;
            if (parts[2] === 'judgeArea') return p.judgeArea;
            if (parts[2] === 'equip' && p.equipSlots) return p.equipSlots[parseInt(parts[3])];
        }
        return null;
    }

    function _cleanup() {
        _snapshot = null;
        _layoutSnapshot = null;
    }

    // ─── 导出 ─────────────────────────────────────────────────────────────
    window.Game.UI.CardMoveAnimator = {
        snapshotBeforeMove,
        animateAfterMove,
        // 暴露给测试/调试
        getContainerForArea,
        getFallbackAnchor,
        CONFIG,
    };

})();
