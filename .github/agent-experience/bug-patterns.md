# 典型 Bug 经验库

## 使用方式

- 在处理非平凡 bug、回归、用户可见异常、局部成功/新旧行为混合、运行时结果与源码预期不一致，或任务涉及多入口渲染、多数据源、缓存/预加载、异步时序、状态同步、权限/i18n、浏览器差异、重复 owner 时，先搜索本文件是否有相似现象。
- 用户当前页面与干净页面表现不同、验证结果被用户反馈推翻、日志/工具输出与先前判断冲突时，也要回到本文件查相似根因。
- 新增条目前先合并相邻同类经验；同一根因只保留一个主条目，补充新的信号和验证办法。
- 每条记录应包含：现象信号、常见误导、根因、排查步骤、修复方向、验证入口。
- 命中某条经验后，不要只阅读正文；先把它转成当前任务的自检门禁，至少列出：相关 owner、必须覆盖的失败分支、状态组合、真实入口、无法验证的风险。实现和汇报都要对照这组门禁。
- 如果某条经验很长，优先抽取“本任务最相关的 3-5 个检查点”执行；不要用泛读代替检查。

## 共享动画类移除合成层提示导致边框跳变

**现象信号**

- 词元页、卡片列表、折叠区或其它带入场/显隐动画的卡片，在动画播放时边框颜色或粗细突然变深、变浅或抖动；动画结束后静态样式又正常。
- 回退到旧提交后问题消失，但样式 diff 里没有直接改 `border`、`border-color`、`box-shadow` 或主题 token。
- 问题只在带 `.animate-in`、`.visible` 等共享动画类的元素上出现，静止状态、普通 hover 或不播放动画的卡片不复现。

**常见误导**

- 只搜索边框颜色、边框宽度和 token，忽略浏览器合成层变化会影响动画中的次像素边框渲染。
- 以为删除 `will-change` 一定只是性能优化，不会改变用户可见视觉。
- 一次删除多处 `will-change` / `backface-visibility` / `translateZ(0)` 后，只按文件或模块猜测，没有继续做二分恢复。

**根因模式**

- 共享动画类原本通过 `will-change: transform, opacity` 提前创建合成层，动画期间边框、阴影和半透明背景在稳定的合成上下文里渲染。
- 清理时删除 `.animate-in, .visible { will-change: transform, opacity; }` 后，元素动画期间回到普通绘制/合成路径；transform/opacity 动画叠加边框时出现次像素抗锯齿差异，表现为边框颜色或粗细跳变。
- 该问题不一定由组件自身 CSS 引起，可能来自全局动画类、共享折叠类或按钮波纹类的合成层提示被移除。

**排查步骤**

1. 用提交二分或局部二分先确认引入范围；若某个提交批量删除动画性能提示，按相关度分组恢复验证。
2. 搜索目标元素运行时 class：`.animate-in`、`.visible`、`.collapsible`、`.wave-ripple`、`.btn--lift` 等，确认动画实际消费的共享 owner。
3. 在 DevTools 中观察动画元素的 computed style，重点看 `will-change`、`transform`、`opacity`、`backface-visibility`、`border-color`、`box-shadow` 是否在动画前后变化。
4. 若恢复 `.animate-in, .visible { will-change: transform, opacity; }` 后问题消失，再逐个移除其它恢复项，确认最小必要 owner。

**修复方向**

- 不要把共享动画类上的 `will-change` 作为纯冗余删除；若要收敛性能提示，先确认所有消费这些动画类的卡片、按钮、折叠区和提示层动画边框/阴影稳定。
- 最小修复优先保留动画 owner 上的提示，例如 `.animate-in, .visible { will-change: transform, opacity; }`，不要为了一个组件追加更高优先级的局部边框覆盖。
- 若担心长期 `will-change` 成本，优先考虑只在动画前后由 JS 添加/移除专用 class，但必须覆盖动画取消、快速重复触发和 reduced-motion 分支。

**验证入口**

- 导航栏点词元 → 触发词元卡片入场、展开或编辑相关动画，观察动画播放期间卡片边框颜色和粗细是否保持稳定。
- 同一入口在浅色、深色和典雅主题下重复测试；若 bug 只在某主题明显，也要比较 computed `border-color` 与合成层提示是否一致。
- 对清理任务，删除任意共享 `will-change` 后至少验证一个实际使用 `.animate-in` / `.visible` 的列表卡片，而不只看静态截图。

## CSS 优先级冲突导致激活态样式失效

**现象信号**

- 激活态按钮看起来和非激活态一样，无视觉反馈。
- 特定主题（如典雅模式）下激活态样式丢失，但深浅色模式正常。
- 样式迁移或代码清理后，原本正常的激活态突然失效。
- 主题前缀选择器（如 `html[data-theme="elegant"] .btn--primary`）覆盖了激活态样式。
- 深色/典雅主题下，点击新生成的 `input` / `textarea` 后突然变白；搜索能看到 Foundation 的 `[type=...]:focus` 或 `textarea:focus` 白底规则。

**常见误导**

- 以为是激活态样式丢失，实际是选择器优先级不足。
- 用 `!important` 强制覆盖，违反 CSS 最佳实践，引入更高优先级的技术债。
- 只关注单个按钮的激活态，忽略平级按钮在主题模式下的视觉一致性（如边框透明度、hover 发光）。
- 深浅色模式正常就认为修复完成，未验证所有主题模式。

**根因模式**

- `.btn.is-active` (0,2,0) 优先级低于 `html[data-theme="elegant"] .btn--primary` (0,2,1)。
- 旧版本用 `!important` 强制覆盖，迁移到 `ui_controls.css` 时丢失，导致激活态样式被主题前缀选择器覆盖。
- 主题模式下，原本平级的按钮变体（如 `btn--primary` 和 `btn--accent`）被错误赋予不同样式（实色边框 vs 半透明、有无 hover 发光），破坏了设计语义。
- 代码清理或架构迁移时，`!important` 被视为冗余删除，未考虑其背后的优先级冲突根因。
- 新增组件自己绘制表单底色，但没有接入 `.ui-field` / `ui_controls.css`；聚焦时 Foundation 原生表单规则接管 `background-color: #fefefe`，主题 token 没有机会生效。

**排查步骤**

1. 检查激活态选择器优先级（如 `.btn.is-active`）是否低于主题前缀选择器（如 `html[data-theme="elegant"] .btn--primary`）。
2. 在 DevTools 中观察激活态元素的 computed style，确认哪个选择器生效。
3. 对比深浅色模式和主题模式的按钮设计语义：原本平级的按钮变体（如 primary 和 accent）在主题模式下是否保持视觉一致（边框透明度、hover 发光、背景深度）。
4. 若用 `!important` 修复，立即判断是否有更合理的优先级调整方案（如 `html .btn.is-active` 提升到 0,2,1）。
5. 对表单控件，确认生成 DOM 是否带 `.ui-field`，组件 CSS 是否只提供尺寸/字体/token 参数，`ui_controls.css` 是否在 Foundation 后加载并能用主题 `--ui-field-focus-*` 覆盖白底。

