# 典型 Bug 经验库

## 使用方式

- 在处理非平凡 bug、回归、用户可见异常、局部成功/新旧行为混合、运行时结果与源码预期不一致，或任务涉及多入口渲染、多数据源、缓存/预加载、异步时序、状态同步、权限/i18n、浏览器差异、重复 owner 时，先搜索本文件是否有相似现象。
- 用户当前页面与干净页面表现不同、验证结果被用户反馈推翻、日志/工具输出与先前判断冲突时，也要回到本文件查相似根因。
- 新增条目前先合并相邻同类经验；同一根因只保留一个主条目，补充新的信号和验证办法。
- 每条记录应包含：现象信号、常见误导、根因、排查步骤、修复方向、验证入口。

## JSON 预加载缓存导致新逻辑配旧数据

**现象信号**

- 页面标题、按钮状态或外层逻辑已经变成新行为，但列表行、帮助内容、公告内容仍像旧版本。
- 本地文件结构看起来正确，干净刷新也可能正确，但用户当前页面或预热路径仍显示旧内容。
- JS 文件带 `?v=` 版本号，JSON 数据文件不带版本号，并且通过预加载或通用缓存读取。

**常见误导**

- 只验证源码里的 JSON 结构，忽略运行时实际拿到的数据对象。
- 只验证新打开的干净页面，忽略用户已有页面中的内存缓存或预加载缓存。
- 看到标题来自新 JS 就误以为整套数据也已刷新。

**根因模式**

- `AppPreload.json()`、`fetchJsonCached()` 或类似 JSON helper 以 URL 为 key 缓存 Promise。
- 调用方传了 `{ cache: 'no-cache' }`，但 helper 没有尊重该选项，仍直接返回旧内存 Promise。
- 同一 JSON 既被静态预加载，又被具体功能预热，形成多入口竞速或旧缓存复用。

**排查步骤**

1. 在浏览器运行时比较内存数据和强制新取数据：`AppPreload.json(path)` 对比 `fetch(path, { cache: 'no-cache' }).then(r => r.json())`。
2. 检查数据 shape，而不只看 UI 文本：例如 `Array.isArray(data.panels.panel_draft)`、`Object.keys(...)`。
3. 搜索同一 JSON 是否存在多个预加载入口：`AppPreload.json(`、`preload.json(`、`fetchJsonCached(`。
4. 若 JS 带版本号而 JSON 不带版本号，必须验证缓存 helper 是否支持失效语义。

**修复方向**

- 让通用 JSON 缓存尊重 `cache: 'no-cache'`、`reload`、`no-store`：需要绕过旧内存值，并在成功后刷新或不写入缓存。
- 同一功能数据尽量保留一个预热 owner，避免静态预加载和功能预热各自抢先写入同一缓存。
- 用户可见配置类 JSON（帮助、公告、i18n 等）在调试/预热路径中优先使用明确的失效策略。

**验证入口**

- 用用户当前入口复测，而不只新开空白页面。
- 浏览器验证时同时断言标题/状态和内容行来自同一版数据。
- 对缓存类 bug，最终至少验证一次运行时数据 shape 与 UI 渲染结果。

## 移牌动画只查一个入口，忽略拖拽与同步的多 owner

**现象信号**

- 拖牌到角色摘要、头像、区域徽标等“非真实牌位”时，松手后拖拽牌突然消失，目标区域数量直接变化。
- 打开手牌/判定/装备等区域窗口后，窗口里已有真实牌位，但拖到摘要仍没有飞行动画。
- 拖到主手牌、处理区或区域窗口很顺滑，拖到摘要或长悬停切换区域却突兀，说明不同入口没有共用同一目标解析。
- 本地拖拽看起来已修好，但在线同步接收端仍飞向摘要；说明拖拽幽灵动画和同步移牌动画还有两套端点解析 owner。
- 同步移牌到处理区时，真实目标牌会显示“由谁置入”等附加信息，但飞行动画 ghost 不显示，落点才突然出现 label；或 label 被牌面/牌背文本样式影响，和牌名挤在一起。
- 小屏或非标准窗口下真实牌已缩小，但同步动画飞向角色摘要时 ghost 从小牌变大，说明 fallback 锚点尺寸没有沿用当前牌的实际 rect。
- 同步动画终点整体比最终牌偏右/偏下一个固定像素值时，检查页面是否启用了 `scrollbar-gutter: stable both-edges` 或其他会改变 fixed 层原点的布局机制。
- 区域中间移走或插入一张牌时，左侧牌正常、右侧牌整体跳一下，说明列表渲染可能按 index 复用 DOM，而布局 FLIP 却假设 DOM 节点代表同一张牌。

**常见误导**

- 以为是模型先删除再置入，实际模型移动可能正确，问题在拖拽幽灵找不到动画终点。
- 只用 `document.querySelector('[data-drop-zone="..."]')` 找第一个区域，忽略同一 `data-drop-zone` 可能同时出现在摘要锚点和打开的 CardViewer 窗口里。
- 只验证有占位符的容器，不验证 `data-accept-placeholder="false"` 的摘要/头像类目标。
- 只验证本机拖拽，不验证远端同步的 `snapshotBeforeMove()` / `animateAfterMove()` 路径。
- 同页手写 `snapshotBeforeMove → moveCardToArea → updateUI → animateAfterMove` 通过后就认为在线同步已通过，漏掉真实 `sync_manager.onRemoteAction()` 的 payload、视角和窗口状态。

