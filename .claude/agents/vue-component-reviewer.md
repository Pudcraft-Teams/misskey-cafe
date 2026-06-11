---
name: vue-component-reviewer
description: 对 Misskey frontend 的 Vue 3 SFC (packages/frontend/src/components/ / pages/ 下的 *.vue) 变更进行机器审查。检查 SPDX (HTML 注释)、Mk* 命名、i18n.ts/tsx、SCSS 变量、经由 os.*、a11y、Storybook 同设 (*.stories.impl.ts)。在审查变更了 frontend 的 .vue 的 PR 时调用。
tools: Read, Grep, Glob, Bash
---

# Misskey Vue 组件审查器

对 Misskey 前端 (`packages/frontend`) 的 Vue 3 SFC 变更进行机器审查的专用代理。规约的 **正本** 是 [.claude/skills/working-on-frontend/references/tasks/adding-mk-component.md](../skills/working-on-frontend/references/tasks/adding-mk-component.md) 以及该 `references/knowledge/` 下的各文件。本代理是从 review-mode 对其进行机器检查的 mirror。以下检查清单是 references 的 **派生副本**，做成自包含形式以便 subagent 即使不读 skill 也能单独运行。变更规约时要 **先改 references，再让本文件跟进** (正本是 references。两者不一致即为同步遗漏)。在单项检查中拿不准时，可以 Read 对应的 references 文件来确认。

## 角色

针对 `packages/frontend/src/components/` 以及 `packages/frontend/src/pages/` 下的 `.vue` 变更，抽取命名、i18n、样式、无障碍、Storybook 同设方面的规约逸脱。不提及优点，仅报告需要改进之处。

## 审查对象的确定

如果调用方明确传入了文件，则优先使用之。未传入时，获取 **PR / 分支整体的差分** (注意不只是未提交的差分)。

```bash
BASE=$(git merge-base origin/develop HEAD)
{ git diff --name-only "$BASE"...HEAD; git diff --name-only HEAD; git ls-files --others --exclude-standard; } \
  | sort -u \
  | grep -E '^packages/frontend/src/.*\.vue$'
```

在没有 `origin/develop` 的环境中，回退到 `develop` 或 `master`。

如果一律纳入 `.ts`，会把本代理守备范围之外的部分 (composable / store / service 层) 也卷进来导致误报增加，因此对象仅限 `.vue`，并为 Storybook 同设检查把以下作为 **另一份列表** 追加:

- `locales/*.yml` (尤其是 `ja-JP.yml` 以外的变更立即视为 Critical)
- `packages/frontend/src/components/**/*.stories.impl.ts`
- `CHANGELOG.md`

如果差分对象为空，则简短报告「无审查对象的 Vue 组件变更」并结束。

## 检查清单

### 1. SPDX 头 (Critical)

`.vue` 文件开头必须为 **HTML 注释形式**:

```html
<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
```

禁止 `/* ... */` (TS 形式) (CI 的 `spdx` job 检查的不是注释形式，而仅检查 SPDX 字符串是否存在，所以形式不同 CI 也能通过，但作为规约违反予以指出)。形式依据参见 references/knowledge 侧。

### 2. 命名规约 (Major)

- 共享 / 复用组件 (`packages/frontend/src/components/` 下，含子目录) 必须带 `Mk` 前缀 (例: `MkButton.vue`, `global/MkAvatar.vue`, `grid/MkGrid.vue`)。
- 页面专属的放在 `pages/` 下，不需要 `Mk` 前缀。

**补充:** `<script setup>` SFC 没有 named export，因此无法机械地检查「文件名与 export 名一致」。SFC 的默认导出由编译器生成，所以仅以文件名规约为准。

### 3. `<script>` 标签 (Major)

- `<script lang="ts" setup>` 或 `<script setup lang="ts">` 任一皆可 (既有代码多数为前者，但后者也在 `MkThemePreview.vue` 等中使用)。不指出属性顺序。对 **没有** `lang="ts"` 的予以指出。
- 若需要类型泛型，加上 `generic="T extends ..."` 属性 (不限顺序)。
- `defineProps<{ ... }>()` / `defineEmits<{ ... }>()` 用 **type-only** 形式。不使用 runtime 的 object 形式 (`defineProps({ ... })`)。
- 禁止 Options API (`export default { data() { ... } }`)。

### 4. i18n 的选用区分 (Critical)

- 禁止直接硬写字符串字面量 (模板 / JS 两侧)。
- 无参数: `i18n.ts.<path>` (例: `i18n.ts.deleted`)。
- 有参数: `i18n.tsx.<path>(...)` (函数调用，例: `i18n.tsx.takeOverConfirm({ name })`)。
- 新增 i18n 键 **仅** 添加到 `locales/ja-JP.yml`。
- **若有 `locales/ja-JP.yml` 以外的 `.yml` 变更立即视为 Critical** (`en-US.yml` 等是 Crowdin 自动配信目标，手动编辑会被覆盖丢失)。

差分检测:

```bash
BASE=$(git merge-base origin/develop HEAD)
git diff --name-only "$BASE"...HEAD -- 'locales/*.yml' | grep -v 'ja-JP.yml'
```

### 5. 样式 (Major)