**修复方向**

- 用 `html .btn.is-active` (0,2,1) 提高优先级，避免 `!important`。
- 主题模式下，平级按钮变体应保持视觉一致：边框透明度、hover 发光、背景深度。
- 代码清理或架构迁移时，若删除 `!important`，必须先确认选择器优先级是否足够，或是否需要调整优先级而非直接删除。
- 若发现主题模式下按钮变体样式不一致，优先检查设计语义（是否平级），再统一样式。
- 新增可编辑控件优先接入 `.ui-field`，组件侧通过 `--ui-field-*` 定义局部尺寸和字体；不要给某个主题追加后置白底覆盖修复。

**验证入口**

- 对局页 → 游戏设置按钮（`btn--primary`）和在线房间按钮（`btn--accent`）→ 验证激活态在浅色、深色、典雅主题下都有明显视觉反馈。
- 验证平级按钮在主题模式下的视觉一致性：边框透明度、hover 发光、背景深度。
- 验证激活态选择器优先级（如 `html .btn.is-active`）是否高于主题前缀选择器。
- 新增或生成式编辑框：在典雅主题下真实点击聚焦，确认 computed `background` 来自 `--ui-field-focus-bg`，而不是 Foundation 的 `#fefefe`。

## 本地配置文件里的 secret 占位符被当作真实密钥

**现象信号**

- 本地配置文件能读出模型、端点和 `apiKey` 字段，但实际请求全部返回 401。
- 脱敏检查看到 key 前缀像 `${input:`、`${env:` 或其它变量表达式，而不是真实 token。
- VS Code 或其它宿主内置功能可用，同一配置被自写代理/扩展直接读取后不可用。

**常见误导**

- 看到配置里有 `apiKey` 字段就认为已经拿到密钥，继续排查 URL、模型名或请求体。
- 只验证公开模型列表安全展示，没有验证发送路径使用的是否是真实可调用凭据。
- 把 401 归因给手机端访问 token，而不是桌面端代发请求的上游鉴权。

**根因模式**

- 宿主配置中的 secret 字段可能只是变量占位符，例如 `${input:chat.lm.secret...}`；真实密钥由宿主内部输入/密钥机制解析。
- 普通扩展或代理直接读取 JSON 时只能拿到占位符，不能通过公开 API 读取其它功能域保存的 secret。
- 将占位符拼成 `Authorization: Bearer ${input:...}` 发给上游，会稳定得到 401，且错误看起来像密钥失效。

**排查步骤**

1. 对所有要代发请求的密钥字段做形态检查，只输出长度、前缀和是否匹配变量表达式，不打印真值。
2. 用同一 URL、模型和鉴权头做最小请求，确认 401 是否在绕过手机端后仍复现。
3. 搜索宿主配置、workspace storage 和扩展文档，区分“显示配置源”和“真实 secret 存储源”。
4. 若 key 是宿主变量，占位符不可解析时应在发送前给出明确错误，不要继续请求上游。

**修复方向**

- 模型列表可以展示占位符来源的模型，但公开接口必须标记其需要宿主 secret，且不返回 secret。
- 发送前识别 `${input:...}` 等未解析变量并阻断，提示使用宿主公开 LM API 暴露的模型，或提供桌面扩展可直接读取的真实 key 配置文件。
- 若后续需要真正复用宿主 secret，必须找到公开、授权的 API；不要读取内部加密 storage 或要求用户把密钥暴露给浏览器。

**验证入口**

- 移动聊天选择自定义 `chat-completions` 模型发送一句话，确认错误说明是“未解析 VS Code input secret”，而不是上游 401。
- 再检查 `/api/models`，确认只出现 `requiresVsCodeInputSecret` 等安全标记，不包含真实 key、占位符以外的 secret 或 Authorization 内容。

## 保存成功但刷新后表单回默认，空 Key 二次保存覆盖旧凭据

**现象信号**

- Provider、模型或其它本地配置保存接口返回成功，磁盘配置也写入了；刷新页面后表单又回到默认值或空值。
- 为了安全不回显明文 Key，刷新后 Key 输入框为空；用户只改其它字段再保存时，后端提示缺少 Key，或把旧 Key 覆盖成空。
- 模型列表能从配置文件读到模型，但配置表单本身没有选中已保存 Provider。

**常见误导**

- 只验证保存接口和磁盘文件，忽略刷新后的 `load -> hydrate form` 路径。
- 只验证“明文 Key 不回显”这个安全目标，漏掉“空输入应表示保留旧 Key”这个编辑语义。
- 把默认值初始化放在页面启动早期，却没有在加载持久配置后用配置覆盖默认值。

**根因模式**

- 前端 `loadModelConfig()` 只保存了 state 和状态文本，没有把 `models.json` 中的 provider/model/compat 回填到表单。
- 后端 `upsert` 把请求里的空 `apiKey` 当成新配置必填，而不是在已有 provider 存在时沿用旧 `apiKey`。
- 脱敏响应把明文 Key 清空后，前端如果没有 `hasLiteralApiKey` 之类标记，就无法提示用户“已保存但不回显”。

**排查步骤**

1. 先读磁盘配置，确认保存是否真实落盘；不要直接把问题归因给写入失败。
2. 刷新真实页面后读取表单 DOM 值，确认 provider、baseUrl、model、tokens、compat 和 Key 提示是否来自持久配置。
3. 用空 `apiKey` 对已有 provider 再保存一次，随后重新读取磁盘配置，确认旧 Key 仍存在。
4. 检查 GET 配置接口是否只返回脱敏 Key 和安全标记，不把真实 Key 回显给浏览器。

**修复方向**

- 持久配置加载完成后显式 hydrate 表单；优先选中当前输入的 provider，其次选默认测试 provider，再退到第一个 provider。
- 对已有 provider，空 `apiKey` 应表示保留旧 Key；只有新 provider 且没有旧 Key 时才要求填写 Key。
- 脱敏响应保留 `hasLiteralApiKey` 标记，用状态文本或短 placeholder 告知“Key 已保存，留空保留”。

**验证入口**

- 配置页保存 Provider → 刷新页面 → 断言表单字段从 `models.json` 回填，Key 输入框为空但有已保存提示。
- 不填 Key 再保存同一 Provider → 重新读取 `~/.pi/agent/models.json`，确认旧 `apiKey` 没被空值覆盖。
- 检查浏览器响应和页面 DOM 不包含真实 Key。

**当前任务门禁**

- 发送路径：自定义 endpoint 不能再向上游发送 `${input:...}`。
- 模型列表：可显示模型，但只能暴露安全标记，不暴露真实密钥。
- 真实入口：3001 `/api/models` 和手机发送接口都要验证。
- 未覆盖风险：无法通过公开 API 解出 VS Code 内部 input secret 时，不能承诺这类模型可直连。

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

## 临时 UI 状态覆盖动态 HTML 词元

