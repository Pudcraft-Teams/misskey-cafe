# 新增 / 修改 i18n 键

新增、变更 UI 文案时的步骤。**唯一可以手动编辑的是 `locales/ja-JP.yml`**。

## 大前提 (绝对禁止)

- **禁止编辑 `locales/<lang>.yml` (ja-JP.yml 以外)**。它们是 Crowdin 的自动分发目标,手动编辑会在下一次同步时被覆盖丢失 ([locales/README.md](../../../../../locales/README.md), [crowdin.yml](../../../../../crowdin.yml))
- 不要把字符串字面量直写进 SFC (如 `<span>こんにちは</span>`)。必须经由 `i18n.ts.<key>`
- 既有键的破坏性重命名会丢失 Crowdin 翻译资产。要拆成 **新增 → 迁移 → 删除旧键** 三个阶段。详细步骤与误编辑的恢复见 [knowledge/i18n-usage.md §Crowdin 安全策](../knowledge/i18n-usage.md)

## 步骤 1: 向 ja-JP.yml 添加键

编辑 [locales/ja-JP.yml](../../../../../locales/ja-JP.yml)。保持 YAML 的层级结构,放到相关的 section 中。

**fork 语言规约:** 本 fork 新增键的 **值直接写简体中文**(ja-JP.yml 是全语言的回退基底,中文值会对所有语言设置的用户生效;详见 [AGENTS.md](../../../../../AGENTS.md) 语言规约)。上游既有键的日文值保持原样,不做翻译。下面示例中的日文仅为上游历史写法示意:

```yaml
# 顶层简单键
save: "保存"

# 嵌套分类 (下划线前缀表示内部分类)
_settings:
  general: "全般"
  appearance: "外観"

# 带参数 (简单的占位符替换)
# 只接受 {name} 形式。不支持 ICU MessageFormat (plural/select)
greeting: "こんにちは、{name}さん"
```

### 命名规范

- 简单键: lowerCamelCase (例: `saveChanges`, `confirmDelete`)
- 分类: 下划线前缀 (例: `_settings`, `_abuseUserReport`)
- 在既有 section 内追加时,要 **对齐周围既有的排布与语义分组** (例如 `_settings` 是按功能块顺序排列,而非按字母顺序)。整个新 section 追加到末尾是可以的
- **含 HTML 标签 (`<b>` `<br>` `<strong>` 等) 或 `:` `'` `&` 的值必须用双引号包起来** (不加引号会导致 YAML 解析失败)

**详见:** ICU 不支持时的替代策略、保留键 `_lang_`、Storybook 中的行为 → [knowledge/i18n-usage.md §约束与补充](../knowledge/i18n-usage.md)

## 步骤 2: 类型定义的自动重新生成

`packages/i18n/build.ts` 会解析 `ja-JP.yml`,把 TypeScript 接口输出到 [packages/i18n/src/autogen/locale.ts](../../../../../packages/i18n/src/autogen/locale.ts)。

### 自动 (推荐)

如果 `pnpm dev` 正在运行,`packages/i18n` 的 watch 脚本 (`nodemon ... tsx ./build.ts --watch`) 会检测到 yml 变更并自动重新生成。

### 手动

```bash
pnpm --filter i18n generate
```

实体是 `tsx scripts/generateLocaleInterface.ts`。

### 失败模式

如果不执行它就在 frontend 一侧引用 `i18n.ts.<newKey>`,由于它尚未加入 `Locale` 接口,typecheck 会报 `Property '<newKey>' does not exist on type 'Locale'` (会被 `pnpm --filter frontend lint` 发现)。类型错误、运行时警告 (`Unexpected locale key`, `Missing locale parameters`) 及处理方式 → [knowledge/i18n-usage.md §排错](../knowledge/i18n-usage.md)。

## 步骤 3: 在 frontend 中引用

```ts
import { i18n } from '@/i18n.js';
```

| 用途 | 写法 |
|---|---|
| 简单字符串 | `i18n.ts.save` |
| 嵌套 | `i18n.ts._settings.general` |
| 带参数 | `i18n.tsx.greeting({ name: userName })` |
| Vue 模板内 | `{{ i18n.ts.save }}` / `{{ i18n.tsx.greeting({ name }) }}` |

`i18n.ts` 是带类型的字符串,`i18n.tsx` 是嵌入 `{name}` 占位符的函数 (只对带参数的键存在。不是 ICU MessageFormat,而是简单的字符串替换)。

**详见:** HTML 标签内嵌、用 computed 做响应式引用、动态键切换、方括号记法 (`i18n.ts['2fa']`) 等实现模式 → [knowledge/i18n-usage.md §实现模式](../knowledge/i18n-usage.md)

## 步骤 4: 验证

```bash
# 重新生成 i18n 类型 → typecheck + eslint (lint 不会调用 generate,所以顺序是必须的)
pnpm --filter i18n generate
pnpm --filter i18n lint

# 在 frontend 对新键引用处做类型检查
pnpm --filter frontend lint

# 确认其他语言 yml 没有产生 diff (输出为空即 OK)
git diff --name-only develop -- 'locales/*.yml' | grep -v '^locales/ja-JP\.yml$'
```

**注意:** 把 `grep -v 'ja-JP.yml'` 作用在 **diff 正文** 上时,即便只改了 ja-JP.yml,`+新增行` 也会被放行而必然非空。正确做法是用 `--name-only` 只取文件名后再用完全匹配排除。

如果伴随用户可见的 UI 变更,用 [shipping-misskey-change 技能](../../../shipping-misskey-change/SKILL.md) 判定 CHANGELOG 条目。

## 示例: 添加「要删除这条 note 吗?」确认对话框

1. `locales/ja-JP.yml`:
   ```yaml
   _notes:
     deleteConfirm: "このノートを削除しますか？"
   ```
2. `pnpm --filter i18n generate` (或 `pnpm dev` 处于 watch 中)
3. SFC:
   ```vue
   <script setup lang="ts">
   import { i18n } from '@/i18n.js';
   import * as os from '@/os.js';

   async function onDelete() {
     const { canceled } = await os.confirm({
       type: 'warning',
       text: i18n.ts._notes.deleteConfirm,
     });
     if (canceled) return;
     // 删除处理
   }
   </script>
   ```

## 参考文件

- [locales/README.md (★ 编辑策略依据)](../../../../../locales/README.md)
- [locales/ja-JP.yml](../../../../../locales/ja-JP.yml)
- [packages/i18n/build.ts](../../../../../packages/i18n/build.ts)
- [packages/i18n/src/autogen/locale.ts (生成物)](../../../../../packages/i18n/src/autogen/locale.ts)
- [packages/frontend/src/i18n.ts](../../../../../packages/frontend/src/i18n.ts)