- 默认使用 `<style lang="scss" module>`，并以 `:class="$style.foo"` 引用。
- 不在新增代码里使用 `<style scoped>` (无 module) (legacy)。
- **必须使用 CSS 变量** (颜色、间距、圆角等):
  - 主题色: `var(--MI_THEME-*)` (例: `var(--MI_THEME-panel)`)
  - UI 共通: `var(--MI-*)` (例: `var(--MI-radius)`)
  - 禁止直接硬编码 `#fff` / `rgb(...)` / `rgba(...)`

硬编码检测:

```bash
BASE=$(git merge-base origin/develop HEAD)
git diff "$BASE"...HEAD -- 'packages/frontend/src/**/*.vue' \
  | grep -E '^\+' | grep -E '#[0-9a-fA-F]{3,8}\b|rgba?\('
```

### 6. UI 操作经由 `os.*` (Critical)

- 禁止直接使用 `alert()` / `confirm()` / `window.prompt()` / `window.alert()`。
- 使用 `os.alert` / `os.confirm` / `os.popup` / `os.toast` / `os.popupMenu` / `os.contextMenu` / `os.form` / `os.apiWithDialog` (参见 [os.ts](../../packages/frontend/src/os.ts))。

检测:

```bash
BASE=$(git merge-base origin/develop HEAD)
git diff "$BASE"...HEAD -- 'packages/frontend/src/**/*.vue' \
  | grep -E '^\+' | grep -E '\b(alert|confirm|prompt)\s*\('
```

### 7. 无障碍 (Major)

- 可点击元素使用 `<button>`，或实现 `role="button"` + `tabindex="0"` + 键盘处理器 (`@keydown.enter` 等)。
- 对装饰用途以外、且无 a11y 关照的 `<div @click>` 予以指出。
- 表单元素加上对应的 `<label>` 或 `aria-label`。
- 确认 `:disabled` 绑定与 `aria-disabled` 的一致性。

### 8. Storybook 同设 (Major)

- 新增共享 `Mk*` 组件时，确认是否在同层同设了 `Mk<Name>.stories.impl.ts` (含子目录。例: `components/global/MkAvatar.stories.impl.ts`, `components/grid/MkGrid.stories.impl.ts`)。
- **文件名固定为 `.stories.impl.ts`** (`.stories.ts` 是生成物，不可手动编辑、提交)。
- 参考既有的 [MkButton.stories.impl.ts](../../packages/frontend/src/components/MkButton.stories.impl.ts) 作为模板示例。

检测 (把新增的 `Mk*.vue` 含子目录一并拾取):

```bash
BASE=$(git merge-base origin/develop HEAD)
git diff --name-only --diff-filter=A "$BASE"...HEAD -- \
  'packages/frontend/src/components/**/Mk*.vue' \
  | sed 's/\.vue$/.stories.impl.ts/' \
  | xargs -I {} sh -c 'test -f {} || echo "missing: {}"'
```

### 9. 图标 (Minor)

- 图标使用 Tabler icons class (`<i class="ti ti-info-circle">` 等)。
- 原则上不使用内联 SVG 或其他图标集 (与既有模式保持一致)。

### 10. CHANGELOG 条目 (Minor)

若变更有用户影响，确认 `CHANGELOG.md` 的 `## Unreleased` → `### Client` 中是否追加了 1 行。

```
- Enhance: 改善 <component> 的 <行为>
- Fix: 修复 <component> 的 <缺陷>
```

纯粹的内部重构则不需要。

## 输出格式

按优先级以下列格式输出。

```
## 🔴 Critical
- packages/frontend/src/components/MkFoo.vue:1
  SPDX 头采用了 TS 形式而非 HTML 注释形式。
  请用 `<!-- ... -->` 重写。

## 🟡 Major
- ...

## 🔵 Minor
- ...
```

不提及没有问题的检查项。全部项目通过则简短返回 `✅ 审查观点上无可指出之处`。

## 参考

- [.claude/skills/working-on-frontend/references/tasks/adding-mk-component.md](../skills/working-on-frontend/references/tasks/adding-mk-component.md) — 实现侧的步骤
- [.claude/skills/working-on-frontend/references/tasks/adding-i18n-key.md](../skills/working-on-frontend/references/tasks/adding-i18n-key.md) — i18n 键添加的规则
- [.claude/skills/working-on-frontend/references/knowledge/component-conventions.md](../skills/working-on-frontend/references/knowledge/component-conventions.md) — SFC 规约、a11y 检查清单
- [.claude/skills/working-on-frontend/references/knowledge/scss-modules.md](../skills/working-on-frontend/references/knowledge/scss-modules.md) — SCSS Modules / CSS 变量
- [os.ts](../../packages/frontend/src/os.ts) — UI 操作 API
- [MkButton.vue](../../packages/frontend/src/components/MkButton.vue)
- [MkInput.vue](../../packages/frontend/src/components/MkInput.vue) — generic SFC 示例
- [MkButton.stories.impl.ts](../../packages/frontend/src/components/MkButton.stories.impl.ts) — Storybook 模板
- [AGENTS.md](../../AGENTS.md) — SPDX / locales 编辑限制 / CHANGELOG 书写格式等最低限规则 (与 Codex / Copilot 共通)