**现象信号**

- 角色名、术语、卡牌名等本来由 `GameText.render()` 或替换系统生成，经过 hover、拖拽、临时提示、激活态切换后变成纯文本。
- 第一次临时状态正常，恢复后再次进入临时状态不更新，或 `data-render-key` 看似正确但 DOM 内容仍停留在旧状态。
- 使用 `innerText` / `textContent` 临时替换包含动态词元的节点，或手动 `innerHTML` 恢复但没有同步 `safeRender` 的 `__lastRenderedContent`。

**常见误导**

- 只看恢复后的可见文字是否一样，忽略动态词元 HTML、悬停、双击跳转和高亮能力是否还在。
- 以为恢复 `innerHTML` 和 `data-render-key` 就够了，漏掉 `safeRender()` 还维护影子内容缓存。
- 只测第一次 hover/drag 状态，不重复进入同一临时状态。

**根因模式**

- 动态词元 DOM 同时受业务 render key、替换系统和临时 UI 状态影响；临时状态若直接写文本，会破坏语义 HTML。
- `safeRender()` 使用 `data-render-key` 和 `__lastRenderedContent` 跳过重复渲染；手动改 DOM 后若不维护这两个状态，后续可能跳过本该发生的更新。

**排查步骤**

1. 搜索目标区域中的 `innerText =`、`textContent =`、手动 `innerHTML =` 和 `data-render-key` 操作。
2. 检查临时状态进入前是否保存 `innerHTML`、`data-render-key` 和 `__lastRenderedContent`，恢复时是否三者一起还原。
3. 重复触发两次临时状态，验证第二次仍会显示临时内容并能恢复动态词元。
4. 对角色名、术语、卡牌名，验证恢复后 hover、高亮和双击跳转仍由动态 HTML 词元承载。

**修复方向**

- 临时显示也优先用 `GameText.render()` / `safeRender()`，不要用纯文本覆盖动态词元节点。
- 保存并恢复原始 `innerHTML`、`data-render-key` 和 `__lastRenderedContent`；常规渲染路径也统一消费 `safeRender()`，避免平行状态 owner。

**验证入口**

- 导航栏点对局 → 开始沙盒对局 → 从主视角手牌拖到其他角色摘要并悬停到判定区状态，松开或移出后确认角色名恢复为动态词元。
- 重复同一悬停流程两次，确认第二次仍显示判定区临时标签，恢复后角色名 hover/双击行为仍正常。

## 临时交互态只进入不完整退出，导致监听或闭包累积

**现象信号**

- 第一次打开、编辑或拖拽正常，重复进入同一临时状态后出现重复保存、重复提示、按键触发多次或旧值回写。
- 代码在 `startEdit`、`open`、`startDrag` 等入口内绑定 `addEventListener`，但退出函数只还原 class、属性或 DOM，没有移除临时监听。
- 事件处理器闭包里保存了 `oldName`、`original`、`state`、`dragInfo` 等进入时状态，后续操作却被旧闭包影响。

**常见误导**

- 只验证第一次编辑/打开成功，忽略第二次、第三次进入后的处理器数量。
- 看到有 `_isEditing`、`__bound` 或 `{ once: true }` 就以为不会重复；但临时 `keydown` / `input` / `mousemove` 监听可能不是一次性，也没有在 cleanup 中解绑。

**排查步骤**

1. 搜索临时状态入口里的 `addEventListener`、`onclick =`、`setTimeout`、`MutationObserver` 和全局变量写入。
2. 检查退出路径是否统一经过 cleanup，并同时移除临时监听、恢复属性/class、清理异步标记。
3. 重复进入同一状态至少两次，验证按键、保存、取消、撤回等操作只触发一次。

**修复方向**

- 把临时监听声明在入口局部，并由同一个 cleanup 移除；cleanup 应可重复调用且覆盖保存成功、取消、失焦和错误路径。
- 只有长期委托监听才使用 `__bound` 防重复；临时状态监听不应永久挂在元素或 document 上。

**验证入口**

- 导航栏点侧边栏 → 账号 → 名片 → 多次点击用户名进入/退出编辑，确认 Enter、Escape、失焦和提交提示每次只响应一次。

## 共用鼠标/触摸入口时误用 MouseEvent 字段

**现象信号**

- 同一功能桌面点击或长按可用，移动端触摸无响应。
- 代码同时绑定了 `mousedown` / `touchstart`，但共用 handler 一进入就检查 `event.button`、`event.buttons` 或鼠标专属字段。
- 没有报错，逻辑只是提前 `return`。

**常见误导**

- 看到 `touchstart` 已绑定就以为移动端入口存在，没有继续检查共用 handler 的第一层 guard。
- 只在桌面浏览器用鼠标验证长按/拖拽，不模拟触摸事件对象。

**根因模式**

- `TouchEvent` 没有 `button` 字段；写成 `if (event.button !== 0) return` 会把触摸事件当作非左键过滤掉。

**排查步骤**

1. 搜索同时绑定鼠标和触摸事件的函数，检查共用 handler 是否读取鼠标专属字段。
2. 对 `event.button` 使用存在性判断：只有字段存在时才校验左键。
3. 用触摸模拟或移动端设备验证长按、拖拽和点击取消路径。

**修复方向**

- 将左键判断写成 `if (event.button != null && event.button !== 0) return`，或为鼠标/触摸拆分输入归一化层。
- 验证 `touchend` 后的 click 兼容路径，避免长按触发后又执行短按点击。

**验证入口**

- 导航栏点对局 → 移动端/触摸模拟 → 长按角色摘要，确认能打开判定区检视；短按仍打开手牌检视。

## 移牌动画端点、外观与布局 owner 分裂

**现象信号**

- 拖牌到角色摘要、头像、区域徽标等“非真实牌位”时，松手后拖拽牌突然消失，目标区域数量直接变化。
- 打开手牌/判定/装备等区域窗口后，窗口里已有真实牌位，但拖到摘要仍没有飞行动画。
- 拖到主手牌、处理区或区域窗口很顺滑，拖到摘要或长悬停切换区域却突兀，说明不同入口没有共用同一目标解析。
- 本地拖拽看起来已修好，但在线同步接收端仍飞向摘要；说明拖拽幽灵动画和同步移牌动画还有两套端点解析 owner。
- 同步移牌到处理区时，真实目标牌会显示“由谁置入”等附加信息，但飞行动画 ghost 不显示，落点才突然出现 label；或 label 被牌面/牌背文本样式影响，和牌名挤在一起。
- 小屏或非标准窗口下真实牌已缩小，但同步动画飞向角色摘要时 ghost 从小牌变大，说明 fallback 锚点尺寸没有沿用当前牌的实际 rect。
- 同步动画终点整体比最终牌偏右/偏下一个固定像素值时，检查页面是否启用了 `scrollbar-gutter: stable both-edges` 或其他会改变 fixed 层原点的布局机制。
- 区域中间移走或插入一张牌时，左侧牌正常、右侧牌整体跳一下，说明列表渲染可能按 index 复用 DOM，而布局 FLIP 却假设 DOM 节点代表同一张牌。
- 固定槽位满格后再拖入一张牌，用户看到牌飞走或消失；或向已占槽位放牌时，被顶开的牌看起来向下挤而不是移动到另一个槽位，说明模型失败分支、拖拽占位符和布局动画没有共享同一个槽位位置 owner。
- 拖拽松手后动画期间短暂出现两张相同牌，动画结束才正常，说明渲染层可能把普通可排序拖拽占位符排除在 DOM 复用之外，导致 `updateUI()` 新建了最终牌，而拖拽 ghost 仍在飞行。
- 本地拖拽到固定装备槽时，移动牌飞向主视角装备/头像锚点，但来源手牌区其它牌短暂弹动，说明固定槽位的布局 FLIP 快照把来源可排序区域也纳入了动画。

