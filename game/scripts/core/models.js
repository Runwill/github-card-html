(function() {
    window.Game = window.Game || {};
    window.Game.Models = window.Game.Models || {};

    // Area Class
    class Area {
        constructor(name, options = {}) {
            this.name = name;
            this.cards = []; // objectInArea
            this.owner = options.owner || null; // Role who owns this area
            
            // Default options
            this.visible = options.visible || new Set(); // Roles who can see cards
            this.forOrAgainst = options.forOrAgainst !== undefined ? options.forOrAgainst : 0; // 0: for, 1: against
            this.verticalOrHorizontal = options.verticalOrHorizontal !== undefined ? options.verticalOrHorizontal : 0; // 0: vertical, 1: horizontal
            this.apartOrTogether = options.apartOrTogether !== undefined ? options.apartOrTogether : 0; // 0: apart, 1: together
        }

        add(card) {
            this.cards.push(card);
        }

        remove(card) {
            const index = this.cards.indexOf(card);
            if (index > -1) {
                this.cards.splice(index, 1);
            }
        }

        removeAt(index) {
            if (index > -1 && index < this.cards.length) {
                this.cards.splice(index, 1);
            }
        }
    }

    window.Game.Models.Area = Area;

})();
