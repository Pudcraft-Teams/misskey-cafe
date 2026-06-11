# i18n 区分使用 / Crowdin 安全策 / 排错

把 `i18n.ts` / `i18n.tsx` 的区分使用、与 Crowdin 的同步机制、高频的类型错误 / 运行时警告的处理汇总在一处的页面。

## 目录

- [基础: ts 与 tsx 的区分使用](#基础-ts-与-tsx-的区分使用)
- [实现模式](#实现模式)
- [Crowdin 安全策 (既有键的重命名 / 恢复)](#crowdin-安全策-既有键的重命名--恢复)
- [排错](#排错)
- [约束与补充](#约束与补充)

## 基础: ts 与 tsx 的区分使用

文案 **必须** 经由 [i18n.ts](../../../../../packages/frontend/src/i18n.ts) 引用。参数的有无会 **改变所用变量名本身**。用错时,用 `i18n.tsx` 调用无参数键会报类型错误;但用 `i18n.ts` 引用有参数键不会报类型错误,而是 `{name}` 等未展开地显示在画面上 (参见后文排错)。

- 无参数 → `i18n.ts.<key>` (属性访问)

  ```ts
  os.toast(i18n.ts.removed);
  ```

- 有参数 → `i18n.tsx.<key>(...)` (函数调用)

  ```ts
  os.alert({ type: 'info', text: i18n.tsx.unfollowConfirm({ name: user.username }) });
  ```

  YAML 一侧含有 `{name}` 形式占位符的键,只能从 **`i18n.tsx`** 调用。误写成 `i18n.ts.unfollowConfirm` 时,值会是格式化前的函数并原样显示。

- **复用既有键优先**。即便看起来需要新增键,也先 grep `locales/ja-JP.yml`,确认是否有像 `deleteAreYouSure({ x })` 这样的通用键 (`x` 占位符) 可以转用。新增键见 [tasks/adding-i18n-key.md](../tasks/adding-i18n-key.md)。其他语言文件是 Crowdin 的自动分发目标,绝不可手动改动

```vue
<script lang="ts" setup>
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';

const props = defineProps<{ name: string }>();

async function onDelete() {
	const { canceled } = await os.confirm({
		type: 'warning',
		text: i18n.tsx.driveFileDeleteConfirm({ name: props.name }), // 有参数
	});
	if (canceled) return;
	os.toast(i18n.ts.removed); // 无参数
}
</script>
```

| 用途 | 写法 |
|---|---|
| 简单字符串 | `i18n.ts.save` |
| 嵌套 | `i18n.ts._settings.general` |
| 带参数 (1 个) | `i18n.tsx.unfollowConfirm({ name })` |
| 带参数 (多个) | `i18n.tsx.monthAndDay({ month, day })` |
| Vue 模板内 | `{{ i18n.ts.save }}` / `{{ i18n.tsx.unfollowConfirm({ name }) }}` |

## 实现模式

### HTML 标签内嵌

常见模式是在 ja-JP.yml 的值里含 `<b>` / `<br>` / `<strong>`,在显示一侧用 v-html 或 `<Mfm>` 渲染。

```yaml
# locales/ja-JP.yml
poweredByMisskeyDescription: "{name}は、オープンソースのプラットフォーム<b>Misskey</b>のサーバーのひとつです。"

# locales/ja-JP.yml (换行 + br)
driveAboutTip: "ドライブでは、過去に...<br>\nノートに添付する際に再利用したり...<br>\n<b>ファイルを削除すると...</b><br>\n..."
```

引用一侧:
```vue
<div v-html="i18n.tsx.poweredByMisskeyDescription({ name: 'Misskey' })" />
```

注意:

- 含 HTML 的键值 **必须用双引号** 包起来 (避免 YAML 解析失败)
- 务必确认经由 `v-html` 不存在 XSS 风险。把用户输入原样传给参数会出事。只用安全的静态字符串,或另行转义过的值

### 响应式引用 + 动态键切换

想随时间流逝等切换翻译键本身时的惯例。用 `computed` 包裹,以方括号记法动态选择翻译键。

出处: [packages/frontend/src/components/MkPoll.vue](../../../../../packages/frontend/src/components/MkPoll.vue) 的 `_poll` 动态键

```ts
const timer = computed(() => i18n.tsx._poll[
  remaining.value >= 86400 ? 'remainingDays' :
  remaining.value >= 3600 ? 'remainingHours' :
  remaining.value >= 60  ? 'remainingMinutes' : 'remainingSeconds'
]({
  s: Math.floor(remaining.value % 60),
  m: Math.floor(remaining.value / 60) % 60,
  h: Math.floor(remaining.value / 3600) % 24,
  d: Math.floor(remaining.value / 86400),
}));
```

对应的 yml (每个键实际使用的占位符可以不同):

```yaml
_poll:
  remainingDays: "終了まであと{d}日{h}時間"      # {d} {h}
  remainingHours: "終了まであと{h}時間{m}分"     # {h} {m}
  remainingMinutes: "終了まであと{m}分{s}秒"     # {m} {s}
  remainingSeconds: "終了まであと{s}秒"          # {s}
```

要点:

- 每个键使用的占位符 **各不相同也没关系**
- **在调用一侧把候选键整体所需的全部参数的 superset 用一个参数对象传入**。各键的内部实现从收到的对象里只取自己需要的

### 作为标识符无效的键名 (方括号记法)

键名以数字开头或为保留字时,无法用点记法访问,要用方括号记法。

出处: [packages/frontend/src/components/MkSignin.totp.vue](../../../../../packages/frontend/src/components/MkSignin.totp.vue)

```vue
<div :class="$style.totpDescription">{{ i18n.ts['2fa'] }}</div>
```

新增键时 **只要遵守 lowerCamelCase 就无需如此**。

### 嵌套 + 参数复合

```vue
{{ i18n.tsx._uploader.maxFileSizeIsX({ x: maxSize + 'MB' }) }}
{{ i18n.tsx._auth.shareAccess({ name: appName }) }}
```

### 在 `tsx` 的参数里嵌入 `ts`

可以把另一个已翻译的字符串作为参数传入。

出处: [packages/frontend/src/components/MkSignupDialog.rules.vue](../../../../../packages/frontend/src/components/MkSignupDialog.rules.vue)

```ts
i18n.tsx.iHaveReadXCarefullyAndAgree({ x: i18n.ts.serverRules })
```

### 用三元运算符切换 ts / tsx

按参数有无分别输出。

```vue
{{ name ? i18n.tsx._auth.shareAccess({ name }) : i18n.ts._auth.shareAccessAsk }}
```

## Crowdin 安全策 (既有键的重命名 / 恢复)

ja-JP.yml 以外的 locales/*.yml 是 **Crowdin 的自动分发目标**。手动编辑或对 source 一侧的轻率操作会丢失其他语言的翻译资产。为了持续合并上游,必须保持这条规则不变。本 fork 的翻译改进应提交到上游的 Crowdin 项目。

### 同步机制

[crowdin.yml](../../../../../crowdin.yml):
```yaml
files:
  - source: /locales/ja-JP.yml
    translation: /locales/%locale%.yml
    update_option: update_as_unapproved
```

- `ja-JP.yml` = **source**。只有它是翻译来源
- `en-US.yml` / `fr-FR.yml` 等 `ja-JP.yml` 以外的所有 locale = **translation**。由 Crowdin 通过自动 PR 更新
- 已翻译键的 **source 字符串发生变化时**,因 `update_as_unapproved` 设置,翻译会退回 "unapproved" 状态 (= 再次要求 review)
- **键名本身改变** 时 Crowdin 会当成另一个键,旧键的翻译被孤立 → 在同步时被删除

依据: [locales/README.md](../../../../../locales/README.md) "DO NOT edit locale files except `ja-JP.yml`."

### 想重命名既有键时 (3 阶段)

把简单的「删除旧键 → 新增新键」放进 1 个 PR,会丢失所有语言的旧键翻译。要像下面这样拆分。

#### Step 1: 新增新键 (PR A)

保留旧键,把新键 (意义等价的日语) 添加到 ja-JP.yml。

```yaml
# 旧键 (仍保留)
_settings:
  theme: "テーマ"
# 新键 (新增)
  appearance: "外観"
```

引用处也迁移到新键 (frontend 全量 grep + 替换)。

#### Step 2: 合并 → 等待 Crowdin 翻译到来

通过 Crowdin 的自动 PR,其他语言也会加入 `appearance` 并填入翻译。因 `update_option: update_as_unapproved`,首次为 unapproved 状态。在项目管理员 approve 之前不会上生产 (会以日语作为 fallback 显示)。

通常需要数天到数周。着急时请求 Crowdin 项目管理员处理。

#### Step 3: 删除旧键 (PR B)

新键翻译充分填满后,在另一个 PR 中把旧键 (`theme`) 从 ja-JP.yml 删除。下一次 Crowdin 同步时其他语言也会随之消失。

### 如果不慎做了简单重命名

```bash
# 用 git diff 务必确认其他 yml 没有被改动 (输出为空即 OK; fork 只维护 zh-CN.yml,ja-JP.yml 也须零差异)
git diff --name-only develop -- 'locales/*.yml' | grep -v '^locales/zh-CN\.yml$'
```

把 `grep -v 'ja-JP.yml'` 作用在 diff 正文上的写法,即便只改了 ja-JP.yml,新增行 (`+`) 也会被放行而必然非空,因此不要用。**只对文件名作用 grep**。

- **若其他语言 yml 被改动了,立即 revert**:
  ```bash
  git restore --source=develop -- locales/en-US.yml locales/<lang>.yml
  ```

- 如果只在 ja-JP.yml 上做了删除旧键 + 新增新键,就拆分 PR,或重组为上面的 3 阶段。**合并前还来得及**

### 如果不慎改动了 ja-JP.yml 以外的文件

```bash
# 最安全的恢复: 还原成 develop 一侧的内容
git restore --source=develop -- locales/en-US.yml
# 或者只把特定 path 撤出暂存区并连同工作树一起还原
git checkout HEAD -- locales/zh-CN.yml
```

在做成 PR 之前可以反复重来。**一旦合并,与 Crowdin 一侧的一致性就会被破坏,需要手动恢复**,因此在 PR review 阶段务必确认 `locales/*.yml` (ja-JP 以外) 的 diff 为零。

### CHANGELOG 记载的判定

| 变更内容 | CHANGELOG 记载 |
|---|---|
| 随新增画面一起新增键 | 需要 (`### Client` 写 Feat/Enhance) |
| 既有文案的改善 (错别字以外) | 需要 (`### Client` 写 Enhance) |
| 错别字 / 细微措辞修正 | 不需要 |
| 键的重命名 (UI 无变化) | 不需要 |
| 键删除 (从画面消失) | 需要 (`### Client` 写 Feat / 功能删除) |

写法参考 [shipping-misskey-change 技能](../../../shipping-misskey-change/SKILL.md)。

## 排错

i18n 相关容易踩的失败及其处理。整理成可以用错误字符串 grep 定位的形式。

### 类型错误: `Property '<key>' does not exist on type 'Locale'`

**症状**:
```
packages/frontend/src/components/MkXxx.vue
> i18n.ts.newKey
  Property 'newKey' does not exist on type 'Locale'.
```

**原因**: 已向 ja-JP.yml 添加了键,但没有重新生成 `packages/i18n` 的类型 (`autogen/locale.ts`)。

**处理**:

- 若 `pnpm dev` 正在运行,`packages/i18n` 的 watch (`nodemon ... tsx ./build.ts --watch`) 会自动重新生成,因此保存 yml 后重新跑一遍 typecheck
- 若只想手动重新生成一次: `pnpm --filter i18n generate` (实体是 `tsx scripts/generateLocaleInterface.ts`)
- 检出途径: `pnpm --filter frontend lint`

实现依据: [packages/i18n/scripts/generateLocaleInterface.ts](../../../../../packages/i18n/scripts/generateLocaleInterface.ts) (提取参数的正则 `/\{(\w+)\}/g`)。

### 类型错误: ts/tsx 用混了

**症状 A** (用 tsx 调用无参数键):
```
i18n.tsx.save({...})
> Property 'save' does not exist on type 'Tsx<Locale>'.
```

**症状 B** (用 ts 引用带参数键,函数化原样使用):
```vue
{{ i18n.ts.unfollowConfirm }}
<!-- 画面に "{name}のフォローを解除しますか？" が {name} 未置換のまま出る -->
```

**原因**: `Tsx<T>` 类型 ([packages/frontend-shared/js/i18n.ts](../../../../../packages/frontend-shared/js/i18n.ts)) 只把持有 `ParameterizedString<P>` 的键作为函数公开。

**处理**: 参数有无由 yml 的 `{...}` 记法决定。

| yml 的值 | ts | tsx |
|---|---|---|
| `"保存"` | `i18n.ts.save` ✅ | (键不存在) ❌ |
| `"{name}のフォローを解除しますか？"` | `i18n.ts.unfollowConfirm` → 仍是 `{name}` 未替换的字符串 ❌ | `i18n.tsx.unfollowConfirm({ name })` ✅ |

### 运行时警告: `Unexpected locale key: <key>`

**症状**: 出现在开发模式的控制台。

**原因**: dev mode 的 Proxy 检测到访问了 ja-JP.yml 中不存在的键 ([packages/frontend-shared/js/i18n.ts](../../../../../packages/frontend-shared/js/i18n.ts) 的 dev 用 Proxy)。

**处理**: 向 ja-JP.yml 添加该键,或修正引用一侧的拼写错误。

### 运行时警告: `Missing locale parameters: <param> at <key>`

**症状**: dev mode 控制台。

**原因**:

- 相对于 yml 一侧的 `{name}`,调用一侧像 `{ user: ... }` 这样 **键名不同**
- 或者参数对象里没有包含该值

实现依据: [packages/frontend-shared/js/i18n.ts](../../../../../packages/frontend-shared/js/i18n.ts) (`Object.hasOwn(arg, expressions[i])` 检查)。

**处理**: 让 yml 与调用一侧的参数名一致。改了 yml 一侧的键名后,用 grep 把调用一侧 (整个 frontend) 对齐。

### YAML 解析失败

**症状**: 执行 `pnpm --filter i18n generate` 时出现 `YAMLException: ...`,或 `pnpm dev` 的 watch 日志报错。

**原因**: 值含有 YAML 特殊字符 (`<` `>` `:` `'` `&` `*` `|` `>` `#`) 却 **没有加引号**。

**处理**: 用 `"..."` (双引号) 把整个值包起来。

```yaml
# OK: 含 HTML 标签
poweredByMisskeyDescription: "{name}は、...プラットフォーム<b>Misskey</b>のサーバーのひとつです。"

# OK: 含冒号 / 单引号 / 方括号的 URL 说明
objectStorageBaseUrlDesc: "参照に使用するURL。CDNやProxyを使用している場合はそのURL、S3: 'https://<bucket>.s3.amazonaws.com'、GCS等: 'https://storage.googleapis.com/<bucket>'。"

# OK: 把换行作为字面量嵌入
driveAboutTip: "ドライブでは、過去にアップロードしたファイルの...<br>\nノートに添付する際に..."
```

YAML 的 block scalar (`|` / `>`) 也能用,但 HTML 标签 + 占位符混用时,**双引号 + `\n` 转义** 更稳定。

### 键名冲突: 不慎覆盖了 `_lang_`

**症状**: 想把各语言文件开头的 `_lang_` (例: ja-JP 是 `"日本語"`) 挪作他用而覆盖。

**原因**: `_lang_` 被保留给 **语言自身的表记** ([packages/i18n/src/autogen/locale.ts](../../../../../packages/i18n/src/autogen/locale.ts) 的首个键)。

**处理**: 新增键改用别的名字。

### frontend 改了 diff 也不变

**症状**: 改了 ja-JP.yml 但画面没反映。

**原因**:

- 没启动 `pnpm dev`,只启动了 `pnpm --filter frontend watch`,导致 `packages/i18n` 的 watch 没在跑
- 或者分发给 frontend 的生成物 (`built/_frontend_dist_/locales/*.json`) 在浏览器一侧被缓存了

**处理**: 启动根目录的 `pnpm dev` (frontend + backend + i18n watch 全部启动)。还是不反映就清浏览器缓存,或手动执行 `pnpm --filter i18n build`。

## 约束与补充

### 不支持 ICU MessageFormat

[packages/i18n/scripts/generateLocaleInterface.ts](../../../../../packages/i18n/scripts/generateLocaleInterface.ts) 的正则是 `/\{(\w+)\}/g`。也就是说只接受 **`{paramName}` 形式的简单替换**。

```yaml
# NG: ICU plural —— 只会原样作为字符串显示在画面上
items: "{count, plural, one {1個} other {{count}個}}"

# NG: ICU select
gender: "{gender, select, male {彼} female {彼女} other {その人}}"
```

替代策略:

#### 1. 按件数拆分成不同键

```yaml
# OK
withNFiles: "{n}個のファイル"
withOneFile: "1個のファイル"
```

```ts
const text = files.length === 1
  ? i18n.ts.withOneFile
  : i18n.tsx.withNFiles({ n: files.length });
```

#### 2. 切换模式 (动态键)

像时间流逝这样连续的分支,采用 MkPoll 的模式 ([上文「响应式引用」](#响应式引用--动态键切换))。

### 保留键 `_lang_`

放在各 yml 文件的 **顶层开头**,持有该语言自身的表记名。

```yaml
# locales/ja-JP.yml (顶层开头)
_lang_: "日本語"
```

被 UI 的语言切换下拉等引用。**不用于新增键**。

### Storybook 中的行为

Storybook 环境的打包器不同,所以不直接使用生产的 i18n 包。取而代之,[packages/frontend/.storybook/preload-locale.ts](../../../../../packages/frontend/.storybook/preload-locale.ts) 在构建时 **只把 ja-JP 的 locale 转储为 JSON 并生成同居的 `locale.ts`**。

也就是说在 Storybook 中:

- **只能看到 ja-JP 的字符串** (无法验证其他语言)
- 即便向 ja-JP.yml 加完键后立刻启动 Storybook,只要在 `preload-locale.ts` 执行之前就不会反映。需重启 Storybook,或先 build 一次 `packages/i18n`
- 从 stories 的调用方式照常: `i18n.tsx._dialog.charactersBelow({ current: 0, min: 2 })`

### backend 基本不直接引用 i18n

i18n 只在 frontend (以及一部分 SSR 的错误页面) 中使用。原则上没有从 `packages/backend` 下 `import { i18n }` 的模式,API 错误文案走另一条路 (`ApiError` 未 i18n 化的 message + 在 frontend 一侧翻译)。

### 换行的处理

在双引号值内,`\n` 会成为实际换行。用 block scalar (`|`) 也可以,但 HTML 标签或占位符混用时不好处理。惯例是双引号 + `\n`。

需要在 Vue 一侧显示时套用 `white-space: pre-wrap` 等。