**常见误导**

- 以为是模型先删除再置入，实际模型移动可能正确，问题在拖拽幽灵找不到动画终点。
- 只用 `document.querySelector('[data-drop-zone="..."]')` 找第一个区域，忽略同一 `data-drop-zone` 可能同时出现在摘要锚点和打开的 CardViewer 窗口里。
- 只验证有占位符的容器，不验证 `data-accept-placeholder="false"` 的摘要/头像类目标。
- 只验证本机拖拽，不验证远端同步的 `snapshotBeforeMove()` / `animateAfterMove()` 路径。
- 同页手写 `snapshotBeforeMove → moveCardToArea → updateUI → animateAfterMove` 通过后就认为在线同步已通过，漏掉真实 `sync_manager.onRemoteAction()` 的 payload、视角和窗口状态。

**根因模式**

- 移牌动画不是单一“飞到哪里”的问题，而是端点解析、目标外观、坐标系、列表 DOM identity、布局 FLIP、同步入口共同组成的一条链；任一层有独立 owner，都会出现局部成功但用户可见仍突兀。
- 摘要类 drop zone 不接收 `.card-placeholder`，移动后不会在摘要内部产生真实牌节点。
- 目标区域窗口打开时，真实牌节点在后追加的 CardViewer 中；第一个匹配的 drop zone 可能是摘要，里面找不到牌。
- 找不到目标牌后走 fallback 直接移除拖拽幽灵，没有回退到摘要、头像、徽标或主视角锚点。
- 同步动画使用 `player:N:hand` / `player:N:judgeArea` 模型路径，CardViewer 使用 `role:id` / `role-judge:id` drop-zone；两套命名没通过共享 resolver 对齐。
- 父区域 drop zone（如 `role:X:equip`）可能不接收占位符，数据写入时又会被模型下沉到子区域；动画若仍按父 zone 找终点，会找不到直接子卡牌而退回父容器锚点，出现闪烁或落点偏移。
- ghost 外观如果只克隆源牌，或读取目标 DOM 时剥掉 `.card-mover-label`，就会漏掉处理区这类目标区域附加信息；如果标注和牌面共用同一个 `innerHTML`，`CardBack` 的透明文字和牌名布局也会影响标注。
- 非真实牌位锚点如果用 `--card-w` / `--card-h` 造 fallback rect，而不是用起始牌当前 `getBoundingClientRect()` 尺寸，会在动态缩放下出现飞行中变大。
- `getBoundingClientRect()` 返回视口坐标，但 fixed ghost 的 `left: 0` 在保留滚动槽时可能不是视口物理 0；直接把 rect 坐标写进 fixed transform 会把 fixed 原点偏移叠加一次。
- `renderCardList()` 如果用“当前位置第 N 个 DOM”承载“新数据第 N 张牌”，中间删除时右侧 DOM 的内容会立刻换成邻居；`animateLayoutShift()` 再按旧 DOM 元素做 FLIP，就不是同一张牌的旧/新位置。
- 固定槽位移动如果先从源区域移除，再判断目标槽是否有空位接收被顶开的牌，满槽失败会依赖回滚；调度层若忽略 `moveCardToArea()` 的失败返回，仍会记录、同步和播放成功动画，用户就会看到“吞牌”。
- 单个固定槽如果继续作为可排序 mini-list 接收可见占位符，hover 时会把同槽内已有牌向下挤；槽位应是父区域内的固定位置目标，而不是可插入多个子项的列表。
- 被顶开的牌跨槽移动时，渲染可能重建或跨容器移动 DOM；布局动画只保存旧 DOM 引用会丢失身份，需要按 `card.id` 找到移动后的真实槽位元素。
- 固定槽位防重复只应排除隐藏的 `.drag-placeholder-hidden`；普通可排序区域的可见 `.drag-placeholder` 必须参与 `card.id` 复用，否则动画期间会出现 ghost + 新建真实牌的重复显示。
- 本地拖拽到固定槽位时，来源手牌/处理区由拖拽占位符维持布局，不应参与固定槽位 layout FLIP；只快照目标槽位区域即可。远端同步或非拖拽移动仍可快照来源和目标两侧。

**排查步骤**

1. 先按层列出移牌动画 owner：本地拖拽端点、远端同步端点、目标外观、坐标原点、列表 DOM identity、布局 FLIP、窗口/摘要 fallback。
2. 搜索拖拽收尾逻辑里的 `data-drop-zone` 查询，确认是否只取第一个匹配元素。
3. 对同一目标区域同时检查摘要锚点和打开的区域窗口：`querySelectorAll('[data-drop-zone]')` 后按属性值过滤。
4. 验证 `data-accept-placeholder="false"` 分支是否有真实牌位、可见窗口牌位、摘要锚点三层回退。
5. 搜索同步动画 owner：`CardMoveAnimator.snapshotBeforeMove()`、`animateAfterMove()`、`sync_manager.onRemoteAction()`，确认它们是否也消费同一套端点解析。
6. 验证同步时优先触发或模拟 `sync_manager.onRemoteAction()` / `RoomClient` 的 `gameAction`，不要只手写模型移动序列。
7. 用浏览器记录本地拖拽和同步弧线动画的目标元素，确认它是窗口里的 `.card-placeholder` 或摘要/主视角锚点，而不是空目标 fallback。
8. 对固定槽位额外覆盖满槽拒绝、已占槽位顶开、同区域槽位交换三类用例；确认失败移动不会触发日志、同步、成功回调或成功动画。
9. 对普通可排序区域额外检查“松手后动画期间”的 DOM：同一 `data-card-id` 不应同时出现两个可见 `.card-placeholder`。

**修复方向**

