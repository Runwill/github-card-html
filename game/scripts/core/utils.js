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

    window.Game.Utils.shuffle = shuffle;
})();
