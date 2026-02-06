function elementReplaceCheck(key, name, event){
    const clickedButton = event.target;

    /**
     * 替换自定义标签并更新显示文本。
     * replaceTag 创建全新 DOM 节点，原节点上的 data-term-processed 标记
     * 和 replace_term 绑定的事件/属性会丢失。因此需要：
     *  1. 清除父级的 termProcessed 标记，使 replace_term 能重新处理
     *  2. 以 mode=1 调用 replace_term，恢复文本替换与交互绑定
     */
    const doReplace = (fromSel, toSel) => {
        // 在替换前记住所有待替换元素的父级（分段术语的容器）
        const parents = new Set();
        document.querySelectorAll(fromSel).forEach(el => {
            if (el.parentNode) parents.add(el.parentNode);
        });

        ButtonUtils.replaceTag(fromSel, toSel);

        // 清除父级的 termProcessed 标记，使 replace_term 能重新扫描
        parents.forEach(p => { if (p.dataset) delete p.dataset.termProcessed; });

        if(typeof replace_term === 'function'){
            replace_term(endpoints.termDynamic(), 1);
        }
    };

    const setStatus = (v) => { term_status[name] = v; };

    // 引入缓存的数据源
    const getData = () => ButtonUtils.getTermDynamic(endpoints.termDynamic());

    getData().then(term => {
        const targetObject = term.find(item => item.en === key);
        const partLength = targetObject ? targetObject.part.length : 0;
        const cur = Number(term_status[name] || 0);

        // 当长度不可用时，按二态切换
        if(!partLength || partLength <= 1){
            const next = cur ^ 1;
            ButtonUtils.applyButtonState(clickedButton, next === 0);
            setStatus(next);
            doReplace(name + String(cur), name + String(next));
            return;
        }

        // 多段循环切换：0 -> 1 -> ... -> N-1 -> 0
        const next = (cur + 1) % partLength;
        ButtonUtils.applyButtonState(clickedButton, next === 0);
        setStatus(next);
        doReplace(name + String(cur), name + String(next));
    });
}
// pronoun* 已拆分到 function/button/pronoun.js 中