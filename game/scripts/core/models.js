(function() {
    window.Game = window.Game || {};
    window.Game.Models = window.Game.Models || {};

    const EQUIP_SLOT_KEYS = ['weaponSlot', 'armorSlot', 'defensiveSlot', 'offensiveSlot'];

    function normalizeSlotDescriptor(slot, fallbackIndex) {
        const source = typeof slot === 'string' ? { slotKey: slot } : (slot || {});
        const slotIndex = Number.isFinite(source.index) ? source.index : fallbackIndex;
        const slotKey = source.slotKey || source.key || '';
        return {
            index: slotIndex,
            slotKey,
            labelKey: source.labelKey || slotKey,
            renderEmpty: source.renderEmpty !== undefined ? !!source.renderEmpty : true,
            capacity: Number.isFinite(source.capacity) ? source.capacity : 1
        };
    }

    function normalizeSlotDescriptors(slots) {
        if (!Array.isArray(slots)) return [];
        return slots.map((slot, index) => normalizeSlotDescriptor(slot, index));
    }

    // 卡牌类
    class Card {
        constructor(name, type, suit = 'none', number = 0, id = null) {
            this.name = name;
            this.type = type; // 'basic', 'kit', 'delay-kit'
            this.suit = suit; // 'spade', 'heart', 'club', 'diamond'
            this.number = number; // 1-13
            this.id = id || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // 运行时状态
            this.lyingArea = null; // 当前所在的区域 (Area对象)
            this.visibility = 0; // 0: Visible (Generic), 1: Invisible (Generic Private)
            this.visibleTo = new Set(); // Specifically visible to these Role IDs
        }

        // 工厂方法：生成标准测试牌堆
        static generateStandardDeck(size = 80) {
            const types = ['attack', 'dodge', 'peach', 'wine'];
            const deck = [];
            for (let i = 0; i < size; i++) {
                deck.push(new Card(types[i % types.length]));
            }
            return deck;
        }
    }

    // 区域类
    class Area {
        constructor(name, options = {}) {
            this.name = name;
            this.cards = []; // 区域内的对象
            this.owner = options.owner || null; // 拥有此区域的角色
            
            // 默认选项
            this.visible = options.visible || new Set(); // 可以看到该区域卡牌的角色
            this.forOrAgainst = options.forOrAgainst !== undefined ? options.forOrAgainst : Area.Configs.Generic.forOrAgainst; 
            this.verticalOrHorizontal = options.verticalOrHorizontal !== undefined ? options.verticalOrHorizontal : Area.Configs.Generic.verticalOrHorizontal; 
            this.apartOrTogether = options.apartOrTogether !== undefined ? options.apartOrTogether : Area.Configs.Generic.apartOrTogether; 
            this.centered = options.centered !== undefined ? options.centered : Area.Configs.Generic.centered;
            
            this.slots = normalizeSlotDescriptors(options.slots || []);
            this.fixedSlots = options.fixedSlots !== undefined ? !!options.fixedSlots : this.slots.length > 0;
            if (this.fixedSlots && this.slots.length > 0) this.cards = new Array(this.slots.length).fill(null);
        }

        add(card) {
            if (this.fixedSlots) {
                const slotIndex = getDefaultSlotIndex(this, card);
                if (slotIndex >= 0) {
                    this.cards[slotIndex] = card;
                    return true;
                }
                return false;
            } else {
                this.cards.push(card);
                return true;
            }
        }

        remove(card) {
            const index = this.cards.indexOf(card);
            if (index > -1) {
                if (this.fixedSlots) {
                    this.cards[index] = null; // Replace with null hole
                } else {
                    this.cards.splice(index, 1);
                }
            }
        }

        removeAt(index) {
            if (index > -1 && index < this.cards.length) {
                if (this.fixedSlots) {
                    this.cards[index] = null;
                } else {
                    this.cards.splice(index, 1);
                }
            }
        }
    }

    function getAreaSlots(area) {
        if (!area || !Array.isArray(area.slots)) return [];
        return area.slots.filter(Boolean);
    }

    function isSlottedArea(area) {
        return !!(area && area.fixedSlots && getAreaSlots(area).length > 0);
    }

    function normalizeSlotIndex(slotIndex) {
        const index = Number(slotIndex);
        return Number.isInteger(index) && index >= 0 ? index : -1;
    }

    function getAreaSlot(area, slotIndex) {
        const index = normalizeSlotIndex(slotIndex);
        if (index < 0) return null;
        return getAreaSlots(area).find(slot => slot && slot.index === index) || getAreaSlots(area)[index] || null;
    }

    function getSlotCards(area, slotIndex) {
        const index = normalizeSlotIndex(slotIndex);
        if (!area || !Array.isArray(area.cards) || index < 0) return [];
        const card = area.cards[index];
        return card ? [card] : [];
    }

    function findCardSlotIndex(area, card) {
        if (!area || !card || !Array.isArray(area.cards)) return -1;
        return area.cards.indexOf(card);
    }

    function firstEmptySlotIndex(area, excludedIndex = -1) {
        const slots = getAreaSlots(area);
        const count = slots.length || (Array.isArray(area?.cards) ? area.cards.length : 0);
        for (let index = 0; index < count; index++) {
            if (index === excludedIndex) continue;
            if (!area.cards[index]) return index;
        }
        return -1;
    }

    function getDefaultSlotIndex(area, card = null) {
        if (!isSlottedArea(area)) return -1;
        const existingIndex = findCardSlotIndex(area, card);
        if (existingIndex >= 0) return existingIndex;
        return firstEmptySlotIndex(area);
    }

    function getTargetSlotIndex(area, toIndex, card = null) {
        const index = normalizeSlotIndex(toIndex);
        if (index >= 0 && getAreaSlot(area, index)) return index;
        return getDefaultSlotIndex(area, card);
    }

    function getEquipSlots(player) {
        return player ? getAreaSlots(player.equipArea) : [];
    }

    function getEquipSlot(player, slotIndex) {
        return player ? getAreaSlot(player.equipArea, slotIndex) : null;
    }

    function getDefaultEquipSlotIndex(player, card = null) {
        return player ? getDefaultSlotIndex(player.equipArea, card) : -1;
    }

    function getAreaCards(area) {
        if (!area) return [];
        return Array.isArray(area.cards) ? area.cards.filter(Boolean) : [];
    }

    function getPlayerAreas(player) {
        return player ? [player.hand, player.judgeArea, player.equipArea].filter(Boolean) : [];
    }

    function getGameAreas(gameState, options = {}) {
        const gs = gameState || window.Game.GameState;
        if (!gs) return [];
        const playerAreas = [];
        const globalAreas = [gs.pile, gs.discardPile, gs.treatmentArea].filter(Boolean);
        (gs.players || []).forEach(player => playerAreas.push(...getPlayerAreas(player)));
        return options.playersFirst ? playerAreas.concat(globalAreas) : globalAreas.concat(playerAreas);
    }

    function findCardArea(card, gameState) {
        if (!card) return null;
        if (typeof card === 'object' && card.lyingArea) return card.lyingArea;
        return getGameAreas(gameState, { playersFirst: true }).find(area => area && Array.isArray(area.cards) && area.cards.includes(card)) || null;
    }

    function findCardById(cardId, gameState, options = {}) {
        if (!cardId) return null;
        for (const area of getGameAreas(gameState, options)) {
            const card = area?.cards?.find(c => c && c.id === cardId);
            if (card) return card;
        }
        return null;
    }

    function getVisibleRoleId(value) {
        if (value && typeof value === 'object') return value.id;
        return value;
    }

    function getCardVisibilityForArea(area) {
        const visibility = area && area.forOrAgainst !== undefined ? area.forOrAgainst : 0;
        const visibleTo = new Set();

        if (area && area.owner && area.owner.id !== undefined) {
            visibleTo.add(area.owner.id);
        }

        if (area && area.visible && typeof area.visible.forEach === 'function') {
            area.visible.forEach(value => {
                const id = getVisibleRoleId(value);
                if (id !== undefined && id !== null) visibleTo.add(id);
            });
        }

        return { visibility, visibleTo };
    }

    function applyCardVisibility(card, area) {
        if (!card || typeof card !== 'object') return card;
        const state = getCardVisibilityForArea(area);
        card.visibility = state.visibility;
        card.visibleTo = state.visibleTo;
        return card;
    }

    function removeCardFromArea(card, fromArea, fromIndex = -1) {
        if (!card || !fromArea || !Array.isArray(fromArea.cards)) return false;

        if (fromIndex !== undefined && fromIndex > -1 && fromArea.cards[fromIndex] === card) {
            if (typeof fromArea.removeAt === 'function') fromArea.removeAt(fromIndex);
            else fromArea.cards.splice(fromIndex, 1);
            return true;
        }

        const index = fromArea.cards.indexOf(card);
        if (index < 0) return false;
        if (typeof fromArea.remove === 'function') fromArea.remove(card);
        else fromArea.cards.splice(index, 1);
        return true;
    }

    function moveCardToArea(card, toArea, toIndex = -1, fromArea = null, fromIndex = -1) {
        const targetArea = toArea;
        if (!card || !targetArea || !Array.isArray(targetArea.cards)) return false;

        const sourceArea = fromArea || (typeof card === 'object' ? card.lyingArea : null);
        const sourceSlotIndex = sourceArea === targetArea ? findCardSlotIndex(sourceArea, card) : -1;

        if (isSlottedArea(targetArea)) {
            const slotIndex = getTargetSlotIndex(targetArea, toIndex, card);
            if (slotIndex < 0) return false;

            if (sourceArea === targetArea && sourceSlotIndex === slotIndex) {
                if (typeof card === 'object') applyCardVisibility(card, targetArea);
                return true;
            }

            const existingCard = targetArea.cards[slotIndex];
            let displacedIndex = -1;
            if (existingCard && existingCard !== card) {
                displacedIndex = sourceArea === targetArea && sourceSlotIndex >= 0
                    ? sourceSlotIndex
                    : firstEmptySlotIndex(targetArea, slotIndex);
                if (displacedIndex < 0) return false;
            }

            if (sourceArea) {
                const removed = removeCardFromArea(card, sourceArea, fromIndex);
                if (!removed) return false;
            }

            if (existingCard && existingCard !== card) {
                targetArea.cards[displacedIndex] = existingCard;
                if (typeof existingCard === 'object') {
                    existingCard.lyingArea = targetArea;
                    applyCardVisibility(existingCard, targetArea);
                }
            }

            targetArea.cards[slotIndex] = card;
            if (typeof card === 'object') {
                card.lyingArea = targetArea;
                applyCardVisibility(card, targetArea);
            }

            return true;
        }

        if (sourceArea) {
            const removed = removeCardFromArea(card, sourceArea, fromIndex);
            if (!removed) return false;
        }

        const insertIndex = toIndex >= 0 && toIndex < targetArea.cards.length ? toIndex : targetArea.cards.length;
        targetArea.cards.splice(insertIndex, 0, card);

        if (typeof card === 'object') {
            card.lyingArea = targetArea;
            applyCardVisibility(card, targetArea);
        }

        return true;
    }

    function resolveAreaByPath(path, gameState) {
        if (!path) return null;
        const gs = gameState || window.Game.GameState;
        if (!gs) return null;

        if (gs[path]) return gs[path];

        const parts = String(path).split(':');
        if (parts[0] === 'player' && gs.players) {
            const player = gs.players[parseInt(parts[1], 10)];
            if (!player) return null;
            if (parts[2] === 'hand') return player.hand;
            if (parts[2] === 'judgeArea') return player.judgeArea;
            if (parts[2] === 'equip') {
                return player.equipArea || null;
            }
        }
        return null;
    }

    function resolveAreaLocationByPath(path, gameState) {
        const area = resolveAreaByPath(path, gameState);
        let slotIndex = -1;
        const parts = String(path || '').split(':');
        if (parts[0] === 'player' && parts[2] === 'equip') {
            if (parts[3] === 'slot') slotIndex = normalizeSlotIndex(parts[4]);
            else slotIndex = normalizeSlotIndex(parts[3]);
        }
        return area ? { area, slotIndex } : null;
    }

    function getAreaPath(area, gameState) {
        if (!area) return null;
        const gs = gameState || window.Game.GameState;
        if (!gs) return null;

        if (area === gs.pile) return 'pile';
        if (area === gs.discardPile) return 'discardPile';
        if (area === gs.treatmentArea) return 'treatmentArea';

        if (gs.players) {
            for (let i = 0; i < gs.players.length; i++) {
                const player = gs.players[i];
                if (area === player.hand) return `player:${i}:hand`;
                if (area === player.judgeArea) return `player:${i}:judgeArea`;
                if (area === player.equipArea) return `player:${i}:equip`;
            }
        }
        return area.name || null;
    }

    function getAreaLocationPath(area, slotIndex = -1, gameState) {
        const basePath = getAreaPath(area, gameState);
        const index = normalizeSlotIndex(slotIndex);
        if (basePath && isSlottedArea(area) && getAreaSlot(area, index)) return `${basePath}:slot:${index}`;
        return basePath;
    }

    function getCardLocationPath(card, gameState) {
        const area = findCardArea(card, gameState);
        if (!area) return null;
        return getAreaLocationPath(area, findCardSlotIndex(area, card), gameState);
    }

    function getAreaPathForLog(area, card, gameState) {
        const basePath = getAreaPath(area, gameState);
        if (!card || !area) return basePath;

        if (isSlottedArea(area)) {
            const slotIndex = findCardSlotIndex(area, card);
            return getAreaLocationPath(area, slotIndex, gameState);
        }

        const cards = area.cards || area;
        if (Array.isArray(cards)) {
            const idx = cards.indexOf(card);
            if (idx >= 0) return basePath + ':' + idx;
            return basePath + ':' + cards.length;
        }
        return basePath;
    }

    // 静态配置定义，用于统一管理不同类型区域的默认属性
    Area.Configs = {
        // 0: 友方/通用, 1: 敌方/特定
        // 0: 垂直, 1: 水平
        // 0: 分开(独立，平铺), 1: 聚合(堆叠)
        // 0: 靠左(默认), 1: 居中
        
        Generic:        { apartOrTogether: 0, forOrAgainst: 0, verticalOrHorizontal: 0, centered: 0 },
        
        // 公共区域
        Pile:           { apartOrTogether: 1, forOrAgainst: 1 }, // 牌堆：堆叠
        DiscardPile:    { apartOrTogether: 1, forOrAgainst: 0 }, // 弃牌堆：堆叠
        TreatmentArea:  { apartOrTogether: 0, forOrAgainst: 0, centered: 1 }, 
        
        // 玩家区域
        Hand:           { apartOrTogether: 0, forOrAgainst: 1 }, 
        EquipArea:      { apartOrTogether: 0, forOrAgainst: 0 }, // Area with fixed slot positions
        JudgeArea:      { apartOrTogether: 0, forOrAgainst: 0 }, 
    };

    // 玩家类
    class Player {
        constructor(config, index) {
            // 混入配置数据 (保留原始属性如 skills, gender, country 等)
            Object.assign(this, config);

            // 基础属性
            this.id = index;
            this.characterId = config.characterId || config.id;
            this.name = config.name || `Player ${index + 1}`;
            
            // 头像处理：配置 > Position关联 > 默认(朱雀)
            if (config.avatar) {
                this.avatar = config.avatar;
            } else if (config.position) {
                // 如果有 position (如 '青龙_君主'), 自动关联到 'source/青龙.png'
                // 移除 _君主 后缀
                const cleanName = config.position.replace(/_君主$/, '');
                this.avatar = `source/${cleanName}.png`;
            } else {
                // 彻底没有头像时的默认值
                this.avatar = 'source/朱雀.png';
            }

            this.seat = index + 1;
            
            // 状态属性
            this.liveStatus = true;
            this.isActing = false; // 是否当前行动
            this.status = []; // 状态列表 (e.g. 翻面, 连锁)
            
            // 数值属性
            this.health = config.hp !== undefined ? config.hp : 4;
            this.healthLimit = config.maxHp !== undefined ? config.maxHp : 4;
            this.handLimit = this.health; // 默认手牌上限等于体力
            this.reach = 1; // 攻击距离
            
            // 区域
            // 注意：依赖 Area.Configs 已定义
            const Area = window.Game.Models.Area;
            this.hand = new Area('hand', Area.Configs.Hand);
            this.judgeArea = new Area('judgeArea', Area.Configs.JudgeArea);
            this.equipArea = new Area('equipArea', {
                ...Area.Configs.EquipArea,
                slots: EQUIP_SLOT_KEYS.map((slotKey, slotIndex) => ({
                    index: slotIndex,
                    slotKey,
                    labelKey: slotKey,
                    renderEmpty: true,
                    capacity: 1
                }))
            });

            this.hand.owner = this;
            this.judgeArea.owner = this;
            this.equipArea.owner = this;
            
            // 默认可见性设置
            // 手牌自己可见
            this.hand.visible.add(this);
        }

        /**
         * 从指定区域抽牌
         * @param {Area} fromArea - 来源区域（通常是牌堆）
         * @param {number} count - 数量
         */
        drawCards(fromArea, count) {
            for (let i = 0; i < count; i++) {
                if (fromArea.cards.length > 0) {
                    const card = fromArea.cards.pop();
                    card.lyingArea = this.hand;
                    this.hand.add(card);
                    applyCardVisibility(card, this.hand);
                } else {
                    console.warn(`[Player] ${this.name} tried to draw ${count} cards but source is empty.`);
                    break;
                }
            }
        }
    }

    window.Game.Models.Card = Card;
    window.Game.Models.Area = Area;
    window.Game.Models.Player = Player;
    window.Game.Models.getCardVisibilityForArea = getCardVisibilityForArea;
    window.Game.Models.applyCardVisibility = applyCardVisibility;
    window.Game.Models.moveCardToArea = moveCardToArea;
    window.Game.Models.resolveAreaByPath = resolveAreaByPath;
    window.Game.Models.getAreaPath = getAreaPath;
    window.Game.Models.getAreaLocationPath = getAreaLocationPath;
    window.Game.Models.getCardLocationPath = getCardLocationPath;
    window.Game.Models.getAreaPathForLog = getAreaPathForLog;
    window.Game.Models.resolveAreaLocationByPath = resolveAreaLocationByPath;
    window.Game.Models.getAreaSlots = getAreaSlots;
    window.Game.Models.getAreaSlot = getAreaSlot;
    window.Game.Models.getSlotCards = getSlotCards;
    window.Game.Models.findCardSlotIndex = findCardSlotIndex;
    window.Game.Models.getEquipSlots = getEquipSlots;
    window.Game.Models.getEquipSlot = getEquipSlot;
    window.Game.Models.getDefaultEquipSlotIndex = getDefaultEquipSlotIndex;
    window.Game.Models.getAreaCards = getAreaCards;
    window.Game.Models.getPlayerAreas = getPlayerAreas;
    window.Game.Models.getGameAreas = getGameAreas;
    window.Game.Models.findCardArea = findCardArea;
    window.Game.Models.findCardById = findCardById;
    window.Game.Models.EQUIP_SLOT_KEYS = EQUIP_SLOT_KEYS;

})();

// Hand 区域默认 forOrAgainst = 1（私有/背面）
// 牌进入手牌后，card.visibility = 1，且 visibleTo 仅包含拥有者
// 这确保了在线多人游戏中，其他玩家看不到你的手牌

