/**
 * Card Move Animation Engine
 *
 * 弧形飞行动画、目标位置恢复、布局 FLIP 挤压/滑动动画等内部实现。
 * 从 card_move_animator.js 拆分。
 */
(function () {
    "use strict";

    const I = window.Game.UI._CardMoveInternal;
    const { CONFIG, getContainerForArea, findCardElement, getFallbackAnchor, getCardElementAppearance } = I;

    function getPlayerIndexFromAreaPath(areaPath) {
        if (!areaPath) return null;
        const parts = areaPath.split(':');
        if (parts[0] !== 'player') return null;
        const index = parseInt(parts[1]);
        return Number.isFinite(index) ? index : null;
    }

    function getSummaryLoopVector(fromAreaPath, toAreaPath, fromRect, toRect) {
        if (getPlayerIndexFromAreaPath(fromAreaPath) !== getPlayerIndexFromAreaPath(toAreaPath)) return null;

        const centerDx = Math.abs((fromRect.left + fromRect.width / 2) - (toRect.left + toRect.width / 2));
        const centerDy = Math.abs((fromRect.top + fromRect.height / 2) - (toRect.top + toRect.height / 2));
        if (centerDx > 2 || centerDy > 2) return null;

        const anchor = getFallbackAnchor && getFallbackAnchor(toAreaPath);
        const summary = anchor && anchor.closest ? anchor.closest('.role-summary') : null;
        if (!summary) return null;

        const distance = Math.max(fromRect.width * 0.85, 24);
        if (summary.closest('#role-list-left')) return { x: distance, y: 0 };
        if (summary.closest('#role-list-right')) return { x: -distance, y: 0 };
        return { x: 0, y: Math.max(fromRect.height * 0.55, 24) };
    }

    function getFixedLayerOrigin() {
        const probe = document.createElement('div');
        probe.style.cssText = 'position: fixed; left: 0; top: 0; width: 0; height: 0; margin: 0; padding: 0; border: 0; visibility: hidden; pointer-events: none;';
        document.body.appendChild(probe);
        const rect = probe.getBoundingClientRect();
        probe.remove();
        return { x: rect.left, y: rect.top };
    }

    // ─── 弧形飞行动画 ─────────────────────────────────────────────────────

    /**
     * 在 from → to 之间创建一个幽灵元素（克隆牌面），沿二次贝塞尔弧线飞行。
     * 曲线控制点垂直于连线方向偏移，偏移量 = 弦长 * arcBulge，保证弧度 < 90°。
     */
    function _animateArcFlight(fromRect, toRect, cardId, toAreaPath, prevStackCard) {
        // ── 确定 ghost 外观 ──
        // 规则：移动前或移动后对主视角可见 → 显示牌名；否则显示牌背
        const snap = I.snapshot && I.snapshot[cardId];
        const sourceAppearance = snap && snap.appearance;
        const snapTargetAppearance = snap && snap.targetAppearance;

        const srcFace = sourceAppearance && sourceAppearance.dataCardKey && sourceAppearance.dataCardKey !== 'CardBack';

        // 移动后目标元素的外观（updateUI 已执行）
        let targetAppearance = null;
        const toContainer = getContainerForArea(toAreaPath);
        const toAreaObj = _resolveAreaLocal(toAreaPath);
        if (toContainer && toAreaObj) {
            const tEl = findCardElement(toContainer, cardId, toAreaObj);
            if (tEl) {
                const key = tEl.getAttribute('data-card-key');
                if (key) {
                    targetAppearance = getCardElementAppearance ? getCardElementAppearance(tEl, { includeMoverLabel: true }) : { innerHTML: tEl.innerHTML, dataCardKey: key };
                }
            }
        }

        // 只要任一端可见就用牌面，否则牌背
        const targetFace = targetAppearance && targetAppearance.dataCardKey && targetAppearance.dataCardKey !== 'CardBack';
        const snapTargetFace = snapTargetAppearance && snapTargetAppearance.dataCardKey && snapTargetAppearance.dataCardKey !== 'CardBack';
        const targetDecorated = targetAppearance && targetAppearance.hasMoverLabel;
        const finalAppearance = targetDecorated ? targetAppearance
            : srcFace ? sourceAppearance
            : targetFace ? targetAppearance
            : snapTargetFace ? snapTargetAppearance
            : targetAppearance ? targetAppearance
            : snapTargetAppearance ? snapTargetAppearance
            : (sourceAppearance || { innerHTML: '', dataCardKey: 'CardBack' });

        // 创建幽灵
        const ghost = document.createElement('div');
        ghost.className = 'card-placeholder card-move-ghost';
        const fixedOrigin = getFixedLayerOrigin();
        // 起始位置：用 transform 直接定位到源卡牌位置，避免在 (0,0) 闪烁
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
            transform: translate(${fromRect.left - fixedOrigin.x}px, ${fromRect.top - fixedOrigin.y}px);
        `;

        ghost.setAttribute('data-card-key', finalAppearance.dataCardKey || 'CardBack');
        ghost.innerHTML = finalAppearance.innerHTML || '';

        document.body.appendChild(ghost);

        // 起点 / 终点中心
        const sx = fromRect.left + fromRect.width / 2;
        const sy = fromRect.top + fromRect.height / 2;
        let ex = toRect.left + toRect.width / 2;
        let ey = toRect.top + toRect.height / 2;

        // 弧线控制点：垂直于 start→end 向量，偏移 bulge*chordLength
        const loopVector = getSummaryLoopVector(snap && snap.areaPath, toAreaPath, fromRect, toRect);
        let dx = ex - sx, dy = ey - sy;
        let chord = Math.sqrt(dx * dx + dy * dy);
        let cx;
        let cy;
        if (loopVector) {
            cx = sx + loopVector.x * 2;
            cy = sy + loopVector.y * 2;
            chord = Math.max(Math.sqrt(loopVector.x * loopVector.x + loopVector.y * loopVector.y) * 2, 1);
        } else {
            const bulge = chord * CONFIG.arcBulge;
            // 法向量（左手边 = 向上/左弯）
            const nx = -dy / (chord || 1);
            const ny = dx / (chord || 1);
            cx = (sx + ex) / 2 + nx * bulge;
            cy = (sy + ey) / 2 + ny * bulge;
        }

        // 目标尺寸
        let tw = toRect.width;
        let th = toRect.height;

        // 根据弦长计算飞行时间（恒定速度），并 clamp 到合理范围
        const arcDuration = Math.min(CONFIG.arcDurationMax,
            Math.max(CONFIG.arcDurationMin, chord / CONFIG.arcSpeed));

        const startTime = performance.now();
        let endpointCorrected = false;

        function tick(now) {
            let t = (now - startTime) / arcDuration;
            if (t > 1) t = 1;

            // 首帧校正：重新读取目标卡牌位置，修正因布局延迟产生的偏差
            if (!endpointCorrected && !loopVector) {
                endpointCorrected = true;
                const toContainer2 = getContainerForArea(toAreaPath);
                const toAreaObj2 = _resolveAreaLocal(toAreaPath);
                if (toContainer2 && toAreaObj2) {
                    const liveEl = findCardElement(toContainer2, cardId, toAreaObj2);
                    if (liveEl) {
                        const liveRect = liveEl.getBoundingClientRect();
                        const newEx = liveRect.left + liveRect.width / 2;
                        const newEy = liveRect.top + liveRect.height / 2;
                        if (Math.abs(newEx - ex) > 1 || Math.abs(newEy - ey) > 1) {
                            ex = newEx;
                            ey = newEy;
                            tw = liveRect.width;
                            th = liveRect.height;
                            // 重新计算控制点
                            const dx2 = ex - sx, dy2 = ey - sy;
                            const chord2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                            const bulge2 = chord2 * CONFIG.arcBulge;
                            const nx2 = -dy2 / (chord2 || 1);
                            const ny2 = dx2 / (chord2 || 1);
                            cx = (sx + ex) / 2 + nx2 * bulge2;
                            cy = (sy + ey) / 2 + ny2 * bulge2;
                        }
                    }
                }
            }

            // ease-in-out (smoothstep)
            const e = t * t * (3 - 2 * t);

            // 二次贝塞尔: B(t) = (1-t)²·P0 + 2(1-t)t·C + t²·P1
            const u = 1 - e;
            const px = u * u * sx + 2 * u * e * cx + e * e * ex;
            const py = u * u * sy + 2 * u * e * cy + e * e * ey;

            // 线性插值尺寸
            const w = fromRect.width + (tw - fromRect.width) * e;
            const h = fromRect.height + (th - fromRect.height) * e;

            ghost.style.transform = `translate(${px - w / 2 - fixedOrigin.x}px, ${py - h / 2 - fixedOrigin.y}px)`;
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
        if (!I.layoutSnapshot) return;

        Object.keys(I.layoutSnapshot).forEach(areaPath => {
            const container = getContainerForArea(areaPath);
            if (!container) return;

            // 堆叠区域内所有卡片 position:absolute 重叠，FLIP 无意义，跳过
            if (container.classList.contains('area-stacked')) return;

            const snapped = I.layoutSnapshot[areaPath]; // [{el, rect}]
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

                    window.CollapsibleAnim.onTransitionEnd(el, () => {
                        el.style.transition = '';
                        el.style.transform = '';
                    }, CONFIG.layoutDuration + 50, event => event.target === el && event.propertyName === 'transform');
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
        I.snapshot = null;
        I.layoutSnapshot = null;
    }


    // ─── 导出动画引擎 ─────────────────────────────────────────────────
    window.Game.UI._CardMoveEngine = {
        animateArcFlight: _animateArcFlight,
        animateLayoutShift: _animateLayoutShift,
        resolveAreaLocal: _resolveAreaLocal,
        cleanup: _cleanup,
    };

})();