- 对远端/摘要类 drop 先查所有同名 drop zone，优先使用包含真实 `.card-placeholder` 的窗口或可见容器。
- 把 `player:N:*` 模型路径与 `role:*` / `role-judge:*` / viewer slot drop-zone 的映射收敛到共享 resolver，让拖拽和同步动画共同消费。
- 对不接收占位符的父区域 drop，模型移动完成后优先用被移动卡牌的真实 `lyingArea` 反查子区域路径，再找真实牌位作为动画终点。
- 没有真实牌位时，飞向角色摘要、主视角头像、判定徽标或手牌容器等稳定锚点，并保持拖拽牌尺寸居中收束。
- 非卡牌锚点不要按 `.card-placeholder` 处理：不要隐藏目标元素，不要强行恢复占位符样式。
- 同步 ghost 的最终外观应优先吸收目标区域的可见附加 DOM；牌面/牌背放在 face 层，置入者等标注放在 annotations 层，背面牌也应显示标注。
- 飞向摘要、头像、徽标等非牌位锚点时，目标矩形使用起始牌实际尺寸居中到锚点，避免动态缩放下从小变大。
- fixed ghost 使用 `getBoundingClientRect()` 坐标时，先测量一个 `position: fixed; left:0; top:0` 探针的实际 rect，并从 transform 坐标中扣除该 fixed 层原点。
- 可移动列表中的牌节点必须按 `card.id` 复用并按数据顺序重排 DOM；只有这样布局 FLIP 才是在“同一张牌”的旧 rect 和新 rect 之间动画。
- 固定槽位移动应先预检目标槽、被顶开牌的去向和源牌位置，再执行任何移除；调用链必须传播失败返回，让拖拽回到源位置，并让在线同步不广播失败移动。
- 固定槽位 drop-zone 不应播放普通列表占位符排序；拖拽牌飞向真实槽位，其它受影响牌用按 `card.id` 追踪的布局快照滑到新槽位。
- 固定槽位本地拖拽的 layout 快照应限制在目标槽位区域，避免临时 `updateUI()` 移除来源占位符后又对来源手牌播放 FLIP。

**验证入口**

- 导航栏点对局 → 开始沙盒对局 → 打开目标角色手牌窗口 → 从主视角手牌拖到该角色摘要，确认牌飞向手牌窗口里的新增位置。
- 导航栏点对局 → 打开目标角色判定窗口 → 拖牌到该角色摘要并悬停到“判定区”状态后松手，确认牌飞向判定窗口里的新增位置。
- 关闭窗口后重复拖到摘要，确认拖拽牌飞向摘要/头像锚点，而不是直接消失。
- 在线或模拟同步路径：玩家 B 打开玩家 C 的手牌/判定窗口，玩家 A 移牌到玩家 C 对应区域，确认玩家 B 看到飞行动画进入打开窗口；关闭窗口后才飞向玩家 C 摘要。

## 领域对象只在局部共享，导致模型/渲染/布局/动画逐层特判

**现象信号**

- UI 中有固定空位、槽位、格子或位置 n，即使为空也要显示，但模型里只保存普通卡牌数组、临时 `options.slots`，或把槽位伪装成独立区域。
- 拖放、CardViewer、同步、移动日志和调试器各自解析 `:slot:`、`equipSlots`、父区域名等字符串。
- 空槽能显示，但拖牌、同步动画或调试信息只能命中已有牌，空位只能靠 UI fallback。
- 某一层修好后仍出现“局部像新机制、局部像旧机制”：例如模型路径已统一，但窗口尺寸、槽位间距、动态压缩或动画落点仍和普通区域不一致。
- 同一个概念在代码里同时出现模型字段、渲染 options、专用 DOM class、专用 CSS token、专用动画 fallback，说明共享只停在局部层级。

**常见误导**

- 看到槽位视觉上已经存在，就误以为模型也有槽位对象。
- 只把问题当成 CardViewer 布局或 drop-zone 命名问题，继续在 UI 层补特例。
- 只看到 `cards[n] === null` 就以为设计退化；如果该区域同时有 `slots[n]` 元数据，`cards[n]` 表达的是区域内固定位置的占用状态，二者共同构成 location owner。
- 看到 `Card.lyingArea`、路径解析或同步数据已经统一，就误以为底层已经完全共享。
- 只验证“功能能用”或“数据对象正确”，没有继续验证窗口外壳、内容行布局、CSS 动态间距、动画 target 是否也消费同一 owner。

**根因模式**

- 固定位置是领域对象，但只在渲染层临时构造，或被错误建成 child Area，导致区域概念和位置概念重叠。
- 父区域和槽位位置没有统一 location API，导致 `Card.lyingArea`、区域路径、同步序列化、动画目标和调试信息无法共享同一事实来源。
- 更深层根因是领域概念没有跨层单一 owner：模型、渲染 DOM、窗口外壳、CSS 布局、动画定位、同步和调试各自维护“这是什么位置/区域”的局部定义。
- 即使补上模型对象，如果下游仍保留 `--slots` 类、独立 gap/padding/max-width token、独立 resize 逻辑或专用 fallback，用户仍会看到普通区域和特殊区域不一致。

**排查步骤**

1. 搜索固定槽位或特殊区域相关关键词：`slot`、`fixedSlots`、`options.slots`、`:slot:`、`--slots`、`--special`、区域名代理。
2. 检查空槽是否由 `area.slots[N]` 描述，并由 `area.cards[N]` 表达占用；不要把槽位补成 child Area。
3. 检查移动后的 `card.lyingArea` 是否仍指向父区域，并能通过 `getCardLocationPath()` 解析到具体槽位位置。
4. 检查同步 payload、移动日志、动画目标和调试器是否都能从同一个 location path 解析到该槽位。
5. 继续按层列 owner：模型/状态、路径解析、渲染 DOM、窗口外壳 class、内容行布局、CSS token、动画定位、同步序列化、调试展示；任何一层仍有专用分支都不能算“共享完成”。
6. 对比普通区域和特殊区域的 computed style 与 DOM class，重点看 `max-width`、`min-width`、padding、gap、动态 margin、scroll/overflow 是否来自同一规则。

**修复方向**

- 固定槽位建模为父 `Area` 的位置描述：`area.slots[N]` 管槽位元数据，`area.cards[N]` 管该位置的卡牌或空位。
- `Card.lyingArea` 指向父区域；槽位序号通过 `findCardSlotIndex()` / `getCardLocationPath()` 推导，避免“槽位既是区域又是位置”。
- 旧字段兼容应限制在同步恢复、数据导入等边界；不要把 `equipSlots` / `childAreas` 继续挂回运行时模型，避免新旧概念长期并存。
- 下游渲染应消费同一领域对象和同一窗口/布局 owner；特殊区域只保留真实差异（如空槽标签、容量、可放置规则），不要保留独立窗口宽度、独立间距系统或独立动画目标解析。
- 修复时按层收敛：先统一事实来源，再统一 DOM 语义，再统一 CSS 布局 token/动态计算，最后统一动画和同步入口。

**验证入口**

