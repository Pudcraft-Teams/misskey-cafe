# 新增 / 改造既有 `Mk*` Vue 组件

向 `packages/frontend/src/components/` 下新增共享 Vue 3 SFC,或对既有组件做较大改造时的步骤。从 review 侧检查相同规约的 agent 是 [.claude/agents/vue-component-reviewer.md](../../../../agents/vue-component-reviewer.md)。

## 大前提 (直接关乎事故 / Critical)

1. **SPDX 头** — `.vue` 用 HTML 注释形式 `<!-- ... -->`,`.stories.impl.ts` 用 TS 注释形式 `/* ... */`。缺失会导致 CI (`spdx` 任务) 失败
2. **必须带 `Mk` 前缀** — 共享组件以 `Mk` 开头,如 `MkButton.vue` / `global/MkAvatar.vue`。页面专用 UI 不加 `Mk`,放到 `pages/` 一侧
3. **只能编辑 `locales/ja-JP.yml`** — 新增 i18n 键时不可手动改动其他语言 (`en-US.yml` 等)。它们会被 Crowdin 自动分发覆盖而丢失。详见 [tasks/adding-i18n-key.md](adding-i18n-key.md)
4. **禁止直写字符串字面量** — 无论模板还是 JS,展示给用户的文案必须经由 `i18n.ts.<key>` 或 `i18n.tsx.<key>(...)` → [knowledge/i18n-usage.md](../knowledge/i18n-usage.md)
5. **不直接调用浏览器标准 UI** — 禁止 `alert()` / `confirm()` / `window.prompt()`,必须经由 `os.alert` / `os.confirm` / `os.popup` → [knowledge/os-api.md](../knowledge/os-api.md)

## 文件放置

| 放置位置 | 用途 | 命名 |
|---|---|---|
| `packages/frontend/src/components/Mk<Name>.vue` | 一般的共享 UI 组件 | `Mk<Name>.vue` |
| `packages/frontend/src/components/global/Mk<Name>.vue` | 在 `components/index.ts` 中注册为 Vue 全局组件 (`app.component`),无需 import 即可在所有模板中使用的基础部件 (`MkA` / `MkAvatar` / `MkAcct` 等) | `Mk<Name>.vue` (即便在子目录内也必须带 `Mk` 前缀) |
| `packages/frontend/src/components/grid/Mk<Name>.vue` | 表格/网格类部件集合 | 同上 |
| `packages/frontend/src/pages/<Name>.vue` | 单一页面专用的 UI (不复用) | **无需** `Mk` 前缀 |

拿不准时用「是否可能被其他 `Mk*.vue` import?」来判断。是则放 `components/`,否则放 `pages/`。

如果需要 story (≈ 几乎总是需要),同层级也建一个 `Mk<Name>.stories.impl.ts` → [knowledge/storybook.md](../knowledge/storybook.md)。

## SPDX 头

### `.vue` 文件 (HTML 注释)

```html
<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
```

**不要使用** `/* ... */` (TS / JS 形式)。既有 `.vue` 文件全部采用 HTML 注释形式,统一为作为 SFC 开头更自然的形式。

### `.stories.impl.ts` 文件 (TS 注释)

```ts
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */
```

## 最小模板

展示一个简单显示组件最小形态的**合成示例** (并非某个具体文件的照抄)。真实存在的简单组件示例可参考 [MkInfo.vue](../../../../../packages/frontend/src/components/MkInfo.vue) 等:

```vue
<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, $style[`variant_${variant}`]]">
	<slot></slot>
	<button
		v-if="closable"
		class="_button"
		:class="$style.close"
		:aria-label="i18n.ts.close"
		@click="emit('close')"
	>
		<i class="ti ti-x"></i>
	</button>
</div>
</template>

<script lang="ts" setup>
import { i18n } from '@/i18n.js';

const props = withDefaults(defineProps<{
	variant?: 'info' | 'warn' | 'danger';
	closable?: boolean;
}>(), {
	variant: 'info',
});

const emit = defineEmits<{
	(ev: 'close'): void;
}>();
</script>

<style lang="scss" module>
.root {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 12px 14px;
	border-radius: var(--MI-radius);
}

.variant_info {
	background: var(--MI_THEME-infoBg);
	color: var(--MI_THEME-infoFg);
}

.variant_warn {
	background: var(--MI_THEME-infoWarnBg);
	color: var(--MI_THEME-infoWarnFg);
}

.variant_danger {
	background: var(--MI_THEME-error);
	color: var(--MI_THEME-fgOnAccent);
}

.close {
	margin-left: auto;
}
</style>
```

更复杂的情况 (类型泛型 / 双 script 块 / `v-model` 联动 / 具名 slot) → [knowledge/component-conventions.md §模板集](../knowledge/component-conventions.md)。

## `<script>` / `<style>` 规约摘要

