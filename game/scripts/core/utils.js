(function() {
    window.Game = window.Game || {};
    window.Game.Utils = window.Game.Utils || {};

    function shuffle(array) {
        let currentIndex = array.length;
        while (currentIndex != 0) {
            let randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
        }
    }

    /** DOM helper */
    var byId = function(id) { return document.getElementById(id); };

    /** localStorage helpers */
    var myId = function() { return localStorage.getItem('id') || ''; };
    var myUsername = function() { return localStorage.getItem('username') || ''; };

    window.Game.Utils.shuffle = shuffle;
    window.Game.Utils.byId = byId;
    window.Game.Utils.myId = myId;
    window.Game.Utils.myUsername = myUsername;
})();