- 导航栏点对局 → 开始沙盒对局 → 打开装备区窗口，确认四个槽位空时也渲染。
- 将牌移入装备父区域，断言 `card.lyingArea` 是 `player.equipArea`，卡牌位置路径为 `player:N:equip:slot:M`。
- 打开装备窗口后验证同步/动画目标能命中已有牌槽和空槽；关闭窗口后再验证摘要 fallback。
- 同时打开普通手牌/判定窗口和装备窗口，对比窗口外壳 class、正文 padding、内容行 min-width、缩小时的间距压缩，确认特殊区域不再有独立尺寸体系。
- 在标准窗口和窄窗口分别验证空槽、满槽、插入/移出、同步飞行动画和调试信息，避免只证明模型层成功。

## Module 迁移中 ready helper 与导出对象完整性回归

**现象信号**

- 静态检查显示 `window.*` owner 都存在，但真实页面中某些内容区、日志区或拖拽动画消失。
- 把原 classic 脚本改成 `type="module"` 后，依赖 `whenDOMReady().then(() => whenPartialsReady())` 的模块在 partial DOM 注入前就运行。
- 拆 IIFE 时只保留了被静态 owner 检查覆盖的函数，漏掉同一导出对象上的运行时方法。

**常见误导**

- 只验证命名空间对象存在，例如 `Game.UI.DragAnimation`、`tokensAdmin`、`TokensPerm`，没有验证对象上的完整方法集合。
- 以为 module 脚本仍能像 classic 脚本一样在 parser 阶段同步建立全局 readiness 信号。
- 只用干净 VM 顺序执行顶层代码，没有模拟真实浏览器中 module 执行期 `document.readyState === 'interactive'` 后 Promise 微任务会抢跑的时序。

**根因模式**

- module 脚本 defer 到解析后执行；此时 `whenDOMReady()` 可能立即 resolve，回调微任务会在后续 module 脚本赋值 `window.partialsReady` 前运行。
- `include_loader.js` 这类 partial readiness 种子必须在 parser 阶段同步建立 `window.partialsReady`，否则后台、页签、对局和 i18n 等消费者会看到“无 partials 可等”。
- IIFE 拆除时修改导出对象字面量，若只检查 owner 存在而不检查完整 API，容易漏掉 `createGhost` 这类只在真实交互路径调用的方法。

**排查步骤**

1. 对启动链脚本先分清“同步种子”和“可 defer 模块”：`page_loading.js`、`include_loader.js` 这类 readiness owner 需要特别保护。
2. 搜索所有 `whenDOMReady().then(() => whenPartialsReady())`、直接读取 `window.partialsReady` 的模块，确认它们执行时 `partialsReady` 已经同步存在。
3. 对每个迁移 owner 列完整导出方法清单，不只断言命名空间存在；对拖拽、日志、后台渲染等真实入口方法逐项检查。
4. 浏览器验证必须覆盖真实入口：词元页内容与日志、权限页日志、对局拖拽 ghost 和落点动画。

**修复方向**

- 保留 `page_loading.js` 和 `include_loader.js` 为 classic 同步种子，或在更早 classic 脚本中建立等价的 `window.partialsReady` 占位 Promise。
- `whenPartialsReady()` 不应在 partial owner 尚未建立时让关键初始化悄悄成功；需要时增加明确的早期占位或停止线。
- IIFE 拆除后按原导出对象逐项恢复方法，尤其是拖拽 ghost、日志刷新、后台 render/hydrate 这类只在交互路径触发的 API。

**验证入口**

- 导航栏点词元 → 查看顶部类型统计、词元内容列表和变更日志是否同时出现。
- 导航栏点权限 → 查看用户列表和用户变更日志是否同时出现，筛选/刷新仍可用。
- 导航栏点对局 → 开始沙盒局 → 拖一张手牌，确认拖动 ghost 出现，松手后有落点动画。

## CSS 文件改了但视觉不变：JS 内联样式覆盖

**现象信号**

- 修改了 CSS 文件中的属性值（如 `border-left: 3px` → `1px`），更新了版本号，浏览器加载了新版 CSS，但 DevTools Computed 面板显示的值仍是旧值。
- DevTools Styles 面板中该属性来自 `element.style`（内联样式），而非任何 CSS 规则。
- 搜索所有 CSS 文件找不到旧值，但浏览器渲染仍是旧值。

**常见误导**

- 先怀疑浏览器缓存 → 更新版本号 → 确认加载了新版 CSS → 仍无效。
- 先怀疑 `!important` 覆盖 → 搜索所有 CSS 中的 `!important` → 找不到相关规则。
- 先怀疑 CSS 选择器优先级 → 比较 specificity → 发现 CSS 文件里的规则确实应该生效。
- 以上三步全部走完后才发现是 JS 内联样式，浪费大量排查时间。

**根因模式**

- JS 通过 `el.style.xxx = ...` 或模板字符串 `style="..."` 直接写入内联样式。
- 内联样式优先级高于所有 CSS 规则（包括 `!important` 以外的规则）。
- CSS 文件从未控制过该属性——它一直由 JS 动态设置，CSS 文件里的同名声明从未生效过。
- 常见于：渲染函数中拼接 `style` 字符串、保存/编辑回调中直接操作 `el.style`、动画库写入内联样式。

**排查步骤**

1. 在 DevTools Styles 面板查看该属性的来源：如果显示 `element.style` 而非文件名+行号，说明是内联样式。
2. 全局搜索 JS 文件中的 `borderLeft`、`border-left`、`.style.` 等关键词，定位写入点。
3. 搜索模板字符串中的 `style="` 拼接，尤其是渲染函数。

**修复方向**

- 将硬编码值改为 CSS 变量：`style="--token-accent: ${col}"` + CSS 文件消费 `var(--token-accent)`。
- 或统一在 CSS 文件中控制，JS 只负责切换 class 而非直接写 style。
- 若必须保留内联样式，确保 CSS 文件中不再声明同一属性（避免误导后续维护者以为 CSS 文件是 owner）。

**验证入口**

- 修改 CSS 文件后，在 DevTools Styles 面板确认属性来源是 CSS 文件而非 `element.style`。
- 对同一视觉属性，全局搜索 CSS 和 JS 两个方向，确认只有一个 owner。

## 悬浮工具条按钮存在但点击无效：pointer-events 命中层未打开

**现象信号**

- DOM 中按钮存在，文本和 class 正确，事件委托代码也存在，但真实点击或 Playwright 点击后没有任何副作用。
- 按钮位于卡片右上角的 hover 工具条中，未 hover 时工具条 `opacity: 0` 且 `pointer-events: none`。
- 浏览器里量按钮 `getBoundingClientRect()` 有尺寸，但 computed `pointer-events` 仍是 `none`，点击目标实际落到卡片或下层元素。

**常见误导**

- 只检查 JS 监听是否绑定、模块是否导出，忽略 CSS hit-test 层。
- 看到按钮有尺寸、可见文本或 Playwright locator 唯一，就误以为点击一定命中按钮。
- 用程序化调用 `openXxx()` 验证功能成功，却没有验证真实鼠标从卡片外移入工具条区域的 hover/click 链。

**根因模式**

