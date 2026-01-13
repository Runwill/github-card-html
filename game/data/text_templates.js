// 对 HTML 标签支持的 i18n 逻辑的覆盖/补充
(function() {
    if (!window.Game || !window.Game.UI) return;
    
    // 注册 GameText 的模板
    // 键对应于：
    // 1. 面包屑节点名称（Turn, preparing 等）
    // 2. 时机节点名称（beforeTurnStart 等）
    // 3. 区域名称（hand, treatmentArea）
    
    // 逻辑：
    // 如果键存在于术语结构（JSON）中，默认行为（<Key></Key>）工作正常。
    // 如果它需要参数（Round），我们在下面定义它。
    
    const templates = {
        // 动态回合
        'Round': '第 {n}&nbsp;<round></round>',
        
        // 回合（带有玩家信息 - 在 renderers 逻辑中处理，但我们可以在此处定义部分）
        // 但是 renderers.js 目前将“Index Name”和“Turn”分开。
        // 让我们在这里定义原子术语。
        'Turn': '<turn></turn>', 
        
        // 阶段（通常只是术语本身）
        'preparing': '<preparing></preparing>',
        'dealing': '<dealing></dealing>',
        'getting': '<getting></getting>',
        'acting': '<acting></acting>',
        'throwing': '<throwing></throwing>',
        'concluding': '<concluding></concluding>',

        // 区域（确保它们映射到术语）
        'hand': '<hand></hand>',
        'equipArea': '<equipArea></equipArea>',
        'judgeArea': '<judgeArea></judgeArea>',
        'treatmentArea': '<treatmentArea></treatmentArea>',
        'discardPile': '<discardPile></discardPile>',
        'drawPile': '<drawPile></drawPile>',

        // 体力事件
        'Recover': '<recover></recover>',
        'Loss': '<loss></loss>',
        'Cure': '<cure></cure>',
        'Damage': '<damage></damage>',

        // Recover 时机
        'beforeRecover': '<beforeRecover></beforeRecover>',
        'whenRecover': '<whenRecover></whenRecover>',
        'afterRecover': '<afterRecover></afterRecover>',

        // Loss 时机
        'beforeLoss': '<beforeLoss></beforeLoss>',
        'whenLoss': '<whenLoss></whenLoss>',
        'afterLoss': '<afterLoss></afterLoss>',

        // Cure 时机
        'beforeCure': '<beforeCure></beforeCure>',
        'beforeCured': '<beforeCured></beforeCured>',
        'whenCure': '<whenCure></whenCure>',
        'whenCured': '<whenCured></whenCured>',
        'afterCure': '<afterCure></afterCure>',
        'afterCured': '<afterCured></afterCured>',

        // Damage 时机
        'beforeDamage': '<beforeDamage></beforeDamage>',
        'beforeDamaged': '<beforeDamaged></beforeDamaged>',
        'whenDamage': '<whenDamage></whenDamage>',
        'whenDamaged': '<whenDamaged></whenDamaged>',
        'afterDamage': '<afterDamage></afterDamage>',
        'afterDamaged': '<afterDamaged></afterDamaged>'
    };

    // 如果可用，注入 GameText
    if (window.Game.UI.GameText) {
        window.Game.UI.GameText.registerTemplates(templates);
    } else {
        // 重试/等待？或者假设加载顺序正确（如果我们将此放入 game_main 或类似位置，text_renderer 在此之前加载）
        // 实际上，我们暂时将此逻辑放入 text_renderer.js 默认配置中，
        // 或者让配置文件处理它。
        // 对于这一步，这已经是 text_renderer.js 中的默认配置。
        // 我将更新 text_renderer.js 以包含这些扩展的默认值。
    }
})();