# Vue SFC 规约 / 模板集 + a11y 检查清单

汇总 Misskey 的 Vue 3 SFC 规约,以及新增 `Mk*` 组件 / 编辑既有组件时的模板 / 无障碍要求的页面。

## 目录

- [SFC 样式基础](#sfc-样式基础)
- [`<script>` / `<style>` 规约](#script--style-规约)
- [模板集](#模板集)
  - [simple (`<slot>` + 简单 props)](#simple-slot--简单-props)
  - [generic + 双 script 块](#generic--双-script-块)
  - [用 `defineModel` 联动 v-model](#用-definemodel-联动-v-model)
  - [用 emit + 具名 slot 从外部注入动作](#用-emit--具名-slot-从外部注入动作)
- [a11y 检查清单](#a11y-检查清单)

## SFC 样式基础

以 Composition API + `<script setup lang="ts">` 为基础 (不新引入 Options API)。当想放置类型声明或 module 作用域的工具时,可以再放一个与 setup 块 **并用** 的额外 `<script lang="ts">` 块 (例: [MkInput.vue](../../../../../packages/frontend/src/components/MkInput.vue) 在单独的块里声明 `SupportedTypes` 类型,然后再写 setup)。SCSS 用 **CSS Modules** 编写,使用 `<style lang="scss" module>`。

```vue
<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
  <div :class="$style.root">
    <!-- ... -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// ...
</script>

<style lang="scss" module>
.root {
  /* ... */
}
</style>
```

## `<script>` / `<style>` 规约

| 项目 | 规约 | 新增不可 |
|---|---|---|
| `<script>` 起始标签 | `<script lang="ts" setup>` 或 `<script setup lang="ts">` (顺序不限) | `<script>` (无 lang) / Options API (`export default { data() {...} }`) |
| Props 定义 | `defineProps<{ ... }>()` (type-only) | runtime object 形式 `defineProps({ name: { type: String } })` |
| Emits 定义 | `defineEmits<{ (ev: 'click'): void }>()` (type-only) | runtime array 形式 `defineEmits(['click'])` |
| 类型泛型 | 通过 `<script setup lang="ts" generic="T extends ...">` 属性传入。需要复杂类型声明时用 **双块结构** ([generic 模式](#generic--双-script-块)) | — |
| `<style>` 起始标签 | `<style lang="scss" module>`,引用用 `:class="$style.foo"` | `<style scoped>` (无 module) 不可新增 (legacy 遗留混用) |
| CSS 值 | 使用 `var(--MI_THEME-...)` (主题) / `var(--MI-...)` (UI 通用常量) | `#fff` / `rgb(...)` / `rgba(...)` 的硬编码 ([scss-modules.md](scss-modules.md)) |
| 全局 class | 活用 `_button` / `_panel` / `_selectable` / `_buttonPrimary` 等 global utility class | — |
| 图标 | Tabler icons class `<i class="ti ti-info-circle">` | 内联 SVG / 其他图标集 |

## 模板集

### simple (`<slot>` + 简单 props)

下面是展示 `<slot>` + props + `withDefaults` 典型模式的**合成示例** (并非某个具体文件的照抄)。真实存在的简单组件示例可参考 [MkInfo.vue](../../../../../packages/frontend/src/components/MkInfo.vue) 等。

```vue
<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="[$style.root, { [$style.warn]: variant === 'warn' }]" class="_selectable">
	<i v-if="variant === 'warn'" class="ti ti-alert-triangle" :class="$style.icon"></i>
	<i v-else class="ti ti-info-circle" :class="$style.icon"></i>
	<div><slot></slot></div>
</div>
</template>

<script lang="ts" setup>
const props = withDefaults(defineProps<{
	variant?: 'info' | 'warn';
}>(), {
	variant: 'info',
});
</script>

<style lang="scss" module>
.root {
	display: flex;
	align-items: center;
	gap: 4px;
	padding: 12px 14px;
	font-size: 90%;
	background: var(--MI_THEME-infoBg);
	color: var(--MI_THEME-infoFg);
	border-radius: var(--MI-radius);

	&.warn {
		background: var(--MI_THEME-infoWarnBg);
		color: var(--MI_THEME-infoWarnFg);
	}
}

.icon {
	margin-right: 4px;
}
</style>
```

要点:

- 需要默认值时用 `withDefaults(defineProps<{...}>(), { ... })` (保持 type-only 的同时传入默认值)
- `_selectable` 是允许选中正文的 global utility class (参考 [scss-modules.md](scss-modules.md))
- `<i class="ti ti-...">` 是 Tabler icons。用 `v-if` 切换按 variant 输出不同图标是常用模式

### generic + 双 script 块

参考: [MkInput.vue](../../../../../packages/frontend/src/components/MkInput.vue)

如果既要接收类型泛型,又不想把那些类型计算或 `type` 别名声明写进 setup 块,可以采用 **把类型声明用 `<script lang="ts">` 和 setup 用 `<script lang="ts" setup>` 两个并排** 的结构。

```vue
<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<button
		v-for="item in items"
		:key="String(item.value)"
		class="_button"
		:class="[$style.item, { [$style.active]: item.value === modelValue }]"
		@click="select(item.value)"
	>
		{{ item.label }}
	</button>
</div>
</template>

<script lang="ts">
// module scope: 只放类型 / 常量 / 纯函数。在 setup 内部可见。
export type ChoiceItem<T> = {
	value: T;
	label: string;
};
</script>

<script lang="ts" setup generic="T extends string | number">
const props = defineProps<{
	modelValue: T;
	items: ChoiceItem<T>[];
}>();

const emit = defineEmits<{
	(ev: 'update:modelValue', value: T): void;
}>();

function select(value: T) {
	emit('update:modelValue', value);
}
</script>
```

要点:

- 加上 `generic="T extends string | number"` 约束后,`v-model` 传入的类型会被限定为 `string` / `number` 系
- 采用双块结构的原因是 **setup 块内无法书写 `export type`**
- 在像 `MkSelect.vue` 这种做复杂类型导出的组件里常用

### 用 `defineModel` 联动 v-model

参考: [MkSelect.vue](../../../../../packages/frontend/src/components/MkSelect.vue), [MkRadios.vue](../../../../../packages/frontend/src/components/MkRadios.vue)

用 `defineModel` 可以把 `props.modelValue` + `emit('update:modelValue', v)` 这 2 行压缩成 1 行。

```vue
<template>
<label :class="[$style.root, { [$style.disabled]: disabled }]">
	<input
		v-model="checked"
		type="checkbox"
		:class="$style.input"
		:disabled="disabled"
	>
	<span :class="$style.label"><slot></slot></span>
</label>
</template>

<script lang="ts" setup>
const checked = defineModel<boolean>({ required: true });

const props = defineProps<{
	disabled?: boolean;
}>();
</script>
```

要点:

- `defineModel<boolean>()` 会 **自动生成 `props.modelValue` 与 `emit('update:modelValue', v)`**。返回值是 `Ref`,因此用 `checked.value = ...` 改写就会触发 emit
- 像 `defineModel('foo')` 这样传入参数,可以建立 `v-model:foo` (`props.foo` + `emit('update:foo', v)`) 的联动
- 新文件的 v-model 联动原则上使用 `defineModel` (手写 `props.modelValue` + `emit` 只保留在既有代码中)

### 用 emit + 具名 slot 从外部注入动作

下面是展示 emit + 具名 slot 典型模式的**合成示例** (并非某个具体文件的照抄)。把点击时的处理委托给调用方的模式 (确认 UI 等)。另外 [MkButton.vue](../../../../../packages/frontend/src/components/MkButton.vue) 本身是只 emit `(ev: 'click', payload: PointerEvent)` 的单功能按钮,结构与本合成示例不同。

```vue
<template>
<div :class="$style.root" class="_panel">
	<div :class="$style.header">
		<slot name="header">{{ i18n.ts.confirm }}</slot>
	</div>
	<div :class="$style.body">
		<slot></slot>
	</div>
	<div :class="$style.footer">
		<button class="_button" :class="$style.cancel" @click="emit('cancel')">
			{{ i18n.ts.cancel }}
		</button>
		<button class="_button _buttonPrimary" :class="$style.ok" @click="emit('ok')">
			{{ i18n.ts.ok }}
		</button>
	</div>
</div>
</template>

<script lang="ts" setup>
import { i18n } from '@/i18n.js';

const emit = defineEmits<{
	(ev: 'ok'): void;
	(ev: 'cancel'): void;
}>();
</script>
```

要点:

- 具名 slot (`<slot name="header">`) 和无名 slot (`<slot></slot>`) 都可以用
- `_panel` / `_button` / `_buttonPrimary` 是 global utility class,不要自己写一遍相同的样式
- `emit('ok')` 等简单 emit 只做中转,`os.confirm` 等真正的确认 UI 启动交给调用方负责 (便于测试与替换)

## a11y 检查清单

汇总了 Misskey 的 PR review 中频繁出现的 a11y 指摘。编辑新增 / 既有组件时要满足以下各点。

### 可点击元素

#### 首选: `<button class="_button">`

```vue
<button class="_button" :class="$style.action" :disabled="disabled" @click="onClick">
	{{ i18n.ts.save }}
</button>
```

- `_button` global class 是去除按钮装饰的 reset (无背景/边框 + `cursor: pointer` + disabled cursor)。**不带** focus ring 和 ripple —— 需要带 ripple 的按钮就用 `MkButton.vue` 组件
- `<button>` 默认就具备 `tabindex` / Enter / Space / `aria-disabled` 的行为以及浏览器标准的焦点环,因此无需额外写 ARIA
- 不想在 form 中触发意外提交时,明确写上 `type="button"` (省略时按 `type="submit"` 处理)

#### 不得已要用 `<div @click>` 时

由于装饰或布局原因无法使用 `<button>` 时,必须配齐 **4 件套**。

```vue
<div
	role="button"
	tabindex="0"
	:aria-disabled="disabled"
	:class="$style.fakeButton"
	@click="onClick"
	@keydown.enter="onClick"
	@keydown.space.prevent="onClick"
>
	<slot></slot>
</div>
```

| 属性 / handler | 为什么需要 |
|---|---|
| `role="button"` | 让屏幕阅读器把它当作按钮读出 |
| `tabindex="0"` | 让键盘可以聚焦 |
| `@keydown.enter` | 用 Enter 触发 (复现真正 `<button>` 的行为) |
| `@keydown.space.prevent` | 用 Space 触发 + 防止页面滚动 |
| `:aria-disabled` | 不只是 disabled 样式,还要传达状态 |

忘记 `@keydown.enter`、只加了 click 是最常见的错误。

#### 原则上禁止用 `<a>` 代替按钮

不跳转 URL 的 `<a href="#" @click.prevent>` 在 a11y / SEO 两方面都不好。是链接就用 `<MkA>` ([MkA.vue](../../../../../packages/frontend/src/components/global/MkA.vue)),是动作就用 `<button>`。

### 表单元素

#### `<label>` 关联

```vue
<!-- ✅ 用 for / id 关联 -->
<label :for="id">{{ i18n.ts.username }}</label>
<input :id="id" v-model="username" type="text">

<!-- ✅ 包裹起来 (无需 id) -->
<label>
	{{ i18n.ts.username }}
	<input v-model="username" type="text">
</label>
```

使用以 slot 接收 label 的通用组件 ([MkInput.vue](../../../../../packages/frontend/src/components/MkInput.vue), [MkSwitch.vue](../../../../../packages/frontend/src/components/MkSwitch.vue)),就能自然遵守这条规约。

#### 用 `aria-label` 代替

不想展示 slot 或 label 时 (例如只有图标的按钮),用 `aria-label`:

```vue
<button class="_button" :aria-label="i18n.ts.close" @click="emit('close')">
	<i class="ti ti-x"></i>
</button>
```

`aria-label` 的值同样要经由 i18n (禁止直写英文)。

**实情:** 当前代码库中 `aria-label` 的使用示例本身就很少 (图标的 hover 提示用的是 `:title="i18n.ts..."`,但 `title` 是 tooltip,不能替代面向屏幕阅读器的标签)。因此 aria-label 与其说是确立的惯例,不如说是写作 a11y 上推荐的最佳实践。新增只有图标的按钮时最好加上。

### `:disabled` 与 `aria-disabled` 的一致

- 真正的 `<button :disabled>` 由浏览器抑制 click,但 `<div role="button">` 不会自动阻止。除了加 `aria-disabled`,还要 **在 handler 一侧也做早返回**:

```ts
function onClick() {
	if (props.disabled) return; // ← 没有这一行的话,disabled 状态下也会触发
	// ...
}
```

### 键盘操作

- 用 Tab 能到达所有可操作元素 (不要随意加 `tabindex="-1"`)
- 打开模态框 / popup 时要考虑 focus trap (像 [MkModal.vue](../../../../../packages/frontend/src/components/MkModal.vue) 这样的既有组件已在内部处理)
- 列表中的项要考虑方向键操作。用 Space / Enter 打开、确定的 UI 可参考 `MkSelect.vue` 的 `@keydown.space.enter`(打开菜单) 模式

### 既有实现参考

| 模式 | 既有组件 |
|---|---|
| 标准按钮 | [MkButton.vue](../../../../../packages/frontend/src/components/MkButton.vue) |
| 自定义 UI 也满足 a11y | [MkSwitch.vue](../../../../../packages/frontend/src/components/MkSwitch.vue) |
| input + label slot | [MkInput.vue](../../../../../packages/frontend/src/components/MkInput.vue) |
| 支持键盘操作的选择 UI | [MkSelect.vue](../../../../../packages/frontend/src/components/MkSelect.vue) |

### 常见的 PR review 指摘

- `<div @click>` 没有 role / tabindex / keydown
- 只有图标的按钮没有 `aria-label` (Tabler icon 本身不带语义信息)
- 只加了 `disabled` 样式,没有 `aria-disabled` / handler 抑制
- 把焦点环 (`:focus-visible` / `outline`) 用 `outline: none` 消掉后一直放着不管
