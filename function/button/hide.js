function elementHideCheck(name, event){
    const clickedButton = event.target;
    // 兼容未知初始值：将非1视作0
    const current = Number(term_status[name]) === 1 ? 1 : 0;
    const next = current === 1 ? 0 : 1;

    if(next === 1){
        // 显示
        ButtonUtils.setButtonBlue(clickedButton);
        ButtonUtils.toggleDisplay(name, true);
    } else {
        // 隐藏
        ButtonUtils.setButtonRed(clickedButton);
        ButtonUtils.toggleDisplay(name, false);
    }

    term_status[name] = next;
}