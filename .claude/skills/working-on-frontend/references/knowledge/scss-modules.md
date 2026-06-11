# SCSS Modules / CSS 变量 / utility class

Misskey 的 SCSS 规约。汇总 `<style lang="scss" module>` 的写法、`--MI_THEME-*` / `--MI-*` CSS 变量的区分使用,以及全局 utility class 一览。

## CSS 变量的区分使用

Misskey 的主题系统由 2 套 CSS 变量构成。新增样式 **必须经由变量**。直接硬编码 `#fff` / `rgb()` / `rgba()` 会被 vue-component-reviewer 标为 Major 指摘。

### `--MI_THEME-*` (依赖主题)

随用户所选主题 (light / dark / 个别主题) 变化的颜色。在 `packages/frontend-shared/themes/_dark.json5` 等中定义。

| 变量 | 用途 |
|---|---|
| `--MI_THEME-bg` | 页面背景 |
| `--MI_THEME-panel` | 卡片 / 面板背景 |
| `--MI_THEME-panelHighlight` | 强调显示的面板 |
| `--MI_THEME-fg` | 正文文字颜色 |
| `--MI_THEME-fgHighlighted` | 强调文字颜色 |
| `--MI_THEME-fgOnPanel` | 面板上的文字 |
| `--MI_THEME-fgOnAccent` | accent 色背景上的文字 (≈ 白系) |
| `--MI_THEME-accent` | 主强调色 (链接、active state) |
| `--MI_THEME-accentedBg` | accent 系的浅背景 |
| `--MI_THEME-divider` | 分隔线 |
| `--MI_THEME-error` | 错误色 |
| `--MI_THEME-warn` / `--MI_THEME-infoWarnBg` / `--MI_THEME-infoWarnFg` | 警告系 |
| `--MI_THEME-infoBg` / `--MI_THEME-infoFg` | 信息系 |
| `--MI_THEME-buttonBg` / `--MI_THEME-buttonHoverBg` | 按钮背景 |
| `--MI_THEME-inputBorder` / `--MI_THEME-inputBorderHover` | 表单边框 |
| `--MI_THEME-focus` | 焦点环颜色 |
| `--MI_THEME-link` | 链接颜色 |
| `--MI_THEME-mention` / `--MI_THEME-hashtag` | 提及 / 话题标签 |

需要完整一览时,读 `packages/frontend-shared/themes/_light.json5` 最快 (JSON5 中所有键齐全)。

### `--MI-*` (UI 通用常量,不依赖主题)

| 变量 | 用途 |
|---|---|
| `--MI-radius` | 标准圆角 (`12px`) |
| `--MI-margin` | 标准间距 (大,`16px` / 移动端为 `10px`) |
| `--MI-marginHalf` | 标准间距的一半 |
| `--MI-modalBgFilter` | 模态框背景 (backdrop) 的滤镜 |

使用 `var(--MI-radius)` 能让整个应用的圆角大小统一。像 `border-radius: 12px;` 这样直写,后续来了改圆角的需求时就得逐处修改。

### 硬编码的例外

颜色基本禁止硬编码,但以下情况是正当的:

- `transparent` / `currentColor` / `none` 等 CSS 关键字
- 只想动态改 alpha → 用 `color-mix(in srgb, var(--MI_THEME-fg) 50%, transparent)` 这样合成
- 图标尺寸等未做成 CSS 变量的数值常量 (`font-size: 14px;` 等是 OK 的)

## 全局 utility class

定义在 `packages/frontend/src/style.scss` 中的全局 class。与 `<style module>` 内的类 **并用** (不是 `:class="[$style.root, '_button']"`,而是直接写在 HTML 的 `class="_button"` 属性上)。

下表是 **常用代表例**,并非全部 (class 会随时增减,这份一览容易过期)。想确认手头的 class 是否真实存在 / 查看实现时,直接看正本 [packages/frontend/src/style.scss](../../../../../packages/frontend/src/style.scss) (用 `grep -nE '^\._' packages/frontend/src/style.scss` 可列出已定义的 class)。

| class | 含义 |
|---|---|
| `_button` | 可点击的无装饰基底 (仅 `appearance:none` + `cursor:pointer` + disabled cursor 的 reset。**不含** focus ring 和 ripple —— 需要 ripple 就用 `MkButton.vue`)。加在 `<button>` 或 `<a>` 上 |
| `_buttonPrimary` | `_button` + accent 色背景 (确定动作) |
| `_buttonGradate` | `_button` + 渐变背景 |
| `_panel` | 卡片 / 面板框 (背景 + 圆角 + `overflow:clip`。不含 shadow) |
| `_selectable` | 允许选中文本 (因为 Misskey 默认抑制正文以外的选中) |
| `_selectableAtomic` | 把子元素作为 1 个单位整体选中 |
| `_noSelect` | 禁止选中文本 |
| `_nowrap` | `white-space: nowrap;` |
| `_help` | accent 色 + `cursor: help` (用于帮助图标) |
| `_textButton` | accent 色的文本按钮 (hover 时下划线) |
| `_link` | 文本链接强调 |
| `_gaps` | 纵向 flex (`display: flex; flex-direction: column; gap: var(--MI-margin);`) |
| `_gaps_m` / `_gaps_s` | 同为纵向 flex 但 gap 固定 (`21px` / `10px`) |
| `_margin` | 标准 margin (= `--MI-margin`) |
| `_shadow` | 标准阴影 (`box-shadow`) |
| `_popup` | 用于 popup / dropdown (背景 + 圆角 + `contain`。不含 shadow) |
| `_acrylic` | 半透明 + backdrop blur (亚克力风) |

用法:

```vue
<template>
<button class="_button _buttonPrimary" :class="$style.action" @click="onClick">
	{{ i18n.ts.save }}
</button>
</template>

<style lang="scss" module>
.action {
	padding: 8px 24px;
	/* 背景色和 focus ring 由 _buttonPrimary 提供,所以不写 */
}
</style>
```

## `<style lang="scss" module>` 的特殊写法

### 用 `:global(...)` 跳出 module 作用域

`<style lang="scss" module>` 内写的类名会在构建时被哈希化,无法被其他组件引用。仅在想刻意跳出它 (给子组件一侧的特定类或外部库的类加样式) 时才用 `:global(...)`:

```scss
.root {
	:global(.someThirdPartyClass) {
		color: var(--MI_THEME-fg);
	}
}
```

通常几乎不用。

### 用 `:deep(...)` 命中子组件内部

```scss
.root :deep(.child-internal-class) {
	color: var(--MI_THEME-accent);
}
```

这个也不常用 (更建议直接修改子组件)。

## 命名

- module class 惯例用 **camelCase** (`root` / `inputCore` / `headerText`)
- 不用 BEM 风的 `block__element--modifier` (CSS Modules 会哈希化,无需担心名称冲突)
- 状态 modifier 像 `&.active` / `&.disabled` 这样嵌套

## 常见的 review 指摘

- `#fff` / `#000` / `rgba(0, 0, 0, 0.5)` 的硬编码 → 换成 `var(--MI_THEME-fg)` / `var(--MI_THEME-bg)` / `color-mix(...)` 等
- 用了 `<style scoped>` (不是 module) → 改成 `<style lang="scss" module>`,用 `:class="$style.foo"` 引用
- 自己写了 `border-radius: 8px; padding: 14px;` → 用 `_panel` global class 就不需要
- 自己写了 button styling → 在 `_button` global class 基础上叠加
