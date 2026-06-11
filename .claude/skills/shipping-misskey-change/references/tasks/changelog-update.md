# 在 CHANGELOG.md 的 Unreleased 小节追加 1 行

对用户有影响的变更 (新增功能、修复、改善) 要在 `CHANGELOG.md` 开头的 `## Unreleased` 小节追加 1 行。重构等内部变更不需要。

## 小节结构

`## Unreleased` 下方准备了 **3 个子小节**:

- `### General` — 通用 / 横向的变更
- `### Client` — `packages/frontend` 相关
- `### Server` — `packages/backend` 相关

## 条目格式

在对应子小节按 `- <Prefix>: <概要>` 的格式追加。Prefix 首字母大写。**概要正文使用简体中文**（fork 语言规约，见 [AGENTS.md](../../../../../AGENTS.md)）；从上游合并进来的既有日文条目保持原样，不做翻译。

```text
- Enhance: 改善帖子详情页公开范围的显示
- Fix: 修复通知延迟约 10 秒的问题
- Feat: 新增某某功能
```

| Prefix | 用途 |
|---|---|
| `Feat:` | 新增功能 |
| `Enhance:` | 改善既有功能 |
| `Fix:` | 修复 bug |
| `Note:` | 并非功能变更但想告知用户的事项 (设置被重置、新增 config 项、不兼容的行为变更等) |

`Note:` 不是 Feat / Enhance / Fix 那样的变更本身,而是用来传达「更新后用户需要知道的注意事项」(例: `- Note: 更新后，声音相关设置将被重置`)。在对应子小节内以 `- Note: ...` 的形式放置。某些 release 也会在 `## <version>` 正下方设置 `### Note` 专用子小节 (既有历史中两种形式都有)。新增时按邻近既有条目的写法对齐。

## 不可触碰的范围

- 不修改 `## Unreleased` **以外** 的小节 (过往 release)
- 保留 `## Unreleased` 的标题和 3 个空子小节骨架本身 (这是 release 脚本期望的结构)

## 作业步骤 (手写时)

1. 打开 `CHANGELOG.md`,找到 `## Unreleased` 小节
2. 确认目标子小节 (`### General` / `### Client` / `### Server`) 的状态
   - **空 (仅占位符)**: 标题正下方只有一个 `-` 单独行 → 用 `- Feat: ...` 等 **替换** 它
   - **已有条目**: 已有 1 行或多行 `- Enhance: ...` / `- Fix: ...` 等 → 在既有条目组的 **末尾** **追加**
3. 不要调换顺序 (为了便于差分审查)
4. 用 `git diff CHANGELOG.md` 确认只新增了 1 行

## 例

| 参数示意 | 结果 |
|---|---|
| server, `Fix: 修复通知延迟的问题` | 在 `### Server` 末尾追加 `- Fix: 修复通知延迟的问题` |
| client, `Enhance: 改善帖子的显示` | 在 `### Client` 末尾追加 `- Enhance: 改善帖子的显示` |
| general, `Feat: 新增某某功能` | 把 `### General` 的占位符 `-` 替换为 `- Feat: 新增某某功能` |

## 与提交信息格式的区别

CHANGELOG 和提交信息 **格式不同**:

- CHANGELOG: `- Enhance: 改善帖子的显示` (首字母大写的英文 Prefix + 冒号 + 简体中文正文)
- 提交信息: `enhance(frontend): 改善帖子的显示` (小写 prefix + scope + 冒号的形式沿用 [CONTRIBUTING.md](../../../../../CONTRIBUTING.md)，正文按 fork 语言规约默认简体中文)

在同一个 PR 里同时更新两者时不要混淆。
