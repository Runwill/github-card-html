# Agent 通用指引

本仓库的 AI 辅助开发规则统一存放在 `.github/` 目录下，所有 agent 均应遵守，不限于 Copilot。

## ⚠️ 每次变更后必须执行

完成任何用户可见的变更后，**立即**：

1. **更新 `base/announcements.json`** — 在最新日期条目中合并或追加变更项（详见 `ARCHITECTURE.md` §0.8 公告写法规范）
2. **读取 `ARCHITECTURE.md` §0.12** — 若涉及 CSS 修改，逐条检查反模式清单

这两项是**强制步骤**，不是可选建议。遗漏公告更新 = 任务未完成。

## 必读文件

| 文件 | 内容 |
|------|------|
| `.github/copilot-instructions.md` | 全局开发规则、CSS 修改检查清单、变更后流程、经验库自检触发条件、汇报规范 |
| `ARCHITECTURE.md` | 项目架构、响应式机制、验收尺寸、反模式清单 |
| `.github/agent-experience/bug-patterns.md` | 典型 bug 经验库：现象信号、根因模式、排查步骤、修复方向 |
| `.github/agent-experience/missed-cases.md` | 遗漏案例与验证盲区：自检触发信号、失败复盘 |

**注意**：`.github/copilot-instructions.md` 虽然命名含 "copilot"，但内容适用于**所有 agent**。修改前必须读取该文件。

## 领域 Skill（按任务选读）

| 文件 | 适用场景 |
|------|----------|
| `.github/skills/game-page-design/SKILL.md` | 对局页、牌区、拖拽、同步动画、CardViewer |
| `.github/skills/global-frontend-design/SKILL.md` | 全局前端设计 |
| `.github/skills/dynamic-html-token-system/SKILL.md` | 动态 HTML 词元系统 |
| `.github/skills/frontend-dynamic-scaling/SKILL.md` | 前端动态缩放 |
| `.github/skills/codebase-cleanup-refactoring/SKILL.md` | 代码清理与重构流程 |

Skills provide specialized instructions and workflows for specific tasks.
Use the skill tool to load a skill when a task matches its description.

## 任务路由（开始任务前必读）

| 任务类型 | 触发关键词 | 开始前必须读取 |
|---------|-----------|--------------|
| 清理/重构/瘦身/去重 | 清理、审查、重构、瘦身、去重、技术债、owner 合并 | `.github/skills/codebase-cleanup-refactoring/SKILL.md` |
| Bug 修复/回归/异常 | bug、修复、回归、异常、不显示、报错、样式变了 | `.github/agent-experience/bug-patterns.md` + `.github/agent-experience/missed-cases.md` |
| CSS 修改 | CSS、样式、布局、响应式、token | `ARCHITECTURE.md` §0.12 反模式清单 |
| 对局页/牌区/拖拽 | 对局、拖拽、牌区、CardViewer、同步动画 | `.github/skills/game-page-design/SKILL.md` |
| 前端缩放/动态尺寸 | clamp、vw、vh、force-landscape | `.github/skills/frontend-dynamic-scaling/SKILL.md` |

## 核心规则摘要

1. **修改 CSS 前**：先读 `ARCHITECTURE.md` §0.12 反模式清单，逐条检查是否违反。
2. **非平凡 bug / 回归 / 用户可见异常**：先查 `bug-patterns.md` 和 `missed-cases.md`。
3. **变更后**：更新 `base/announcements.json`，用标准验收尺寸检查布局。
4. **清理 / owner 合并汇报**：先报入口与可见差异，再报收益账，最后报验证与风险。
5. **经验库命中后**：必须转成当前任务的自检门禁，不能只停留在"知道有相似条目"。

## 经验库自检

- 触发条件按"异常信号"判断，不只按已知机制判断：凡是处理非平凡 bug、回归、用户可见异常、结果与预期不一致、局部成功/新旧行为混合、干净环境成功但用户当前页面失败，或涉及多入口渲染、多数据源、缓存/预加载、异步时序、状态同步、权限/i18n、浏览器差异、重复 owner 的任务，先阅读 `.github/agent-experience/bug-patterns.md` 和 `.github/agent-experience/missed-cases.md` 中相关条目。
- **排查产出触发**：任何排查过程中，若出现以下任一信号，定位完成后必须立即判断是否需要补录 `bug-patterns.md`——不等用户提醒，不依赖任务是否被归类为"bug 修复"：
  - 根因在与预期不同的层（如以为是 CSS 问题但根因在 JS 内联样式、以为是模型问题但根因在渲染层）。
  - 排查路径走过 2 个以上错误假设才定位到真实根因。
  - 用户提供了关键排查方向（如指出 DevTools 的实际值、提示检查内联样式、指出缓存/覆盖可能），而 agent 此前未自行想到。
