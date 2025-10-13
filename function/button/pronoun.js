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
    // 关闭：移除已添加的 <pronounName>（DOM 级删除，避免字符串截断问题与多次叠加）
    for(const i of [1, 2, 3]){
      $(paragraphs).find('pronoun'+i).each(function(){
        // 删除所有子级中的 <pronounName>
        this.querySelectorAll('pronounName')?.forEach(node=> node.remove());
      });
    }
  }

  function add_pronoun(paragraphs = document){
    const pronounName = ['甲','乙','丙'];
    for(const i of [1, 2, 3]){
      $(paragraphs).find('pronoun'+i).each(function(){
        // 若不存在 <pronounName> 子节点，则添加一个；存在则不重复添加
        if(!this.querySelector('pronounName')){
          const node = document.createElement('pronounName');
          node.textContent = pronounName[i-1];
          this.appendChild(node);
        }
      });
    }
  }

  // 暴露到全局以兼容现有调用
  window.pronounReplaceCheck = pronounReplaceCheck;
  window.pronounCheck = pronounCheck;
  window.add_pronoun = add_pronoun;
})();
