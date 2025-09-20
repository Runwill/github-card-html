function elementHideCheck(name, event){
    const clickedButton = event.target;
    // 兼容未知初始值：将非1视作0
    const current = Number(term_status[name]) === 1 ? 1 : 0;
    const next = current ^ 1; // 翻转 0/1

    // 显示/隐藏并统一设置按钮颜色
    ButtonUtils.applyButtonState(clickedButton, next === 1);
    ButtonUtils.toggleDisplay(name, next === 1);

    term_status[name] = next;
}