- 用户指出"为什么没发现/为什么以为成功"、质疑验证结论、提出缓存/覆盖/多重实现等可能，或工具结果、浏览器现象、日志与先前判断冲突时，立即转入经验库自检，再继续排查。
- 用户质疑某个问题"算不算遗漏案例/为什么没记录"、指出经验库触发条件过窄、规则无法覆盖当前情况，或要求改进自检触发条件时，也视为流程盲区信号；先判断是否需要更新 `missed-cases.md`，再修改规则文案。
- 若任务中发现可复用的问题模式、排查路径或根因，更新或合并到 `bug-patterns.md`；若发现是因为验证路径、假设、异常信号、自我复查或用户反馈才补上的盲区，更新或合并到 `missed-cases.md`。
- 记录时写清：现象信号、误导点、根因、应补的检查、推荐验证入口；不要只写文件名或函数名，也不要记录一次性临时状态。
- 已有相似条目时优先合并、改写或补充"何时触发自检"，不要为同一类问题追加重复条目。
- 读取经验库后，不能只停留在"知道有相似条目"；必须把命中的条目转成当前任务的自检门禁：相关 owner、失败分支、状态组合、入口验证、未覆盖风险。若任务进入实现阶段，先用这些门禁补断言或验证清单。
- 若相似问题再次发生，复盘时必须区分三类失败：未触发自检、触发但条目抽象层级不对、触发但没有转成任务门禁；再决定是改触发规则、改条目层级，还是改验证流程。
- 非平凡修复、领域模型迁移、跨模块动画/同步修复或 owner 合并完成后，最终汇报前必须主动做一次"非 MD 代码膨胀自检"：统计 JS/CSS/HTML/JSON 的非空非注释增删，检查临时测试脚本、调试元数据、只调用一次 wrapper、未消费透传字段、重复失败清理和旧兼容残留。不能等用户提醒后才复审。
- 若净增明显偏高（例如超过约 100 行，或用户刚质疑过代码膨胀/重复犯错），先按文件拆账并处理低风险净删项；剩余增量必须说明保留 owner 和用户可见行为价值。

## 执行检查清单

Agent 在执行任务前必须先过一遍对应类型的检查清单：

### 清理 / 重构任务

1. **先算账再动手**：新增任何共享定义（`:root` 块、helper 函数、工具类）前，先计算"新增 N 行能消除 M 行"，M > N 才执行。
2. **每批次结束前**：运行 `git diff --shortstat` 检查净收益，确保删除行数 > 新增行数。
3. **汇报前**：按 `copilot-instructions.md` §清理汇报 模板输出，第一段必须是"入口与可见差异"。

### Bug 修复任务

1. **修复前**：查 `bug-patterns.md` 和 `missed-cases.md`，转成当前任务门禁。
2. **修复中**：遇到以下信号时立即重新自检并考虑补录经验库：
   - 走了 2 个以上错误假设
   - 用户指出"这是反模式"或"不应该这样做"
   - 发现根因在架构层（优先级、设计语义、状态管理）而非表面问题
   - 代码清理/迁移导致的回归
3. **修复后**：运行 `git diff --shortstat`，若净增 > 100 行则做膨胀复审。
4. **汇报前**：说明根因、修复方式、验证入口、未覆盖风险。
5. **记录决策**：每次修复完成后强制停顿，问自己：
   - 这个问题是否走了多个弯路？
   - 是否有更深层的架构问题？
   - 是否应该记录到经验库（`bug-patterns.md` 或 `missed-cases.md`）？

### 功能开发任务

1. **开发前**：确认是否涉及 CSS 修改（读反模式清单）、是否涉及新弹窗/面板（读 overlay 系统）。
2. **开发后**：更新 `announcements.json`，用标准验收尺寸检查布局。
3. **汇报前**：说明用户可见变化、入口路径、验证命令。
