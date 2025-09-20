function elementReplaceCheck(key, name, event){
    const clickedButton = event.target;
    const doReplace = (fromSel, toSel) => {
        ButtonUtils.replaceTag(fromSel, toSel);
        // 原逻辑：替换后刷新术语
        if(typeof replace_term === 'function'){
            replace_term('http://localhost:3000/api/term-dynamic');
        }
    };

    const setStatus = (v) => { term_status[name] = v; };

    // 引入缓存的数据源
    const getData = () => ButtonUtils.getTermDynamic('http://localhost:3000/api/term-dynamic');

    getData().then(term => {
        const targetObject = term.find(item => item.en === key);
        const partLength = targetObject ? targetObject.part.length : 0;
        const cur = Number(term_status[name] || 0);

        // 当长度不可用时，按二态切换
        if(!partLength || partLength <= 1){
            const next = cur ^ 1;
            // 按原语义：0 为 Blue，其它为 Red
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