- 工具条为了隐藏操作入口设置 `pointer-events: none`，但显示条件只写在父卡片 `:hover` 或 `:focus-within` 上。
- 鼠标直接进入绝对定位工具条区域时，工具条自身无法接收 hover；如果父卡片 hover 未建立，按钮会一直保持不可命中。
- 事件委托只处理 `.btn-*` 目标，点击落到卡片本体时不会触发按钮逻辑。

**排查步骤**

1. 在真实页面量按钮、工具条、父卡片三者的 rect、computed `pointer-events`、`opacity` 和 `matches(':hover')`。
2. 不只检查 locator count；点击前确认按钮 computed `pointer-events` 是 `auto`。
3. 如果按钮在 hover 工具条内，测试从卡片外直接移入按钮区域，再点击。

**修复方向**

- 修改工具条 owner，让工具条自身也能接收 hover/focus，并把 `.toolbar:hover`、`.toolbar:focus-within` 加入显示条件。
- 若需要模块兜底，点击入口可动态加载详情模块，但不能用 JS 兜底掩盖 CSS 命中层不可点的问题。
- 避免给整页或大面积隐藏层开启 pointer events；命中区域应限制在工具条自身。

**验证入口**

- 导航栏点词元 → 搜索一个结果 → 鼠标从卡片外直接移动到右上角工具栏按钮（如跳转/编辑）→ 点击应触发对应操作。
- 在点击前后量 `pointer-events`、目标 UI 状态和内容标题，不要只调用打开函数。

## 新窗口已打开但原页也跳转：误把 `window.open(..., 'noopener')` 返回 `null` 当失败

**现象信号**

- 点击“详情”“外部打开”等入口后，新标签页已经打开，但当前主页面也被 `location.href` 替换成同一个目标。
- 用户看到两个一样的页面：一个在新标签页，一个在原页面。
- 代码中有 “打开失败就当前页跳转” 的 fallback，并用 `if (!opened)` 判断 `window.open()` 是否成功。

**常见误导**

- 误以为事件被绑定了两次，或按钮 click 同时冒泡到两个入口。
- 只检查 popup blocker，没有注意 `noopener` 会改变返回值语义。
- 在某些浏览器或测试环境里复现不稳定，容易把它当成缓存或刷新问题。

**根因模式**

- `window.open(url, '_blank', 'noopener')` 可能成功打开新页，但因为 `noopener` 隔离 opener，调用方拿到的返回值是 `null`。
- fallback 逻辑把 `null` 解释为“打开失败”，继续执行 `window.location.href = url`。
- 结果不是两个事件触发，而是同一个事件里的新窗口打开和当前页兜底跳转都执行了。

**排查步骤**

1. 搜索 `window.open(` 和 `location.href` 是否在同一入口里成对出现。
2. 检查 `window.open` 第三个参数或 feature 字符串是否包含 `noopener`。
3. 在点击入口里临时记录返回值、目标 URL 和是否进入 fallback，确认不是重复监听。
4. 再检查事件委托是否调用了 `preventDefault()`，避免 anchor 默认导航混入判断。

**修复方向**

- 不在 feature 字符串里传 `noopener`，改为 `const opened = window.open(url, '_blank')`。
- 如果页面不需要回传或无刷新返回，再用 `try { opened.opener = null; } catch (_) {}` 断开 opener。
- 站内详情页这类需要返回原页面的入口应保留 opener，并用 `postMessage` 或同等通道通知原页面处理。
- 只有 `opened` 真正为空时才执行当前页 fallback。
- 若入口来自按钮事件，保留 `preventDefault()` 和单次处理标记，避免默认导航与委托逻辑叠加。

**验证入口**

- 导航栏点词元 → 点击某个词元的“详情”。
- 预期只出现一个 `token_detail.html?...` 新页面，原 `index.html` 仍停留在词元页。
- 若浏览器阻止弹窗，才允许原页面跳转到详情页。

## 独立详情页只接内容入口，漏接全局功能 owner

**现象信号**

- 新增独立页面后，正文和数据能显示，但功能速查、快捷键切换主题、悬浮备注压制、动态标签单击/双击等全局能力失效。
- 主页面同一功能正常，详情页按钮或标签看起来存在但点击/按键无响应。
- 帮助面板即使补上脚本，也显示成默认面板内容，例如把详情页识别成 `panel_term`。
- 详情页里的动态标签双击/点击后直接关闭详情页、跳回主页面，或反过来在详情页里命中标题/同语义列表等同名元素；这些都说明没有先定义该入口的 canonical 定位语义。

**常见误导**

- 只把详情页当作“数据渲染入口”，没有把它当作完整页面入口对齐主页面启动链。
- 以为已有按钮 class 和文本等于交互已接入，忽略帮助、键盘、悬浮备注压制、高亮、滚动定位等分属不同 owner。
- 用空的 `window.scrollActions` 兜底避免报错，或漏接动态词元单击详情入口，却把真实交互失败隐藏成“无动作”。

**根因模式**

- 独立 HTML 只加载数据 API、主题按钮和渲染器，没有加载 `key_bindings`、`help_panel`、`tooltip` 压制器、`highlight`、按钮事件委托等共享模块。
- 帮助面板依赖 `TabsUI.getActivePanelId()`；独立页没有 TabsUI 时默认回落到 `panel_term`，导致上下文错位。
- 详情页内动态替换后的标签仍调用主页面 `scrollActions`；如果桥接层盲目在详情页本地搜索，同名标题、同语义 peer、原始文档或日志片段都可能变成假目标。
- 若把详情页 `scrollActions` 全部实现成某一种语义（只回主页面，或只本页定位），正文动态标签、显式“跳转位置/返回”和同语义词元按钮会互相污染；必须先按产品语义定义 canonical surface。

**排查步骤**

1. 对比主入口 `main_entry.js` 与独立入口的 import 矩阵，按能力列出缺失 owner：帮助、快捷键、悬浮备注压制、高亮、按钮委托、跨页定位。
2. 在详情页真实入口检查 `window.openHelpPanel`、`window.KeySettings`、`window.ThemeToggle`、`window.HoverHints`、`window.scrollActions` 是否存在；`scrollActions` 不能是空兜底，`HoverHints` 应压制 `title` / `data-tooltip`。
3. 打开功能速查，确认标题来自详情页上下文；切换详情页内部模块时帮助内容同步变化。
4. 在关联内容中真实单击/双击动态标签，区分三条路径：正文动态标签、显式“跳转位置/返回”、同语义词元按钮。词元详情页的动态标签单击应打开对应详情，双击应延续主站动态 HTML 的 canonical 主页面定位，不应命中详情页里的标题、peer 或 JSON 同名元素。
5. 切换深色/典雅主题时，在 hover 已经生效的动态标签上确认 inline 高亮会重新按主题计算，不能只验证下一次 mouseover。

**修复方向**

- 独立页入口显式加载所需共享模块和样式，但不要引入整套主页面无关模块。
- 给帮助面板增加独立页上下文和子视图识别，避免无 TabsUI 时回落到错误面板。
- 把详情页 `scrollActions` 设计成语义桥接，而不是 DOM 搜索兜底：词元详情页的动态标签双击走主页面 canonical locator；只有明确设计为详情内目录/预览定位的入口，才允许在本页 scope 内搜索目标。
- 对动态标签相关页面补齐 tooltip、高亮、按钮委托和状态同步入口。

