(function() {
    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    const ACTION = 'inspect_details';
    const DEFAULT_KEY = 'Control';
    const MAX_DEPTH = 4;
    const MAX_ARRAY = 80;

    let panel = null;
    let summaryWindow = null;
    let summaryBody = null;
    let rawWindow = null;
    let rawBody = null;
    let active = false;
    let pinned = false;
    let pinnedTarget = null;
    let currentTarget = null;
    let panelPointer = false;
    let lastPoint = { x: 0, y: 0 };

    function translate(key, fallback) {
        const text = window.i18n?.t?.(key);
        if (text && text !== key) return text;
        return fallback;
    }

    function createElement(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.textContent = String(text);
        return node;
    }

    function appendChildren(parent, children) {
        parent.append(...children.filter(Boolean));
        return parent;
    }

    function richValue(html, key) {
        return { html, key: key || html };
    }

    function gameText() {
        return window.Game?.UI?.GameText || null;
    }

    function renderGameText(key, data) {
        const GameText = gameText();
        return GameText && typeof GameText.render === 'function'
            ? GameText.render(key, data)
            : String(data && data.name !== undefined ? data.name : key || '');
    }

    function roleCharacterKey(role) {
        const utils = window.Game?.UI?._RoleUtils;
        if (utils?.roleCharacterKey) return utils.roleCharacterKey(role);
        let key = role && role.character;
        if (Array.isArray(key) && key.length > 0) key = key[0];
        return key || (role && role.name) || '';
    }

    function roleValue(role) {
        if (!role) return '';
        const name = roleCharacterKey(role);
        const characterId = role.characterId || role.id || '';
        const html = renderGameText('Character', { id: characterId, name });
        const idSuffix = role.id !== undefined ? ` <span class="game-inspector-id">#${role.id}</span>` : '';
        return richValue(html + idSuffix, `role:${role.id}:${characterId}:${name}`);
    }

    function areaValue(area, fallback) {
        const key = (area && area.name) || fallback || '';
        if (!key) return '';
        return richValue(renderGameText(key), `area:${key}`);
    }

    function cardValue(card, fallback) {
        const key = (card && (card.name || card.key)) || fallback || '';
        if (!key) return '';
        return richValue(renderGameText(key), `card:${key}`);
    }

    function renderValue(node, value) {
        if (value && typeof value === 'object' && value.html !== undefined) {
            node.classList.add('game-inspector-rich-value');
            if (window.Game?.UI?.safeRender) {
                window.Game.UI.safeRender(node, value.html, value.key || value.html);
            } else {
                node.innerHTML = value.html;
            }
            return;
        }
        node.classList.remove('game-inspector-rich-value');
        node.textContent = String(value);
    }

    function ensurePanel() {
        if (panel) return panel;

        panel = createElement('div', 'game-inspector-panel');
        panel.id = 'game-inspector-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-live', 'polite');
        panel.setAttribute('aria-label', translate('game.inspector.title', 'Debug Info'));

        summaryWindow = createElement('section', 'game-inspector-window game-inspector-window--summary');
        const header = createElement('div', 'game-inspector-header');
        const titleGroup = createElement('div', 'game-inspector-heading');
        appendChildren(titleGroup, [
            createElement('div', 'game-inspector-title', translate('game.inspector.properties', 'Properties')),
            createElement('div', 'game-inspector-hint', translate('game.inspector.hint', 'Press the inspect key to toggle debug mode, then hover game objects.'))
        ]);
        header.appendChild(titleGroup);
        summaryBody = createElement('div', 'game-inspector-body');
        appendChildren(summaryWindow, [header, summaryBody]);

        rawWindow = createElement('section', 'game-inspector-window game-inspector-window--raw');
        const rawHeader = createElement('div', 'game-inspector-header game-inspector-header--raw');
        rawHeader.appendChild(createElement('div', 'game-inspector-title', translate('game.inspector.raw', 'Raw data')));
        rawBody = createElement('div', 'game-inspector-raw-body');
        appendChildren(rawWindow, [rawHeader, rawBody]);
        appendChildren(panel, [summaryWindow, rawWindow]);

        [summaryWindow, rawWindow].forEach(windowNode => {
            windowNode.addEventListener('pointerenter', () => { panelPointer = true; });
            windowNode.addEventListener('pointerleave', () => {
                panelPointer = false;
                if (active && !currentTarget) hidePanel();
            });
        });

        document.body.appendChild(panel);
        return panel;
    }

    function inputHasFocus(target) {
        if (!target) return false;
        const tagName = target.tagName;
        return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.isContentEditable;
    }

    function matchesInspectKey(event) {
        return window.KeySettings?.checkBinding ? window.KeySettings.checkBinding(event, ACTION) : event.key === DEFAULT_KEY;
    }

    function findInspectable(target) {
        if (!target || target === document || target === window) return null;
        if (panel && panel.contains(target)) return null;
        return target.closest ? target.closest('[data-inspector-type]') : null;
    }

    function findInspectableAtPoint(point) {
        if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
        const target = document.elementFromPoint(point.x, point.y);
        return findInspectable(target);
    }

    function getGameState() {
        return window.Game?.GameState || null;
    }

    function findPlayer(roleId) {
        const GameState = getGameState();
        if (!GameState || !Array.isArray(GameState.players)) return null;
        return GameState.players.find(player => String(player.id) === String(roleId)) || null;
    }

    function currentPlayer() {
        const GameState = getGameState();
        if (!GameState || !Array.isArray(GameState.players)) return null;
        const index = GameState.perspectiveIndex != null ? GameState.perspectiveIndex : 0;
        return GameState.players[index] || null;
    }

    function resolveArea(path) {
        if (!path) return null;
        const GameState = getGameState();
        if (!GameState) return null;
        const pathText = String(path);

        const slotMatch = pathText.match(/^(.*):slot:(\d+)$/);
        if (slotMatch) {
            const basePath = slotMatch[1];
            const slotIndex = parseInt(slotMatch[2], 10);
            const equipMatch = basePath.match(/^role:(\d+):equip$/);
            if (equipMatch) {
                const player = findPlayer(equipMatch[1]);
                return window.Game.Models?.getEquipSlotArea?.(player, slotIndex) || null;
            }
            return resolveArea(basePath);
        }

        if (path === 'hand') {
            const player = currentPlayer();
            return player ? player.hand : null;
        }
        if (path === 'pile') return GameState.pile || null;
        if (path === 'discardPile') return GameState.discardPile || null;
        if (path === 'treatmentArea') return GameState.treatmentArea || null;

        if (pathText.startsWith('role-judge:')) {
            const roleId = pathText.replace('role-judge:', '').split(':')[0];
            const player = findPlayer(roleId);
            return player ? player.judgeArea : null;
        }
        if (pathText.startsWith('role:')) {
            const parts = pathText.split(':');
            const player = findPlayer(parts[1]);
            if (!player) return null;
            if (parts[2] === 'equip') {
                const slotIndex = parts[3] === 'slot' ? parseInt(parts[4], 10) : -1;
                if (slotIndex >= 0) {
                    return window.Game.Models?.getEquipSlotArea?.(player, slotIndex) || null;
                }
                return player.equipArea || null;
            }
            return player.hand || null;
        }

        const Models = window.Game?.Models;
        return Models?.resolveAreaByPath
            ? Models.resolveAreaByPath(path, GameState)
            : null;
    }

    function countCards(area) {
        const cards = window.Game?.Models?.getAreaCards?.(area, { includeChildren: true }) || (area && Array.isArray(area.cards) ? area.cards : []);
        return cards.filter(Boolean).length;
    }

    function cardName(card) {
        if (!card) return '';
        return card.name || card.key || card.id || translate('common.empty', 'Empty');
    }

    function describeArea(target) {
        const path = target.dataset.areaName || target.dataset.dropZone || '';
        const area = resolveArea(path);
        const owner = area && area.owner ? area.owner : null;
        return {
            typeLabel: translate('game.inspector.type.area', 'Area'),
            title: areaValue(area, path),
            rows: [
                ['path', path],
                ['name', areaValue(area, path)],
                ['owner', roleValue(owner)],
                ['cards', countCards(area)],
                ['apartOrTogether', area && area.apartOrTogether],
                ['centered', area && area.centered],
                ['forOrAgainst', area && area.forOrAgainst],
                ['fixedSlots', area && area.fixedSlots],
                ['childAreas', (window.Game?.Models?.getAreaChildren?.(area) || []).length],
                ['slotIndex', area && area.slotIndex >= 0 ? area.slotIndex : ''],
                ['slotKey', area && area.slotKey],
                ['renderEmpty', area && area.renderEmpty],
                ['capacity', area && area.capacity]
            ],
            raw: { path, area }
        };
    }

    function describeRole(target) {
        const roleId = target.dataset.roleId || (target._role && target._role.id) || target._roleId;
        const role = target._role || findPlayer(roleId);
        const equipSlots = window.Game?.Models?.getEquipSlotAreas?.(role) || [];
        const equipCount = equipSlots.reduce((sum, slot) => sum + countCards(slot), 0);
        return {
            typeLabel: translate('game.inspector.type.role', 'Role'),
            title: role ? roleValue(role) : `#${roleId}`,
            rows: [
                ['name', roleValue(role)],
                ['id', role && role.id],
                ['seat', role && role.seat],
                ['characterId', role && role.characterId],
                ['hp', role ? `${role.health}/${role.healthLimit}` : ''],
                ['hand', role && role.hand ? countCards(role.hand) : ''],
                ['judgeArea', role && role.judgeArea ? countCards(role.judgeArea) : ''],
                ['equip', equipCount],
                ['liveStatus', role && role.liveStatus],
                ['status', role && Array.isArray(role.status) ? role.status.join(', ') : '']
            ],
            raw: { roleId, role }
        };
    }

    function describeCard(target) {
        const areaPath = target.dataset.areaName || target.dataset.dropZone || '';
        const index = parseInt(target.dataset.cardIndex, 10);
        const area = resolveArea(areaPath);
        const cards = area && Array.isArray(area.cards) ? area.cards : [];
        const card = Number.isFinite(index) ? cards[index] : null;
        return {
            typeLabel: translate('game.inspector.type.card', 'Card'),
            title: cardValue(card, target.dataset.cardKey) || cardName(card) || target.dataset.cardKey || translate('game.inspector.type.card', 'Card'),
            rows: [
                ['area', areaValue(area, areaPath)],
                ['index', Number.isFinite(index) ? index : ''],
                ['rendered', cardValue(null, target.dataset.cardKey)],
                ['id', card && card.id],
                ['name', cardValue(card, target.dataset.cardKey)],
                ['type', card && card.type],
                ['suit', card && card.suit],
                ['number', card && card.number],
                ['visibility', card && card.visibility]
            ],
            raw: { areaPath, index, card }
        };
    }

    function describeTarget(target) {
        if (!target) return null;
        const type = target.dataset.inspectorType;
        if (type === 'card') return describeCard(target);
        if (type === 'role') return describeRole(target);
        if (type === 'area') return describeArea(target);
        return null;
    }

    function snapshot(value, depth, seen) {
        if (depth < 0) return '[MaxDepth]';
        if (value === null || typeof value !== 'object') return value;
        if (seen.has(value)) return '[Circular]';

        if (value instanceof Set) {
            return Array.from(value).slice(0, MAX_ARRAY).map(item => snapshot(item, depth - 1, seen));
        }
        if (Array.isArray(value)) {
            return value.slice(0, MAX_ARRAY).map(item => snapshot(item, depth - 1, seen));
        }

        seen.add(value);
        const output = {};
        Object.keys(value).forEach(key => {
            if (typeof value[key] === 'function') return;
            output[key] = snapshot(value[key], depth - 1, seen);
        });
        seen.delete(value);
        return output;
    }

    function stringifyRaw(value) {
        try {
            return JSON.stringify(snapshot(value, MAX_DEPTH, new WeakSet()), null, 2);
        } catch (error) {
            return String(error && error.message ? error.message : error);
        }
    }

    function appendRows(container, rows) {
        const list = createElement('dl', 'game-inspector-list');
        rows.forEach(([label, value]) => {
            if (value === undefined || value === null || value === '') return;
            list.appendChild(createElement('dt', '', label));
            const valueNode = createElement('dd');
            renderValue(valueNode, value);
            list.appendChild(valueNode);
        });
        container.appendChild(list);
    }

    function renderPanel(info) {
        ensurePanel();
        summaryBody.replaceChildren();
        rawBody.replaceChildren();

        const meta = createElement('div', 'game-inspector-meta');
        const typeNode = createElement('span', 'game-inspector-type', info.typeLabel);
        const titleNode = createElement('strong', 'game-inspector-name');
        renderValue(titleNode, info.title || translate('game.inspector.noTarget', 'No target'));
        appendChildren(meta, [typeNode, titleNode]);
        summaryBody.replaceChildren(meta);

        appendRows(summaryBody, info.rows || []);

        rawBody.replaceChildren(createElement('pre', 'game-inspector-raw', stringifyRaw(info.raw)));
    }

    function syncLayer() {
        if (!panel) return;
        const viewerLayer = parseInt(window.Game?.UI?.maxViewerZIndex, 10);
        const layer = Math.max(20100, Number.isFinite(viewerLayer) ? viewerLayer + 100 : 20100);
        panel.style.zIndex = String(layer);
    }

    function panelViewport() {
        if (!panel) {
            return {
                width: window.innerWidth || document.documentElement.clientWidth || 800,
                height: window.innerHeight || document.documentElement.clientHeight || 600
            };
        }
        const rect = panel.getBoundingClientRect();
        return {
            width: rect.width || window.innerWidth || document.documentElement.clientWidth || 800,
            height: rect.height || window.innerHeight || document.documentElement.clientHeight || 600
        };
    }

    function windowSize(windowNode) {
        if (!windowNode) return { width: 0, height: 0 };
        const rect = windowNode.getBoundingClientRect();
        return {
            width: rect.width || windowNode.offsetWidth || 0,
            height: rect.height || windowNode.offsetHeight || 0
        };
    }

    function cssLength(value, fallback) {
        if (!panel) return fallback;
        const measure = document.createElement('div');
        measure.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${value};height:0;`;
        panel.appendChild(measure);
        const width = measure.getBoundingClientRect().width;
        measure.remove();
        return Number.isFinite(width) && width > 0 ? width : fallback;
    }

    function resizeWindows(viewportW, gap) {
        if (!summaryWindow || !rawWindow) return { summaryWidth: 0, rawWidth: 0 };

        summaryWindow.style.width = '';
        rawWindow.style.width = '';

        const desiredSummaryWidth = windowSize(summaryWindow).width || 160;
        const desiredRawWidth = windowSize(rawWindow).width || 320;
        const availableWidth = Math.max(150, viewportW - gap * 3);
        let summaryWidth = desiredSummaryWidth;
        let rawWidth = desiredRawWidth;

        if (summaryWidth + rawWidth > availableWidth) {
            summaryWidth = Math.min(desiredSummaryWidth, Math.max(86, Math.round(availableWidth * 0.34)));
            rawWidth = availableWidth - summaryWidth;
            const minimumRawWidth = Math.min(120, Math.max(64, Math.round(availableWidth * 0.48)));
            if (rawWidth < minimumRawWidth) {
                rawWidth = minimumRawWidth;
                summaryWidth = Math.max(64, availableWidth - rawWidth);
            }
        }

        summaryWindow.style.width = `${Math.round(summaryWidth)}px`;
        rawWindow.style.width = `${Math.round(rawWidth)}px`;
        return { summaryWidth, rawWidth };
    }

    function positionPanel(point, target) {
        if (!panel || !summaryWindow || !rawWindow) return;

        const gap = cssLength('var(--game-inspector-gap)', 8);
        syncLayer();
        const viewport = panelViewport();
        const viewportW = viewport.width;
        const viewportH = viewport.height;
        resizeWindows(viewportW, gap);
        const summarySize = windowSize(summaryWindow);
        const rawSize = windowSize(rawWindow);
        const groupWidth = summarySize.width + gap + rawSize.width;
        const groupHeight = Math.max(summarySize.height, rawSize.height);
        const targetRect = target && typeof target.getBoundingClientRect === 'function' ? target.getBoundingClientRect() : null;

        const anchorX = point && Number.isFinite(point.x) ? point.x : (targetRect ? targetRect.right : gap);
        const anchorY = point && Number.isFinite(point.y) ? point.y : (targetRect ? targetRect.top : gap);
        let left = anchorX + gap;
        let top = anchorY + gap;

        if (left + groupWidth + gap > viewportW) left = anchorX - groupWidth - gap;
        if (top + groupHeight + gap > viewportH) top = viewportH - groupHeight - gap;
        if (targetRect && top < gap && targetRect.bottom + gap + groupHeight + gap <= viewportH) {
            top = targetRect.bottom + gap;
        }

        left = Math.max(gap, Math.min(left, viewportW - groupWidth - gap));
        top = Math.max(gap, Math.min(top, viewportH - groupHeight - gap));

        const summaryLeft = Math.round(left);
        const rawLeft = Math.round(left + summarySize.width + gap);
        const sharedTop = Math.round(top);
        summaryWindow.style.transform = `translate(${summaryLeft}px, ${sharedTop}px)`;
        rawWindow.style.transform = `translate(${rawLeft}px, ${sharedTop}px)`;
    }

    function showForTarget(target, point) {
        const info = describeTarget(target);
        if (!info) {
            hidePanel();
            return;
        }
        renderPanel(info);
        panel.classList.add('is-visible');
        positionPanel(point || lastPoint, target);
    }

    function hidePanel() {
        if (panel) panel.classList.remove('is-visible');
    }

    function updatePinnedState() {
        document.documentElement.classList.toggle('game-inspector-pinned', pinned);
        if (panel) panel.classList.toggle('is-pinned', pinned);
    }

    function clearPinned(options = {}) {
        pinned = false;
        pinnedTarget = null;
        updatePinnedState();
        if (options.render && currentTarget) showForTarget(currentTarget, lastPoint);
    }

    function pinTarget(target, point) {
        if (!target) return;
        pinned = true;
        pinnedTarget = target;
        currentTarget = target;
        if (point) lastPoint = point;
        updatePinnedState();
        showForTarget(target, lastPoint);
    }

    function activate(point) {
        active = true;
        document.documentElement.classList.add('game-inspector-active');
        if (point) lastPoint = point;
        const targetAtPoint = findInspectableAtPoint(lastPoint);
        if (targetAtPoint) currentTarget = targetAtPoint;
        if (currentTarget) showForTarget(currentTarget, lastPoint);
    }

    function deactivate() {
        active = false;
        pinned = false;
        pinnedTarget = null;
        currentTarget = null;
        panelPointer = false;
        document.documentElement.classList.remove('game-inspector-active');
        updatePinnedState();
        hidePanel();
    }

    function toggle(point) {
        if (!active) {
            activate(point);
            return;
        }
        if (pinned) {
            clearPinned({ render: true });
            return;
        }
        deactivate();
    }

    function init() {
        const refreshTargetFromPointer = event => {
            if (panel && panel.contains(event.target)) return;
            lastPoint = { x: event.clientX, y: event.clientY };
            if (pinned) return;
            const target = findInspectable(event.target) || findInspectableAtPoint(lastPoint);
            if (target) currentTarget = target;
            if (active && currentTarget) showForTarget(currentTarget, lastPoint);
        };

        const handlePinClick = event => {
            if (!active || inputHasFocus(event.target) || (panel && panel.contains(event.target))) return;
            const point = { x: event.clientX, y: event.clientY };
            const target = findInspectable(event.target) || findInspectableAtPoint(point);
            if (!target) return;

            event.preventDefault();
            event.stopPropagation();
            lastPoint = point;

            if (pinned && target === pinnedTarget) {
                currentTarget = target;
                clearPinned({ render: true });
                return;
            }

            pinTarget(target, point);
        };

        document.addEventListener('keydown', event => {
            if (inputHasFocus(event.target) || !matchesInspectKey(event)) return;
            if (event.repeat) return;
            event.preventDefault();
            toggle(lastPoint);
        }, true);

        ['pointerover', 'pointermove', 'mouseover', 'mousemove'].forEach(type => {
            document.addEventListener(type, refreshTargetFromPointer, true);
        });
        document.addEventListener('click', handlePinClick, true);

        document.addEventListener('pointerout', event => {
            if (pinned) return;
            if (!currentTarget) return;
            if (event.relatedTarget && currentTarget.contains(event.relatedTarget)) return;
            if (panel && event.relatedTarget && panel.contains(event.relatedTarget)) return;
            currentTarget = null;
            if (active && !panelPointer) hidePanel();
        }, true);

        window.addEventListener('beforeunload', deactivate);
    }

    window.Game.UI.Inspector = {
        init,
        toggle,
        showForTarget,
        hide: hidePanel
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();