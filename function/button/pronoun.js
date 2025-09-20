(function(){
  function pronounReplaceCheck(event){
    const btn = event.target;
    const isOn = Number(term_status['pronoun']) === 1;
    ButtonUtils.resetButtonColor(btn);
    if(!isOn){
      ButtonUtils.setButtonBlue(btn);
      term_status['pronoun'] = 1;
    } else {
      ButtonUtils.setButtonRed(btn);
      term_status['pronoun'] = 0;
    }
    pronounCheck();
  }

  function pronounCheck(paragraphs = document){
    if(term_status['pronoun'] != 0){
      term_status['pronoun'] = 1;
      add_pronoun(paragraphs);
    } else {
      term_status['pronoun'] = 0;
      for(const i of [1, 2, 3]){
        $(paragraphs).find('pronoun'+i).each(function(){
          if(this.innerHTML.endsWith('</pronounname>')){
            this.innerHTML = this.innerHTML.slice(0, -28);
          }
        });
      }
    }
  }

  function add_pronoun(paragraphs = document){
    const pronounName = ['甲','乙','丙'];
    for(const i of [1, 2, 3]){
      $(paragraphs).find('pronoun'+i).each(function(){
        if(!this.innerHTML.endsWith('</pronounname>')){
          this.innerHTML = this.innerHTML + '<pronounName>' + pronounName[i-1] + '</pronounName>';
        }
      });
    }
  }

  // 暴露到全局以兼容现有调用
  window.pronounReplaceCheck = pronounReplaceCheck;
  window.pronounCheck = pronounCheck;
  window.add_pronoun = add_pronoun;
})();
