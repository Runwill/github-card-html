function replace_term(path, mode, paragraphs = document) {
    // 返回 Promise，供进度条与启动流程感知完成时机
    return fetchJsonCached(path).then(term => {
        // [Optimization] 使用 Map 提升术语查找性能，便于 MutationObserver 复用
        // key: 术语英文标签名 (大写), value: 术语对象
        const termMap = new Map();
        for (var k in term) {
            // 注意：原文使用 term[i].en 作为标签名，这里做一下映射缓存
            // term[k].en 可能是标签名如 "PRONOUN1"
            if (term[k].en) {
                termMap.set(term[k].en.toUpperCase(), { index: k, data: term[k] });
            }
        }

        // 定义处理单个节点的函数 (核心逻辑抽取)
        const processNode = (node, termData, index) => {
            // 防止重复处理
            if (node.dataset.termProcessed) return;

            const $node = $(node);
            const t = termData;

            // 1. 文本替换逻辑 (cn/en/epithet/replace)
            // 不分段 (part 不存在) 或 分段处理逻辑有所不同
            if (!t.part) {
                // --- 非分段术语替换 ---
                // 仅在未标记 irreplaceable 且配置允许时执行文本替换
                if (!$node.hasClass('irreplaceable') && !t.irreplaceable) {
                    if (!t.epithet) {
                        if (t.cn) {
                            if (t.replace) $node.html(t.replace);
                            else $node.html(t.cn);
                        } else {
                            $node.html(t.en);
                        }
                    } else {
                        const epithetIdx = node.getAttribute("epithet");
                        if (!epithetIdx) $node.html(t.epithet[0].cn);
                        else $node.html(t.epithet[epithetIdx]?.cn || t.epithet[0].cn);
                    }
                }

                // --- 交互绑定 (mode开启时) ---
                // 即使 irreplaceable，原逻辑通常也会绑定高亮与交互
                if (mode) {
                    // 双击滚动
                    $node.off('dblclick.termScroll').on('dblclick.termScroll', function (event) {
                        event.stopPropagation();
                        scrollActions.scrollToTagAndFlash('panel_term', event.currentTarget.tagName, { behavior: 'smooth', stop: true });
                    });
                    
                    // 高亮
                    node.i = index; // 存储索引供 highlight 使用
                    if (typeof termHighlight === 'function') {
                        // 移除旧绑定防止重复
                        $node.off('mouseover.termHl mouseout.termHl'); 
                        termHighlight(term, node);
                    }
                }
            } else {
                // --- 分段术语替换 (Compound Terms) ---
                // 分段术语通常是父容器，具体的替换发生在子元素上
                // 分段父容器即便有 irreplaceable，也不应阻止 parts 的替换(除非 parts 自己有 irreplaceable)
                // 也不应阻止整体绑定
                
                // Parts 替换
                for (var j in t.part) {
                    const subPart = t.part[j];
                    const $subNodes = $node.find(subPart.en); // 在当前 scope 下寻找
                    
                    $subNodes.each(function() {
                        const $sub = $(this);
                        if (!$sub.hasClass('irreplaceable')) {
                            if (subPart.hasOwnProperty('replace')) $sub.html(subPart.replace);
                            else $sub.html(subPart.cn);
                        }
                    });
                }

                // 交互绑定
                if (mode) {
                   // 父级处理
                   node.i = index;
                   
                   // 高亮 (Divided mode)
                   if(typeof termHighlight === 'function') {
                       $node.off('mouseover.termHl mouseout.termHl');
                       termHighlight(term, node, 'divided');
                   }

                   // 双击滚动 (Main Term)
                   $node.off('dblclick.termScroll').on('dblclick.termScroll', function(event){
                       event.stopPropagation();
                       scrollActions.scrollToTagAndFlash('panel_term', t.en, { behavior: 'smooth', stop: true });
                   });

                   // 子元素交互 (Parts)
                   for (var j in t.part) {
                       if (t.part[j].termedPart) {
                           $node.find(t.part[j].en).each((_, subEl) => {
                               subEl.i = index;
                               subEl.j = j;
                               const $subEl = $(subEl);
                               
                               // 高亮 (Part mode)
                               if(typeof termHighlight === 'function') {
                                   $subEl.off('mouseover.termHl mouseout.termHl');
                                   termHighlight(term, subEl, 'part');
                               }

                               // 双击滚动 (Part)
                               $subEl.off('dblclick.termScroll').on('dblclick.termScroll', function(event){
                                   event.stopPropagation();
                                   scrollActions.scrollToTagAndFlash('panel_term', t.part[event.currentTarget.j].en, { behavior: 'smooth', stop: true });
                               });
                           });
                       }
                   }
                }
            }
            
            // 标记已处理
            node.dataset.termProcessed = "true";
        };

        // 适配器：将 scanAndObserve 的 (node) 调用转换为 processNode(node, data, index)
        const processLogic = (node) => {
             const tag = node.tagName;
             if (termMap.has(tag)) {
                 const { index, data } = termMap.get(tag);
                 processNode(node, data, index);
             }
        };

        // 通用扫描与监听器（replace_common.js 提供）
        scanAndObserve({
            root: paragraphs,
            processor: processLogic,
            dataKey: 'termProcessed',
            tagNameMap: termMap
        });
    });
}

// ----------------------------------------------------------------
// 代词 (Pronoun) 系统集成
// ----------------------------------------------------------------
(function(){
  /**
   * 处理代词显示切换按钮点击事件
   * @param {Event} event 
   */
  function pronounReplaceCheck(event){
    const btn = event.target;
    // 确保 term_status 全局变量存在
    window.term_status = window.term_status || {};
    // 切换状态 (1 -> 0, other -> 1)
    const isOn = Number(window.term_status['pronoun']) === 1 ? 0 : 1;
    
    // 应用按钮样式状态
    if (typeof ButtonUtils !== 'undefined' && ButtonUtils.applyButtonState) {
        ButtonUtils.applyButtonState(btn, isOn === 1);
    }
    
    window.term_status['pronoun'] = isOn;
    pronounCheck(); // 触发页面更新
  }

  /**
   * 根据当前状态检查并更新页面中的代词显示
   * @param {HTMLElement|Document} paragraphs 作用范围，默认为 document
   */
  function pronounCheck(paragraphs = document){
    window.term_status = window.term_status || {};
    const on = Number(window.term_status['pronoun']) === 1;
    // 规范化状态值
    window.term_status['pronoun'] = on ? 1 : 0;
    
    if(on){
      add_pronoun(paragraphs);
      return;
    }
    // 关闭：移除已添加的 <pronounName>（DOM 级删除）
    for(const i of [1, 2, 3]){
      // 查找所有代词标签
      $(paragraphs).find('pronoun'+i).each(function(){
        // 删除所有子级中的 <pronounName>
        this.querySelectorAll('pronounName').forEach(node => node.remove());
      });
    }
  }

  /**
   * 向代词标签内添加可视化的名称标记
   * @param {HTMLElement|Document} paragraphs 
   */
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