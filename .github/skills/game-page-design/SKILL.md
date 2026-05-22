---
name: game-page-design
description: "Use when: 修改对局页、牌区、角色摘要、手牌/判定/装备/处理区、拖拽移牌、同步动画、在线房间、CardViewer、GameState、moveCardToArea、game visual design。"
argument-hint: "说明对局页逻辑、动画、区域或视觉问题"
user-invocable: true
---

# 对局页逻辑与视觉设计

## 何时使用

- 修改对局页布局、牌渲染、角色摘要、当前角色面板、在线房间、区域窗口或右键菜单。
- 修改拖拽、移牌、同步、动画、可见性、装备区、判定区、处理区逻辑。
- 排查本地操作和在线同步表现不一致的问题。

## 必读上下文

1. 先读 `ARCHITECTURE.md` 的对局相关文件表和帮助速查第 10 节。
2. 逻辑改动先读 `game/scripts/core/models.js`、`game/scripts/game_controller_dispatch.js`、相关 `game/scripts/online/*.js`。
3. 动画改动读 `game/scripts/ui/interactions/animation.js`、`card_move_animator.js`、`card_move_animation.js`。
4. 视觉改动读 `REFACTOR_DYNAMIC_CSS.md` 和相关 `style/media/*.css`、`game/styles/*.css`。

## 逻辑原则

- 移牌和可见性以 `window.Game.Models.moveCardToArea()` 和 `applyCardVisibility()` 为中心，不在多个入口手写不同逻辑。
- 牌的真实位置由 `Card.lyingArea` 和区域 `cards` 共同表达；修改后必须保持一致。
- 装备区真实结构是 `player.equipArea` 的 child Areas；`player.equipSlots` 只作为兼容别名和便捷索引。新逻辑应通过 `Models.getEquipSlotAreas()`、`getEquipSlotArea()`、`getDefaultEquipSlotArea()` 或区域 path 解析到具体槽位，不再直接手写 `equipSlots` 解析。
- 区域路径使用统一格式：`pile`、`discardPile`、`treatmentArea`、`player:N:hand`、`player:N:judgeArea`、`player:N:equip:M`。
- 在线同步要同时考虑本地发起、远端接收、快照前后、`updateUI()` 后动画四个阶段。
- 牌面可见性必须尊重区域规则：手牌默认仅拥有者可见，公共区按区域配置显示。

## 视觉与交互原则

- 对局页是高密度操作界面，优先保证信息扫描、拖拽命中、角色状态识别和牌区可读性。
- 角色摘要、当前角色面板、牌区、区域窗口和右键菜单必须共享动态缩放原则，不靠小屏隐藏功能。
- 牌距可以压缩，但不要让布局算法产生无法解释的负间距下限；视觉重叠应是明确设计，不是溢出副作用。
- 牌区布局模式的 owner 是 `.area-spread` / `.area-stacked` / `.area-centered` / `.area-left`；手牌、处理区、牌堆、弃牌堆不要用父级特化选择器重复定义同一组 `gap`、`flex-wrap`、`position`、`display` 或 `padding`。
- 删除牌区相关 `!important` 时，必须检查手牌、处理区、牌堆、弃牌堆在平铺/堆叠模式下的 computed style；尤其注意 `.player-hand ...`、`.treatment-container ...` 这类 specificity 更高的旧规则是否抢回模式 owner。
- 动画优化优先减少 DOM 读取、重复渲染和无用回调；不要轻易改变路径、时长、弧度或淡出阈值。
- 同步移牌动画的端点应以实际牌或摘要锚点为准；摘要到同摘要时使用可感知的回环动画，而不是看起来不动。
- 在线 viewer 徽标、摘要按钮、装备名标签不能遮挡头像和状态信息。

## 修改流程

1. 先判断是模型问题、调度问题、同步问题、渲染问题、动画问题还是 CSS 问题。
2. 找所有入口：拖拽、右键、按钮、区域窗口、在线同步、沙盒引擎。
3. 能共用模型/调度逻辑就共用，不新增只服务单一路径的平行移牌逻辑。
4. 改 UI 功能后同步 `base/help.json` 和 `i18n/strings.js` 的对局速查。
5. 改脚本或样式后刷新 `index.html` 对应资源版本。
6. 用户可见改动更新 `base/announcements.json`。

## 验收

- 本地拖拽、右键、按钮、区域窗口拖牌都要考虑。
- 在线改动至少逻辑检查主机/加入者/旁观者路径；可运行双客户端时再做真实同步验证。
- 检查手牌、牌堆、弃牌堆、处理区、判定区、四个装备槽；牌区 CSS 改动要分别验证平铺和堆叠模式的间距、换行、牌背定位、拖拽占位和命中状态。
- 检查标准窗口和强制横屏下牌区、摘要、区域窗口不遮挡、不丢功能。
