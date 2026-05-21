(function () {
    "use strict";

    window.Game = window.Game || {};
    window.Game.UI = window.Game.UI || {};

    function state() {
        return window.Game.GameState || window.Game.Core?.GameState || null;
    }

    function isVisible(element) {
        return !!(element && element.getClientRects && element.getClientRects().length);
    }

    function cardElements(container) {
        if (!container) return [];
        return Array.from(container.children).filter(child => child.classList.contains('card-placeholder'));
    }

    function globalAreaElement(areaId) {
        if (areaId === 'pile') return document.getElementById('pile-container');
        if (areaId === 'discardPile') return document.getElementById('discard-pile-container');
        if (areaId === 'treatmentArea') return document.getElementById('treatment-area-container');
        return null;
    }

    function playerByIndex(playerIndex) {
        const gameState = state();
        const player = gameState?.players?.[playerIndex];
        if (!gameState || !player) return null;
        return {
            index: playerIndex,
            player,
            isSelf: playerIndex === (gameState.perspectiveIndex ?? 0)
        };
    }

    function playerById(roleId) {
        const players = state()?.players || [];
        const playerIndex = players.findIndex(player => player && player.id === roleId);
        return playerIndex >= 0 ? playerByIndex(playerIndex) : null;
    }

    function areaPathInfo(areaPath) {
        const parts = String(areaPath || '').split(':');
        if (parts[0] !== 'player') return null;
        const playerIndex = parseInt(parts[1]);
        if (!Number.isFinite(playerIndex)) return null;
        const info = playerByIndex(playerIndex);
        return info ? { ...info, areaType: parts[2], slotIndex: parseInt(parts[3]) } : null;
    }

    function dropZoneInfo(zoneId) {
        const parts = String(zoneId || '').split(':');
        if (parts[0] === 'role-judge') {
            const roleId = parseInt(parts[1]);
            return Number.isFinite(roleId) ? { roleId, areaType: 'judgeArea', slotIndex: -1 } : null;
        }
        if (parts[0] !== 'role') return null;
        const roleId = parseInt(parts[1]);
        if (!Number.isFinite(roleId)) return null;
        if (parts[2] === 'equip') {
            const slotIndex = parts[3] === 'slot' ? parseInt(parts[4]) : -1;
            return { roleId, areaType: 'equip', slotIndex: Number.isFinite(slotIndex) ? slotIndex : -1 };
        }
        return { roleId, areaType: 'hand', slotIndex: -1 };
    }

    function resolveAreaForPath(areaPath) {
        if (!areaPath) return null;
        return window.Game.Models?.resolveAreaByPath?.(areaPath, state()) || null;
    }

    function resolveAreaForDropZone(zoneId) {
        const gameState = state();
        if (!zoneId || !gameState) return null;
        if (zoneId === 'hand') return gameState.players?.[gameState.perspectiveIndex ?? 0]?.hand || null;
        if (gameState[zoneId]) return gameState[zoneId];

        const zone = dropZoneInfo(zoneId);
        const info = zone && playerById(zone.roleId);
        if (!info) return null;
        if (zone.areaType === 'judgeArea') return info.player.judgeArea;
        if (zone.areaType === 'equip') {
            return zone.slotIndex >= 0
                ? (window.Game.Models?.getEquipSlotArea?.(info.player, zone.slotIndex) || null)
                : (window.Game.Models?.getDefaultEquipSlotArea?.(info.player) || null);
        }
        return info.player.hand;
    }

    function zoneIdsForPath(areaPath) {
        if (!areaPath) return [];
        if (globalAreaElement(areaPath)) return [areaPath];

        const info = areaPathInfo(areaPath);
        if (!info) return [];
        if (info.areaType === 'hand') {
            const roleZone = `role:${info.player.id}`;
            return info.isSelf ? ['hand', roleZone] : [roleZone];
        }
        if (info.areaType === 'judgeArea') return [`role-judge:${info.player.id}`];
        if (info.areaType === 'equip') {
            const baseZone = `role:${info.player.id}:equip`;
            return Number.isFinite(info.slotIndex) ? [`${baseZone}:slot:${info.slotIndex}`, baseZone] : [baseZone];
        }
        return [];
    }

    function zonesById(zoneId) {
        return Array.from(document.querySelectorAll('[data-drop-zone]'))
            .filter(zone => zone.getAttribute('data-drop-zone') === zoneId);
    }

    function uniqueZones(zones) {
        return Array.from(new Set(zones.filter(Boolean)));
    }

    function zonesForPath(areaPath) {
        return uniqueZones(zoneIdsForPath(areaPath).flatMap(zonesById));
    }

    function isViewerZone(zone) {
        return !!zone?.closest?.('.card-viewer-modal');
    }

    function primaryContainer(areaPath) {
        const globalElement = globalAreaElement(areaPath);
        if (globalElement) return globalElement;
        const info = areaPathInfo(areaPath);
        return info?.isSelf && info.areaType === 'hand' ? document.getElementById('hand-cards-container') : null;
    }

    function fallbackAnchorForPath(areaPath) {
        const globalElement = globalAreaElement(areaPath);
        if (globalElement) return globalElement;

        const info = areaPathInfo(areaPath);
        if (!info) return null;
        if (!info.isSelf) return document.getElementById(`player-summary-${info.player.id}`);
        if (info.areaType === 'hand') return document.getElementById('hand-cards-container');
        if (info.areaType === 'judgeArea') return document.getElementById('char-judge-count')
            || document.querySelector('.main-judge-btn')
            || document.querySelector('.current-character-panel .char-avatar')
            || document.querySelector('.current-character-panel');
        return document.querySelector('.main-equip-btn')
            || document.querySelector('.current-character-panel .char-avatar')
            || document.querySelector('.current-character-panel');
    }

    function fallbackAnchorForZone(zoneId) {
        if (zoneId === 'hand') return document.getElementById('hand-cards-container');
        const globalElement = globalAreaElement(zoneId);
        if (globalElement) return globalElement;

        const zone = dropZoneInfo(zoneId);
        const info = zone && playerById(zone.roleId);
        if (!info) return null;
        if (!info.isSelf) return document.getElementById(`player-summary-${info.player.id}`);
        if (zone.areaType === 'judgeArea') return document.getElementById('char-judge-count')
            || document.querySelector('.main-judge-btn')
            || document.querySelector('.current-character-panel .char-avatar')
            || document.querySelector('.current-character-panel');
        if (zone.areaType === 'equip') return document.querySelector('.main-equip-btn')
            || document.querySelector('.current-character-panel .char-avatar')
            || document.querySelector('.current-character-panel');
        return document.getElementById('hand-cards-container') || document.querySelector('.current-character-panel');
    }

    function findCardElement(container, cardId, area, targetIndex = -1) {
        const cards = cardElements(container);
        if (!cards.length) return null;

        if (cardId && area?.cards) {
            const cardIndex = area.cards.findIndex(card => card && card.id === cardId);
            if (cardIndex >= 0 && cards[cardIndex]) return cards[cardIndex];
        }

        if (targetIndex >= 0 && targetIndex < cards.length) return cards[targetIndex];
        return cards[cards.length - 1] || null;
    }

    function cardTargetFromZones(zones, options, area) {
        for (const zone of zones) {
            const zoneArea = area || resolveAreaForDropZone(zone.getAttribute('data-drop-zone'));
            const cardElement = findCardElement(zone, options.cardId, zoneArea, options.targetIndex);
            if (cardElement) return { target: cardElement, zone, isCard: true };
        }
        return null;
    }

    function getContainerForAreaPath(areaPath) {
        const zones = zonesForPath(areaPath);
        return zones.find(zone => isVisible(zone) && cardElements(zone).length)
            || primaryContainer(areaPath)
            || zones.find(zone => isVisible(zone) && isViewerZone(zone))
            || zones.find(isVisible)
            || zones[0]
            || null;
    }

    function findAnimationTargetForAreaPath(areaPath, options = {}) {
        const zones = zonesForPath(areaPath);
        const area = resolveAreaForPath(areaPath);
        const cardTarget = cardTargetFromZones(zones, options, area);
        if (cardTarget) return cardTarget;

        const viewerZone = zones.find(zone => isVisible(zone) && isViewerZone(zone));
        const anchor = viewerZone
            || fallbackAnchorForPath(areaPath)
            || zones.find(isVisible)
            || zones[0]
            || null;
        return anchor ? { target: anchor, zone: anchor, isCard: false } : null;
    }

    function findAnimationTargetForDropZone(zoneId, options = {}) {
        const zones = zonesById(zoneId);
        const area = resolveAreaForDropZone(zoneId);
        const cardTarget = cardTargetFromZones(zones, options, area);
        if (cardTarget) return cardTarget;

        const viewerZone = zones.find(zone => isVisible(zone) && isViewerZone(zone));
        const anchor = viewerZone
            || fallbackAnchorForZone(zoneId)
            || zones.find(isVisible)
            || zones[0]
            || null;
        return anchor ? { target: anchor, zone: anchor, isCard: false } : null;
    }

    window.Game.UI.CardMoveTargets = {
        getContainerForAreaPath,
        getFallbackAnchorForAreaPath: fallbackAnchorForPath,
        findCardElement,
        resolveAreaForPath,
        findAnimationTargetForAreaPath,
        findAnimationTargetForDropZone
    };
})();
