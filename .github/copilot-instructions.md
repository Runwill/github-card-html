# Copilot 全局指令

## CSS 修改前必检

在修改任何 CSS（变量、选择器、媒体查询）之前，**必须**先阅读 `ARCHITECTURE.md` §0.12 的全部反模式清单，并在思考中逐条检查当前方案是否违反：

1. ❌ 耦合型偏移三元组 → 用 `calc()` 从已有 token 推导
2. ❌ 像素值与字号不关联 → 用 `em`/`rem` 或基于 `--fs-root` 推导
3. ❌ 固定高度代替弹性高度 → 仅在必要时使用，且从已有 token 推导
4. ❌ 覆盖式样式修复 → **修改已有参数值**，不新增选择器覆盖；如需新定义，删除原有失效定义
5. ❌ 小屏/横屏删减功能 → 修改参数（字号、间距、布局方向），不隐藏功能

## force-landscape / 横屏 / 小屏样式

- 优先在 `html.force-landscape { }` token 块中**设置 CSS 变量值**，让已有选择器自动消费
- **不要**写 `html.force-landscape .xxx { property: value; }` 形式的选择器覆盖，除非该属性确实没有 token 化且无法 token 化
- 如果某个属性需要在横屏下变化但尚未 token 化，先在原选择器中将硬编码值改为 `var(--token, 原值)`，再在 token 块中设值

## 变更后

- 更新 `base/announcements.json`（§0.8）
- 用标准验收尺寸（§0.10）检查布局
