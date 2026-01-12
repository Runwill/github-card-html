function replace_term(path, mode, paragraphs = document) {
    // 返回一个 Promise，便于上层加载进度等待替换完成
    return new Promise((resolve, reject) => {
    fetchJsonCached(path).then(term => {
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
            
            // 标记已处理 (注意: 这里仅仅标记父容器; 内部子元素如 pronoun 如果是独立术语, 会在 MutationObserver 的深度扫描中被独立处理, 并获得自己的 termProcessed 标记)
            node.dataset.termProcessed = "true";
        };

        // --- 批量初始化 (初始执行) ---
        for (var i in term) {
            const selector = term[i].en;
            if(!selector) continue;
            
            $(paragraphs).find(selector).each(function() {
                processNode(this, term[i], i);
            });
        }
        
        // --- 动态监听 (MutationObserver) ---
        // 允许后续动态插入的 HTML (如 AJAX 加载、动态生成的卡片) 自动应用术语效果
        // 仅在 mode=true (通常是 dynamic term) 时开启，或者全局开启
        if (window.MutationObserver) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.addedNodes.length) {
                        mutation.addedNodes.forEach((node) => {
                            if (node.nodeType === 1) { // ELEMENT_NODE
                                // 1. 检查节点本身是否是术语标签
                                const tagName = node.tagName;
                                if (termMap.has(tagName)) {
                                    const { index, data } = termMap.get(tagName);
                                    processNode(node, data, index);
                                }
                                
                                // 2. 检查节点内部是否包含术语标签 (深度查找)
                                // 遍历 termMap 中所有可能的选择器 (性能优化: 仅查找存在的自定义标签)
                                // 由于 querySelectorAll 性能开销，这里可以用 TreeWalker 或者 简单 find
                                // 为了简单可靠，我们再次遍历 termMap 的 keys
                                // 优化：仅当 addedNode 可能是容器时才查。
                                
                                // 这里使用 jQuery 的 find，配合 Map 的 keys
                                // 但遍历 Map keys 太多可能慢。
                                // 反向思路：查找 node 下的所有自定义标签元素? 
                                // 现在的术语标签形如 <PRONOUN1>, <TICK> 等。
                                // 我们可以查找所有非标准 HTML 标签，或者直接全量匹配。
                                // 鉴于 term 数量有限，循环匹配是可接受的。
                                
                                termMap.forEach(({ index, data }, tagKey) => {
                                    // 查找新插入节点内部的术语
                                    const $found = $(node).find(data.en);
                                    $found.each(function() {
                                        // 避免重复处理
                                        if (!this.dataset.termProcessed) {
                                            processNode(this, data, index);
                                        }
                                    });
                                });
                            }
                        });
                    }
                });
            });

            // 观察配置
            const config = { childList: true, subtree: true };
            // 观察目标：paragraphs (通常是 document 或 specific container)
            // 注意：观察 document.body 可能性能消耗较大，最好限定范围
            const targetNode = (paragraphs === document) ? document.body : paragraphs;
            if(targetNode) observer.observe(targetNode, config);
            
            // 存储 observer 以便销毁 (如果需要)
            if(!window.termObservers) window.termObservers = [];
            window.termObservers.push(observer);
        }

        // 所有替换与事件绑定完成 (同步部分)
        resolve();
    }).catch(reject);
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