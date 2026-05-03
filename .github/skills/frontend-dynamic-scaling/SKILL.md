---
name: frontend-dynamic-scaling
description: "Use when: 修改 CSS 动态缩放、响应式布局、force-landscape、横屏/小屏适配、clamp token、em/rem 间距、viewport scaling。适用于 card-html 前端尺寸重构和视觉比例修复。"
argument-hint: "说明要调整的组件、窗口尺寸或缩放问题"
user-invocable: true
---

# 前端动态缩放设计

## 何时使用

- 修改任何 CSS 变量、选择器、媒体查询、横屏或小屏布局。
- 处理文字、牌面、弹窗、菜单、头栏、面板在不同窗口下的比例问题。
- 排查“正常窗口对，小窗口/强制横屏错位、溢出、遮挡、缩放不一致”的问题。

## 必读上下文

1. 先读 `ARCHITECTURE.md` 的 0.12 和 0.13。
2. 再读 `REFACTOR_DYNAMIC_CSS.md`，确认该组件是否已迁移到级联缩放模型。
3. 若改对局页相关尺寸，同时读对应 `style/media/*.css` 或 `game/styles/*.css` 的变量来源。

## 设计流程

1. 找到现有 token 和消费它的选择器，优先调参数，不新增覆盖选择器。
2. 以 `1912x948` 为基准换算 `clamp()` 中间值，保持标准窗口视觉尺寸不变。
3. 纵向尺寸和字号优先跟随 `vh`，横向尺寸优先跟随 `vw`。
4. `padding`、`gap`、`margin` 优先用 `em`，由容器字号级联缩放。
5. 子元素字号默认 `inherit`，只有建立新缩放层级时才重新声明。
6. `html.force-landscape` 中只重定义 token，按视觉轴向进行 `vh` 和 `vw` 互换。
7. 固定高度只用于确实需要屏幕边界的容器；内容区域优先自然撑开，必要时只设置视口安全上限。
8. 删除已经失效的旧定义、重复断点和尺寸补丁，避免在后面追加覆盖层。

## 禁止模式

- 不写 `html.force-landscape .xxx { property: value; }` 的组件级覆盖，除非该属性确实无法 token 化。
- 不用多个互相耦合的 top/right/padding token 手动配平同一个绝对定位元素。
- 不为了小屏隐藏正常窗口存在的功能入口。
- 不用 `transition: all` 覆盖动态尺寸变化。
- 不把固定 px 当作响应式修复，除非它是边框、滚动条、焦点线等非布局尺寸。

## 验收清单

- 标准窗口：`371x675`、`1180x692`、`1180x734`、`1872x1086`、`1912x948`。
- 检查强制横屏下视觉轴是否正确，尤其是弹窗、菜单、牌区、角色摘要、顶部/底部区域。
- 文本不得溢出或互相遮挡；按钮和固定格式控件不得因 hover、加载、长文本改变布局。
- 用户可见变化需要更新 `base/announcements.json`，公告写用户感知结果，不写 CSS 实现细节。
