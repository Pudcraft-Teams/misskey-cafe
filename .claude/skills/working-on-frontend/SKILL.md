---
name: working-on-frontend
description: 每当编辑或新增 `packages/frontend/` 下的代码,或为面向前端的 UI 文本编辑 `locales/ja-JP.yml` 时必须使用 —— 包括 Vue 3 SFC (`Mk*` 组件)、i18n 键 (`i18n.ts.<key>` / `i18n.tsx.<key>()`)、SCSS Modules、主题/CSS 变量、`os.*` UI 辅助函数以及 Storybook stories。涵盖 SPDX (HTML 注释形式)、`<script setup lang="ts">` 规约、type-only defineProps、仅编辑 `ja-JP.yml` 的 locale 规则 (其他 locale yml 文件由 Crowdin 管理,绝不可编辑) 以及无障碍。任何 frontend 或 UI-locale 变更前都必须参照本技能,以避免 CI 失败、翻译丢失和 reviewer 退回。即使已调用 brainstorming、writing-plans 或任何其他上游技能也不豁免 —— 无论之前做过什么,都要在实现阶段调用本技能。
---

# working-on-frontend

编辑 `packages/frontend/` (Misskey Web 客户端) 时最先参照的技能。汇总了 Vue 3 SFC / SCSS Modules / i18n / `os.*` / Storybook / 无障碍 (accessibility) 的 **操作步骤** 与 **背景知识**。

SKILL.md 本体只是指向 references 的索引。具体的步骤和规约需 Read 对应文件 (progressive disclosure 渐进式披露)。

**即使已调用其他上游技能也不豁免。** 即便先调用了 `brainstorming` / `writing-plans` / 其他上游技能,只要进入触及 `packages/frontend/` 的实现阶段就必须调用本技能。

## 按任务划分的工作流 (tasks)

以任务为单位的完整检查清单。新增任何东西时打开。

- 新增 / 改造既有 `Mk*` Vue 组件 → [references/tasks/adding-mk-component.md](references/tasks/adding-mk-component.md)
- 新增 / 修改 i18n 键 (编辑 `locales/ja-JP.yml`) → [references/tasks/adding-i18n-key.md](references/tasks/adding-i18n-key.md)

## 通用知识 (knowledge)

不绑定具体任务的参考资料。**编辑** SFC 时 (即便不是新增) 也可能踩到的规约。

- `<script setup>` / type-only `defineProps` / `defineEmits` / generic SFC / v-model 联动等 SFC 规约 → [references/knowledge/component-conventions.md](references/knowledge/component-conventions.md)
- `i18n.ts.<key>` / `i18n.tsx.<key>(...)` 的区分使用 / HTML 标签内嵌 / 动态键切换 / 既有键的重命名步骤 → [references/knowledge/i18n-usage.md](references/knowledge/i18n-usage.md)
- SCSS Modules / `--MI_THEME-*` `--MI-*` CSS 变量 / 全局 utility class (`_button` 等) → [references/knowledge/scss-modules.md](references/knowledge/scss-modules.md)
- `os.alert` / `os.confirm` / `os.popup` 等 UI 辅助函数 (禁止直接调用浏览器标准 `alert()`) → [references/knowledge/os-api.md](references/knowledge/os-api.md)
- `*.stories.impl.ts` 并置规则 + 多 story / argTypes / layout / action 模式 → [references/knowledge/storybook.md](references/knowledge/storybook.md)
- frontend Vitest / Cypress E2E 的写法与前提 → [references/knowledge/frontend-testing.md](references/knowledge/frontend-testing.md)

## 务必最后经过的地方

在将 frontend 变更提交 commit / PR 之前,务必遵循 [shipping-misskey-change](../shipping-misskey-change/SKILL.md) 的最终检查清单。统一确认 `pnpm lint` / SPDX / 只编辑了 `ja-JP.yml` / CHANGELOG。

如果新增或修改了 `.vue`,在出口处通过 Task 启动 [vue-component-reviewer](../../agents/vue-component-reviewer.md) agent (从 review-mode 对本 skill 规约做机械检查的专用 reviewer),可以更不容易漏掉 SPDX 格式、命名、i18n、SCSS 变量、a11y、Storybook 并置方面的偏差。
