// Foundation 与页面初始化
(function(){
  function safeRun(fn){ try { return typeof fn === 'function' ? fn() : undefined; } catch(_) {} }
  // 提供全局 delay（若未定义）
  if (!window.delay) {
    window.delay = function(ms){ return new Promise(resolve => setTimeout(resolve, ms)); };
  }
  // 提供全局段落过滤（保留原逻辑）
  if (!window.filterParagraphs) {
    window.filterParagraphs = function(){
      try {
        var input = document.getElementById('search-input');
        var query = (input && input.value ? input.value : '').trim().toLowerCase();
        var paragraphs = document.querySelectorAll('.characterParagraph');
        paragraphs.forEach(function(paragraph){
          var paragraphText = (paragraph.textContent || '').toLowerCase();
          var isMatch = true;
          for (var i = 0; i < query.length; i++) {
            if (paragraphText.indexOf(query[i]) === -1) { isMatch = false; break; }
          }
          if (isMatch) paragraph.classList.remove('hidden'); else paragraph.classList.add('hidden');
        });
      } catch(_) {}
    };
  }

  document.addEventListener('DOMContentLoaded', function(){
    // 初始化 Foundation（一次）
    try { $(document).foundation(); } catch(_) {}

    // 召唤基础区块
    safeRun(typeof window.summonCharacters === 'function' ? window.summonCharacters : null);

    var afterSkills = (typeof window.summonCharacterSkill === 'function')
      ? Promise.resolve(window.summonCharacterSkill())
      : Promise.resolve();

    afterSkills.then(function(){
      safeRun(function(){ return window.decompress && window.decompress('base/compression.json'); });
      safeRun(function(){ return window.replace_character_name && window.replace_character_name('http://localhost:3000/api/character'); });
      safeRun(function(){ return window.replace_skill_name && window.replace_skill_name('http://localhost:3000/api/skill' + (localStorage.getItem('strength') || '')); });
      safeRun(function(){ return window.replace_card_name && window.replace_card_name('http://localhost:3000/api/card'); });
      safeRun(function(){ return window.check_strength && window.check_strength(); });
      safeRun(function(){ return window.add_button_wave && window.add_button_wave(); });
      safeRun(function(){ return window.replace_term && window.replace_term('http://localhost:3000/api/term-dynamic', 1); });
      safeRun(function(){ return window.replace_term && window.replace_term('http://localhost:3000/api/term-fixed', 1); });
      setTimeout(function(){ try { window.pronounCheck && window.pronounCheck(); } catch(_) {} }, 100);
    }).catch(function(_){});
  });
})();