**根因模式**

- 摘要类 drop zone 不接收 `.card-placeholder`，移动后不会在摘要内部产生真实牌节点。
- 目标区域窗口打开时，真实牌节点在后追加的 CardViewer 中；第一个匹配的 drop zone 可能是摘要，里面找不到牌。
- 找不到目标牌后走 fallback 直接移除拖拽幽灵，没有回退到摘要、头像、徽标或主视角锚点。
- 同步动画使用 `player:N:hand` / `player:N:judgeArea` 模型路径，CardViewer 使用 `role:id` / `role-judge:id` drop-zone；两套命名没通过共享 resolver 对齐。
- ghost 外观如果只克隆源牌，或读取目标 DOM 时剥掉 `.card-mover-label`，就会漏掉处理区这类目标区域附加信息；如果标注和牌面共用同一个 `innerHTML`，`CardBack` 的透明文字和牌名布局也会影响标注。
- 非真实牌位锚点如果用 `--card-w` / `--card-h` 造 fallback rect，而不是用起始牌当前 `getBoundingClientRect()` 尺寸，会在动态缩放下出现飞行中变大。
- `getBoundingClientRect()` 返回视口坐标，但 fixed ghost 的 `left: 0` 在保留滚动槽时可能不是视口物理 0；直接把 rect 坐标写进 fixed transform 会把 fixed 原点偏移叠加一次。
- `renderCardList()` 如果用“当前位置第 N 个 DOM”承载“新数据第 N 张牌”，中间删除时右侧 DOM 的内容会立刻换成邻居；`animateLayoutShift()` 再按旧 DOM 元素做 FLIP，就不是同一张牌的旧/新位置。

**排查步骤**

1. 搜索拖拽收尾逻辑里的 `data-drop-zone` 查询，确认是否只取第一个匹配元素。
2. 对同一目标区域同时检查摘要锚点和打开的区域窗口：`querySelectorAll('[data-drop-zone]')` 后按属性值过滤。
3. 验证 `data-accept-placeholder="false"` 分支是否有真实牌位、可见窗口牌位、摘要锚点三层回退。
4. 搜索同步动画 owner：`CardMoveAnimator.snapshotBeforeMove()`、`animateAfterMove()`、`sync_manager.onRemoteAction()`，确认它们是否也消费同一套端点解析。
5. 验证同步时优先触发或模拟 `sync_manager.onRemoteAction()` / `RoomClient` 的 `gameAction`，不要只手写模型移动序列。
6. 用浏览器记录本地拖拽和同步弧线动画的目标元素，确认它是窗口里的 `.card-placeholder` 或摘要/主视角锚点，而不是空目标 fallback。

**修复方向**

- 对远端/摘要类 drop 先查所有同名 drop zone，优先使用包含真实 `.card-placeholder` 的窗口或可见容器。
- 把 `player:N:*` 模型路径与 `role:*` / `role-judge:*` / viewer slot drop-zone 的映射收敛到共享 resolver，让拖拽和同步动画共同消费。
- 没有真实牌位时，飞向角色摘要、主视角头像、判定徽标或手牌容器等稳定锚点，并保持拖拽牌尺寸居中收束。
- 非卡牌锚点不要按 `.card-placeholder` 处理：不要隐藏目标元素，不要强行恢复占位符样式。
- 同步 ghost 的最终外观应优先吸收目标区域的可见附加 DOM；牌面/牌背放在 face 层，置入者等标注放在 annotations 层，背面牌也应显示标注。
- 飞向摘要、头像、徽标等非牌位锚点时，目标矩形使用起始牌实际尺寸居中到锚点，避免动态缩放下从小变大。
- fixed ghost 使用 `getBoundingClientRect()` 坐标时，先测量一个 `position: fixed; left:0; top:0` 探针的实际 rect，并从 transform 坐标中扣除该 fixed 层原点。
- 可移动列表中的牌节点必须按 `card.id` 复用并按数据顺序重排 DOM；只有这样布局 FLIP 才是在“同一张牌”的旧 rect 和新 rect 之间动画。

**验证入口**

- 导航栏点对局 → 开始沙盒对局 → 打开目标角色手牌窗口 → 从主视角手牌拖到该角色摘要，确认牌飞向手牌窗口里的新增位置。
- 导航栏点对局 → 打开目标角色判定窗口 → 拖牌到该角色摘要并悬停到“判定区”状态后松手，确认牌飞向判定窗口里的新增位置。
- 关闭窗口后重复拖到摘要，确认拖拽牌飞向摘要/头像锚点，而不是直接消失。
- 在线或模拟同步路径：玩家 B 打开玩家 C 的手牌/判定窗口，玩家 A 移牌到玩家 C 对应区域，确认玩家 B 看到飞行动画进入打开窗口；关闭窗口后才飞向玩家 C 摘要。