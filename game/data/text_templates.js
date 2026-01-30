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
        // 修正：将 drawPile 映射到实际存在的术语标签 <pile>
        'drawPile': '<pile></pile>',
        'pile': '<pile></pile>',

        // 卡牌 (Standard Cards, Hardcoded based on panel_card.html)
        'attack': '<attack></attack>',
        'dodge': '<dodge></dodge>',
        'deliver': '<deliver></deliver>',
        
        // Game 时机
        'beforeGameStart': '<beforeGameStart></beforeGameStart>',
        'whenGameStart': '<whenGameStart></whenGameStart>',

        // 轮 (Round) 相关时机
        'beforeRoundStart': '<beforeRoundStart></beforeRoundStart>',
        'whenRoundStart': '<whenRoundStart></whenRoundStart>',
        'whenRoundFinish': '<whenRoundFinish></whenRoundFinish>',
        'afterRoundFinish': '<afterRoundFinish></afterRoundFinish>',

        // 体力事件
        'Recover': '<recover><recoverBody></recoverBody></recover>',
        'Loss': '<loss><lossBody></lossBody></loss>',
        'Cure': '<cure><cureEnd></cureEnd></cure>',
        'Damage': '<damage><damageEnd></damageEnd></damage>',

        // Recover 时机
        'beforeRecover': '<beforeRecover><recoverBody></recoverBody><beforeEnd></beforeEnd></beforeRecover>',
        'whenRecover': '<whenRecover><recoverBody></recoverBody><whenEnd></whenEnd></whenRecover>',
        'afterRecover': '<afterRecover><recoverBody></recoverBody><afterEnd></afterEnd></afterRecover>',

        // Loss 时机
        'beforeLoss': '<beforeLoss><lossBody></lossBody><beforeEnd></beforeEnd></beforeLoss>',
        'whenLoss': '<whenLoss><lossBody></lossBody><whenEnd></whenEnd></whenLoss>',
        'afterLoss': '<afterLoss><lossBody></lossBody><afterEnd></afterEnd></afterLoss>',

        // Cure 时机
        'beforeCure': '<beforeCure><dealtBody></dealtBody><cureEnd></cureEnd><beforeEnd></beforeEnd></beforeCure>',
        'beforeCured': '<beforeCured><takeBody></takeBody><cureEnd></cureEnd><beforeEnd></beforeEnd></beforeCured>',
        'whenCure': '<whenCure><dealtBody></dealtBody><cureEnd></cureEnd><whenEnd></whenEnd></whenCure>',
        'whenCured': '<whenCured><takeBody></takeBody><cureEnd></cureEnd><whenEnd></whenEnd></whenCured>',
        'afterCure': '<afterCure><dealtBody></dealtBody><cureEnd></cureEnd><afterEnd></afterEnd></afterCure>',
        'afterCured': '<afterCured><takeBody></takeBody><cureEnd></cureEnd><afterEnd></afterEnd></afterCured>',

        // Damage 时机
        'beforeDamage': '<beforeDamage><dealtBody></dealtBody><damageEnd></damageEnd><beforeEnd></beforeEnd></beforeDamage>',
        'beforeDamaged': '<beforeDamaged><takeBody></takeBody><damageEnd></damageEnd><beforeEnd></beforeEnd></beforeDamaged>',
        'whenDamage': '<whenDamage><dealtBody></dealtBody><damageEnd></damageEnd><whenEnd></whenEnd></whenDamage>',
        'whenDamaged': '<whenDamaged><takeBody></takeBody><damageEnd></damageEnd><whenEnd></whenEnd></whenDamaged>',
        'afterDamage': '<afterDamage><dealtBody></dealtBody><damageEnd></damageEnd><afterEnd></afterEnd></afterDamage>',
        'afterDamaged': '<afterDamaged><takeBody></takeBody><damageEnd></damageEnd><afterEnd></afterEnd></afterDamaged>',

        // Move 时机
        'Move': '<move><placeBody></placeBody></move>',
        'beforePlace': '<beforePlace><placeBody></placeBody><beforeEnd></beforeEnd></beforePlace>',
        'beforePlaced': '<beforePlaced><passive></passive><placeBody></placeBody><beforeEnd></beforeEnd></beforePlaced>',
        'whenPlace': '<whenPlace><placeBody></placeBody><whenEnd></whenEnd></whenPlace>',
        'whenPlaced': '<whenPlaced><passive></passive><placeBody></placeBody><whenEnd></whenEnd></whenPlaced>',
        'afterPlace': '<afterPlace><placeBody></placeBody><afterEnd></afterEnd></afterPlace>',
        'afterPlaced': '<afterPlaced><passive></passive><placeBody></placeBody><afterEnd></afterEnd></afterPlaced>'
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