**验证入口**

- 词元页打开某个词元详情 → 在详情页按 `?` 或点击“功能速查”，标题应为词元详情且内容随详情模块切换。
- 在详情页按主题快捷键，主题应循环切换；点击顶部主题按钮也应保持可用。
- 进入“关联内容”模块，悬停动态标签应高亮；双击正文标签应生成主页面 locator，不应在详情页里滚到标题、同语义 peer 或其它同名节点。
- 点击详情页“跳转位置”时才应回到原页面并定位；无原页面时应跳到 `index.html?tokenLocator=...`。

## 词元身份显示直接走全局替换，导致同名文档互相覆盖

**现象信号**

- 词元详情、调试检视器、日志摘要等“显示某一条数据库文档身份”的位置接入了动态 HTML 标签，但最终文字变成了另一条同语义词元的替换结果。
- 固定术语和动态术语共享同一个 `en` / scroll key 时，标题或同语义列表全部显示成同一个替换文本，无法区分当前文档。
- 技能、角色等 class 驱动替换中，页面样式 class 插在语义 class 前面，双击跳转或高亮定位使用了样式 class。

**常见误导**

- 以为“用了自定义标签”就等于正确接入动态 HTML，忽略该位置是在表达文档身份还是正文中的术语出现。
- 只验证无冲突样例，没构造固定/动态术语同名、同语义多文档、额外样式 class 混入这类边界。
- 把动态替换后的可见文字当作成功，没检查它是否仍对应当前数据库文档。

**根因模式**

- 全局替换器按标签名或 class 匹配，不知道当前元素来自哪个数据库集合；同一个标签名只能表达语义概念，不能表达具体文档身份。
- 词元身份位应保留自身 label，同时利用动态标签获得悬停、双击和高亮能力；若允许替换器覆盖文本，就可能被同名词元改写。
- class 驱动替换如果依赖 `classList[0]`，页面样式 class 会污染语义定位。

**排查步骤**

1. 区分当前元素是“正文内容中的词元出现”，还是“某条词元文档的身份名称”。
2. 对身份名称构造同名固定/动态术语或同语义多词元，断言标题和列表仍显示各自 label。
3. 检查替换后的 DOM：语义 tag/class 是否存在，`data-*Processed` 是否已写入，样式 class 是否不会成为跳转 key。
4. 对技能/角色等 class 驱动项，确认替换器使用匹配到的语义 class，而不是盲取第一个 class。

**修复方向**

- 身份名称可使用动态标签承载交互，但术语类应加 `irreplaceable` 或等效机制保留自身 label。
- 正文展开内容继续让全局替换器正常覆盖文本，因为那里表达的是语义出现，不是文档身份。
- class 驱动替换器应保存匹配到的语义 class，并用它做滚动定位；样式 class 只负责外观。

**验证入口**

- 词元页打开固定术语详情，并模拟存在同 `en` 的动态术语：标题应仍显示固定术语 label，同语义列表应能区分两条文档。
- 打开技能详情：标题和同语义技能项的 DOM 中，技能名 class 应排在样式 class 前或替换器应显式使用匹配到的技能名。
- 在详情页关联内容中验证普通正文标签仍会按全局替换规则显示，不受身份位保留文本策略影响。

## 原生 `title` 与自定义 tooltip 并存，导致悬浮白框脱离主题

**现象信号**

- 用户反馈“有的地方悬浮时出现白色方框备注”，视觉明显不像站内主题组件。
- 搜索自定义 tooltip 样式没有命中对应白框，或修改站内样式后现象仍存在。
- 同一类提示有的来自 `data-tooltip`，有的来自原生 `title`、`button.title` 或 `setAttribute('title', ...)`；旧 `LoreTooltip` 调用只应落到无显示兼容层。

**根因模式**

- 浏览器原生 `title` 提示框不可主题化，深色/典雅模式下会显示系统白框。
- 只删除自定义 tooltip 管理器会漏掉原生 `title`；只删除静态 HTML 属性会漏掉后续 JS / i18n / 渲染器动态写入。
- i18n 属性绑定如 `data-i18n-attr="data-tooltip"` 会在语言切换或局部 apply 后重新生成提示属性。

**排查步骤**

1. 同时搜索 `title=`、`.title =`、`setAttribute('title'...)`、`data-tooltip`、`data-i18n-attr` 和 `LoreTooltip`。
2. 区分视觉提示与可访问名称：删除 hover 提示时，图标按钮原 `title` 文案应改成 `aria-label`。
3. 在浏览器里验证动态新增节点：启动后插入带 `title` / `data-tooltip` 的元素，断言属性会被移除且不会生成 `#lore-tooltip`。

**修复方向**

- 不要尝试给原生 `title` “换皮”；如果产品决定不要悬浮备注，应从源头删除并加全站运行时压制。
- 保留旧 `LoreTooltip` API 的无显示兼容层，防止历史 hover handler 报错或重新创建可见浮层。
- 对动态 DOM 使用 `MutationObserver` 和 `mouseover/focusin` 捕获兜底，清理 `title`、`data-tooltip` 及对应 i18n 绑定。

## 详情页返回主站定位先 focus，导致用户短暂看到旧面板

**现象信号**

- 用户从 A 面板打开词元详情页，在详情页触发跳转到 B 面板内容时，先回到主站看到 A，然后才切到 B。
- 代码里详情页发出 `postMessage` 后立即 `window.opener.focus()` 或立即关闭自身。
- 主站收到消息后异步等待 `replacementsReady`、`requestAnimationFrame` 或滚动定位，焦点切换早于目标面板切换。

**根因模式**

- 跨窗口返回定位被拆成两段：详情页先把焦点交还主站，主站稍后再消费 locator。
- 用户可见的 canonical surface 是主站目标面板，但协议只保证“消息已发送”，没有保证“目标面板已切换”。
- 只验证最终能定位会漏掉中间态闪现，尤其是 opener/postMessage 成功路径与 fallback URL 路径表现不同。

**排查步骤**

1. 搜索 `window.opener.focus()`、`window.close()`、`postMessage` 和 `BroadcastChannel` 的相对顺序。
2. 在主站消息处理函数里区分“收到消息”“切 panel 完成”“目标内容滚动完成”三个阶段。
3. 浏览器验证时观察第一帧可见面板，不能只断言最终高亮目标存在。

**修复方向**

- 返回定位协议使用 requestId + ack：详情页只发送请求并等待，主站先切到目标 panel，再回 ack。
- 焦点切换和详情页关闭必须发生在目标 panel 已经切换之后；滚动和高亮可在 ack 后继续异步完成。
- opener 可用时优先用 `postMessage`，无 opener 时再用 `BroadcastChannel`，避免同一请求被消费两次。