| 项目 | 规约 | 新增不可 |
|---|---|---|
| `<script>` 起始标签 | `<script lang="ts" setup>` 或 `<script setup lang="ts">` | `<script>` (无 lang) / Options API |
| Props 定义 | `defineProps<{ ... }>()` (type-only) | runtime object 形式 |
| Emits 定义 | `defineEmits<{ (ev: 'click'): void }>()` (type-only) | runtime array 形式 |
| `<style>` 起始标签 | `<style lang="scss" module>`,引用用 `:class="$style.foo"` | `<style scoped>` (无 module) |
| CSS 值 | `var(--MI_THEME-...)` / `var(--MI-...)` | `#fff` / `rgb(...)` 硬编码 |
| 全局 class | 活用 `_button` / `_panel` / `_selectable` 等 | — |
| 图标 | Tabler icons class `<i class="ti ti-info-circle">` | 内联 SVG / 其他图标集 |

详细与模板集 → [knowledge/component-conventions.md](../knowledge/component-conventions.md) / [knowledge/scss-modules.md](../knowledge/scss-modules.md)。

## i18n 的区分使用

无参数 → `i18n.ts.<key>` / 有参数 → `i18n.tsx.<key>(...)`。详见 → [knowledge/i18n-usage.md](../knowledge/i18n-usage.md)。

如果需要新增键 → [tasks/adding-i18n-key.md](adding-i18n-key.md)。

## `os.*` 辅助函数

`os.alert` / `os.confirm` / `os.popup` / `os.toast` / `os.popupMenu` 等。详见 → [knowledge/os-api.md](../knowledge/os-api.md)。

## 无障碍最低底线

1. **可点击元素优先选用 `<button class="_button">`**。不得已用 `<div @click>` 时,必须配齐 `role="button"` + `tabindex="0"` + `@keydown.enter` / `@keydown.space.prevent` 这 4 件套
2. **表单元素 (`<input>` / `<select>` / `<textarea>`) 要么 `<label>` 关联,要么用 `aria-label`**
3. **使 `:disabled` 绑定与 `aria-disabled` 一致**。在 handler 一侧也要早返回 (early return)
4. **确认能否仅靠键盘完成** (能用 Tab 移动焦点 / 能用 Enter 确定)
5. ARIA 属性保持最少

详细检查清单与既有示例 (`MkButton.vue` / `MkSwitch.vue`) → [knowledge/component-conventions.md §a11y](../knowledge/component-conventions.md)。

## Storybook 并置

共享 `Mk*` 组件要在 **同层级** 并置 `Mk<Name>.stories.impl.ts` (含子目录)。详见 → [knowledge/storybook.md](../knowledge/storybook.md)。

## 验证流程

```bash
# 类型检查 (vue-tsc)
pnpm --filter frontend typecheck

# ESLint (全部规约)
pnpm --filter frontend eslint

# 对单个文件执行 ESLint --fix
pnpm exec eslint --fix packages/frontend/src/components/Mk<Name>.vue

# 在 Storybook 中目视确认
pnpm --filter frontend storybook-dev    # localhost:6006

# Vitest unit test (若有 component spec)
pnpm --filter frontend test
```

## CHANGELOG 条目

如果是用户可见的变更 (新组件作为新 UI 露出、改变既有 UI 行为),要在 `CHANGELOG.md` 追加。判定方法与书写格式见 [shipping-misskey-change 技能](../../../shipping-misskey-change/SKILL.md)。

## 与既有组件保持一致

- 读 1-2 个用途相近的既有 `Mk*`,对齐 props 命名 (`primary` / `danger` / `small` 等形容词、用 `emit('close')` 而非 `onClose` 等)
- 善用全局 utility class (`_button` / `_panel` / `_selectable` / `_gaps_m`),就能不写自定义样式 → [knowledge/scss-modules.md](../knowledge/scss-modules.md)
- 较大的功能要在 Storybook 中覆盖各种变体 (variant / size / disabled / loading)

## 参考代码

- [MkInfo.vue](../../../../../packages/frontend/src/components/MkInfo.vue) — simple SFC 示例
- [MkButton.vue](../../../../../packages/frontend/src/components/MkButton.vue) — 通用按钮 (a11y / `_button` global class)
- [MkInput.vue](../../../../../packages/frontend/src/components/MkInput.vue) — generic + 双 script 块示例
- [MkSelect.vue](../../../../../packages/frontend/src/components/MkSelect.vue) — `defineModel` + 具名 slot 示例
- [MkSwitch.vue](../../../../../packages/frontend/src/components/MkSwitch.vue) — 含 a11y 的自定义 UI
- [MkButton.stories.impl.ts](../../../../../packages/frontend/src/components/MkButton.stories.impl.ts) — 多 story Storybook 模板
- [packages/frontend/src/os.ts](../../../../../packages/frontend/src/os.ts) — UI 操作 API 一览
- [packages/frontend/src/i18n.ts](../../../../../packages/frontend/src/i18n.ts) — `i18n.ts` / `i18n.tsx` 实现
