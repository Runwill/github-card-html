(function(){
  function pronounReplaceCheck(event){
    const btn = event.target;
    const isOn = Number(term_status['pronoun']) === 1 ? 0 : 1; // 反转
    ButtonUtils.applyButtonState(btn, isOn === 1);
    term_status['pronoun'] = isOn;
    pronounCheck();
  }

  function pronounCheck(paragraphs = document){
    const on = Number(term_status['pronoun']) === 1;
    term_status['pronoun'] = on ? 1 : 0;
    if(on){
      add_pronoun(paragraphs);
      return;
    }
    for(const i of [1, 2, 3]){
      $(paragraphs).find('pronoun'+i).each(function(){
        if(this.innerHTML.endsWith('</pronounname>')){
          this.innerHTML = this.innerHTML.slice(0, -28);
        }
      });
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
