function elementReplaceCheck(key, name, event){
    const clickedButton = event.target;
    const applyBlue = () => ButtonUtils.setButtonBlue(clickedButton);
    const applyRed = () => ButtonUtils.setButtonRed(clickedButton);
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

        if(cur >= partLength - 1){
            ButtonUtils.resetButtonColor(clickedButton);
            applyBlue();
            setStatus(0);
            doReplace(name + String(partLength - 1), name + '0');
        } else if(cur < partLength - 1){
            ButtonUtils.resetButtonColor(clickedButton);
            applyRed();
            setStatus(cur + 1);
            doReplace(name + String(cur), name + String(cur + 1));
        } else {
            ButtonUtils.resetButtonColor(clickedButton);
            applyRed();
            setStatus(1);
            doReplace(name + '0', name + '1');
        }
    });
}
function reset_color(target){ ButtonUtils.resetButtonColor(target); }

function elementReplace(name1, name2){
    ButtonUtils.replaceTag(name1, name2);
    if(typeof replace_term === 'function'){
        replace_term('http://localhost:3000/api/term-dynamic');
    }
}
// pronoun* 已拆分到 function/button/pronoun.js 中