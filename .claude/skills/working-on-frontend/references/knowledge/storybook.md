# Storybook (`*.stories.impl.ts`) 规约

惯例是给共享 `Mk*` 组件在 **同层级** 并置 `Mk<Name>.stories.impl.ts`。

## 放置与命名

- **文件名固定为 `.stories.impl.ts`** (`.stories.ts` 是 `packages/frontend/.storybook/generate.tsx` 的生成物,不可手工编辑、不可提交)
- 放在同层级 (`components/MkButton.stories.impl.ts`、`components/global/MkAvatar.stories.impl.ts` 等)
- 开头需要 TS 注释形式的 SPDX 头

## 基本: 单一 story (仅 Default)

简单组件用这个就够。(下面的 `MkColoredTag` 是用于讲解的**虚构组件名**,并不存在。真实模式参考 `MkButton.stories.impl.ts`。)

```ts
/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable import/no-default-export */
import type { StoryObj } from '@storybook/vue3';
import MkColoredTag from './MkColoredTag.vue';

export const Default = {
	render(args) {
		return {
			components: { MkColoredTag },
			setup() {
				return { args };
			},
			template: '<MkColoredTag v-bind="args">タグ</MkColoredTag>',
		};
	},
	args: {
		variant: 'info',
	},
	parameters: {
		layout: 'centered',
	},
} satisfies StoryObj<typeof MkColoredTag>;
```

要点:

- 顶部那 2 个 `eslint-disable` 是 Storybook 的惯例,必须有 (因为 render 函数不显式声明 return type / 因为不是 `default export`)
- 没有 `satisfies StoryObj<typeof MkColoredTag>` 的话,`args` 的类型补全就失效

## 多 story (按 variant)

参考: [MkButton.stories.impl.ts](../../../../../packages/frontend/src/components/MkButton.stories.impl.ts)

如果有 variant / size / 状态等变体,以 `Default` 为 base 用 spread 派生会更简洁。

```ts
export const Default = {
	render(args) {
		return {
			components: { MkColoredTag },
			setup() {
				return { args };
			},
			template: '<MkColoredTag v-bind="args">タグ</MkColoredTag>',
		};
	},
	args: {
		variant: 'info',
	},
	parameters: {
		layout: 'centered',
	},
} satisfies StoryObj<typeof MkColoredTag>;

export const Warn = {
	...Default,
	args: { ...Default.args, variant: 'warn' },
} satisfies StoryObj<typeof MkColoredTag>;

export const Danger = {
	...Default,
	args: { ...Default.args, variant: 'danger' },
} satisfies StoryObj<typeof MkColoredTag>;

export const Disabled = {
	...Default,
	args: { ...Default.args, disabled: true },
} satisfies StoryObj<typeof MkColoredTag>;
```

## 可视化事件 (`action()`)

想在 Storybook 的 Actions panel 中看到点击等 emit 时,使用 `storybook/actions` 的 `action()`。

```ts
import { action } from 'storybook/actions';
// ...
export const Default = {
	render(args) {
		return {
			components: { MkColoredTag },
			setup() {
				return { args };
			},
			computed: {
				props() {
					return { ...this.args };
				},
				events() {
					return {
						click: action('click'),
						close: action('close'),
					};
				},
			},
			template: '<MkColoredTag v-bind="props" v-on="events">タグ</MkColoredTag>',
		};
	},
	args: {},
	parameters: { layout: 'centered' },
} satisfies StoryObj<typeof MkColoredTag>;
```

`MkButton.stories.impl.ts` 就是这种模式。

## 用 `argTypes` 精细控制 controls

把 string union 变成 radio / 把 number 变成 range,review 时会更轻松。(标准 Storybook 功能。当前仓库内的 `.stories.impl.ts` 实际并未使用,所以不是必须的。)

```ts
export const Default = {
	render(args) { /* ... */ },
	args: { variant: 'info' },
	argTypes: {
		variant: {
			control: 'inline-radio',
			options: ['info', 'warn', 'danger'],
		},
		disabled: {
			control: 'boolean',
		},
	},
	parameters: { layout: 'centered' },
} satisfies StoryObj<typeof MkColoredTag>;
```

## `parameters.layout` 的区分使用

| 值 | 适用场景 |
|---|---|
| `'centered'` | 单体展示 (按钮、标签、图标等小部件) |
| `'fullscreen'` | 页面级,或想展示整个面板时 |
| `'padded'` (默认) | 想在周围留白的中等尺寸部件 |

仅改 `layout` 就会大幅改变 Storybook 上的呈现。布局依赖的组件 (sticky header 等) 选 `'fullscreen'`。

## 让 slot 内容可变

给 `args` 加一个 slot 用的字符串字段,在 template 里像 `{{ args.label }}` 这样展开。

```ts
export const Default = {
	render(args) {
		return {
			components: { MkColoredTag },
			setup() {
				return { args };
			},
			template: '<MkColoredTag v-bind="args">{{ args.label }}</MkColoredTag>',
		};
	},
	args: {
		label: 'タグ',
		variant: 'info',
	},
	parameters: { layout: 'centered' },
} satisfies StoryObj<typeof MkColoredTag>;
```

但切忌把 `label` 设成组件的 props (若方针是用 slot 接收,就保持 slot)。把它当作仅在 Storybook 上使用的展示用字符串。

## 确认方法

```bash
pnpm --filter frontend storybook-dev    # http://localhost:6006
pnpm --filter frontend build-storybook  # 静态构建
```

新组件的 stories 不出现在 Sidebar 时,多半是因为没进入 [generate.tsx](../../../../../packages/frontend/.storybook/generate.tsx) 的生成对象 **allowlist**。`src/{components,pages,...}/**/*.vue` 的整体 glob 已被注释掉,对象是 `globSync('src/components/global/Mk*.vue')` / `globSync('src/components/Mk[B-E]*.vue')` 等**显式列举**。仅并置 `.stories.impl.ts` 有时不会自动出现,所以若不在对象内就往 generate.tsx 加 1 行。此外也要确认文件名 (`.stories.impl.ts`) 以及 SPDX 头之后没有语法错误。

还会用 Chromatic (`pnpm --filter frontend chromatic`) 做视觉回归检查。
