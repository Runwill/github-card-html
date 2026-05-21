(function() {
    window.Game = window.Game || {};
    window.Game.Models = window.Game.Models || {};

    const EQUIP_SLOT_KEYS = ['weaponSlot', 'armorSlot', 'defensiveSlot', 'offensiveSlot'];

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
            
            // Legacy sparse-slot behavior; new empty slots should be modeled as child Areas.
            this.fixedSlots = options.fixedSlots || false; 

            this.parentArea = options.parentArea || null;
            this.childAreas = [];
            this.slotIndex = Number.isFinite(options.slotIndex) ? options.slotIndex : -1;
            this.slotKey = options.slotKey || '';
            this.labelKey = options.labelKey || this.slotKey || '';
            this.renderEmpty = !!options.renderEmpty;
            this.capacity = Number.isFinite(options.capacity) ? options.capacity : null;
            this.acceptsDirectCards = options.acceptsDirectCards !== undefined ? !!options.acceptsDirectCards : true;
            this.isSlotArea = !!options.isSlotArea || this.slotIndex >= 0;

            if (Array.isArray(options.childAreas)) this.setChildAreas(options.childAreas);
        }

        get children() {
            return this.childAreas;
        }

        setChildAreas(childAreas) {
            this.childAreas = Array.isArray(childAreas) ? childAreas.filter(Boolean) : [];
            this.childAreas.forEach((area, index) => {
                area.parentArea = this;
                if (!Number.isFinite(area.slotIndex) || area.slotIndex < 0) area.slotIndex = index;
                if (this.owner && !area.owner) area.owner = this.owner;
            });
            return this.childAreas;
        }

        getChildArea(index) {
            const slotIndex = parseInt(index, 10);
            if (!Number.isFinite(slotIndex)) return null;
            return this.childAreas.find(area => area && area.slotIndex === slotIndex) || this.childAreas[slotIndex] || null;
        }

        add(card) {
            if (this.fixedSlots) {
                // Determine first empty slot? Or just push? 
                // Default add() for fixedSlots is ambiguous, try to find first null
                const emptyIdx = this.cards.findIndex(c => c === null);
                if (emptyIdx > -1) {
                    this.cards[emptyIdx] = card;
                } else {
                    this.cards.push(card); // Overflow or valid next slot
                }
            } else {
                this.cards.push(card);
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

    function getAreaChildren(area) {
        if (!area || !Array.isArray(area.childAreas)) return [];
        return area.childAreas.filter(Boolean);
    }

    function getDefaultChildArea(area, card = null) {
        const children = getAreaChildren(area);
        if (children.length === 0) return null;
        return children.find(child => {
            if (!child || !Array.isArray(child.cards)) return false;
            if (card && child.cards.includes(card)) return true;
            return !Number.isFinite(child.capacity) || child.capacity < 1 || child.cards.length < child.capacity;
        }) || children[0];
    }

    function getEquipSlotAreas(player) {
        if (!player) return [];
        const children = getAreaChildren(player.equipArea);
        if (children.length > 0) return children;
        return Array.isArray(player.equipSlots) ? player.equipSlots.filter(Boolean) : [];
    }

    function getEquipSlotArea(player, slotIndex) {
        if (!Number.isFinite(slotIndex) || slotIndex < 0) return null;
        return getEquipSlotAreas(player)[slotIndex] || null;
    }

    function getDefaultEquipSlotArea(player, card = null) {
        if (!player) return null;
        return getDefaultChildArea(player.equipArea, card)
            || getEquipSlotAreas(player)[0]
            || player.equipArea
            || null;
    }

    function getWritableArea(area, card = null) {
        if (!area) return null;
        if (area.acceptsDirectCards === false) return getDefaultChildArea(area, card);
        return area;
    }

    function flattenAreaTree(area, output = []) {
        if (!area || output.includes(area)) return output;
        output.push(area);
        getAreaChildren(area).forEach(child => flattenAreaTree(child, output));
        return output;
    }

    function getAreaCards(area, options = {}) {
        if (!area) return [];
        const ownCards = Array.isArray(area.cards) ? area.cards.filter(Boolean) : [];
        if (!options.includeChildren) return ownCards;
        return getAreaChildren(area).reduce((cards, child) => cards.concat(getAreaCards(child, options)), ownCards);
    }

    function getPlayerAreas(player) {
        if (!player) return [];
        const areas = [];
        flattenAreaTree(player.hand, areas);
        flattenAreaTree(player.judgeArea, areas);
        flattenAreaTree(player.equipArea, areas);
        if (Array.isArray(player.equipSlots)) player.equipSlots.forEach(area => flattenAreaTree(area, areas));
        return areas;
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
        const targetArea = getWritableArea(toArea, card);
        if (!card || !targetArea || !Array.isArray(targetArea.cards)) return false;

        const sourceArea = fromArea || (typeof card === 'object' ? card.lyingArea : null);
        if (sourceArea) removeCardFromArea(card, sourceArea, fromIndex);

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
            const player = gs.players[parseInt(parts[1])];
            if (!player) return null;
            if (parts[2] === 'hand') return player.hand;
            if (parts[2] === 'judgeArea') return player.judgeArea;
            if (parts[2] === 'equip') {
                if (parts.length < 4 || parts[3] === '') return player.equipArea || null;
                const slotIndex = parseInt(parts[3], 10);
                return getEquipSlotArea(player, slotIndex);
            }
        }
        return null;
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

                const equipSlotAreas = getEquipSlotAreas(player);
                for (let j = 0; j < equipSlotAreas.length; j++) {
                    if (area === equipSlotAreas[j]) return `player:${i}:equip:${equipSlotAreas[j].slotIndex ?? j}`;
                }
            }
        }
        return area.name || null;
    }

    function getAreaPathForLog(area, card, gameState) {
        if (area && area.acceptsDirectCards === false && card && card.lyingArea && card.lyingArea.parentArea === area) {
            return getAreaPathForLog(card.lyingArea, card, gameState);
        }

        const basePath = getAreaPath(area, gameState);
        if (!card || !area) return basePath;

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
        EquipArea:      { apartOrTogether: 0, forOrAgainst: 0 }, // Parent area for fixed equipment slots
        EquipSlot:      { apartOrTogether: 0, forOrAgainst: 0 }, // Child area used by each slot
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
                acceptsDirectCards: false,
                renderEmpty: true
            });

            this.hand.owner = this;
            this.judgeArea.owner = this;
            this.equipArea.owner = this;
            
            this.equipSlots = EQUIP_SLOT_KEYS.map((slotKey, slotIndex) => new Area(`equip_${slotIndex}`, {
                ...Area.Configs.EquipSlot,
                owner: this,
                parentArea: this.equipArea,
                slotIndex,
                slotKey,
                labelKey: slotKey,
                renderEmpty: true,
                capacity: 1,
                isSlotArea: true
            }));
            this.equipArea.setChildAreas(this.equipSlots);
            
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
    window.Game.Models.getAreaPathForLog = getAreaPathForLog;
    window.Game.Models.getAreaChildren = getAreaChildren;
    window.Game.Models.getDefaultChildArea = getDefaultChildArea;
    window.Game.Models.getEquipSlotAreas = getEquipSlotAreas;
    window.Game.Models.getEquipSlotArea = getEquipSlotArea;
    window.Game.Models.getDefaultEquipSlotArea = getDefaultEquipSlotArea;
    window.Game.Models.getWritableArea = getWritableArea;
    window.Game.Models.getAreaCards = getAreaCards;
    window.Game.Models.getPlayerAreas = getPlayerAreas;
    window.Game.Models.EQUIP_SLOT_KEYS = EQUIP_SLOT_KEYS;

})();

// Hand 区域默认 forOrAgainst = 1（私有/背面）
// 牌进入手牌后，card.visibility = 1，且 visibleTo 仅包含拥有者
// 这确保了在线多人游戏中，其他玩家看不到你的手牌

