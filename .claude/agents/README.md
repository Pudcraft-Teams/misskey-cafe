# `.claude/agents/` — 项目专属的子代理

把专注于 Misskey 特定领域的审查 / 调查代理以 `.claude/agents/<name>.md` 形式放置。

frontmatter (`name` + `description` + `tools`) 是 Claude **判断是否自动调用代理** 的唯一线索。`description` 要 **聚焦于影响启动判断的领域、路径、文件类型、专属检查并简洁** 地写 (动词 + 对象 + 触发条件)。不要把正文 checklist 项目全部罗列出来,而是选取能与其他 reviewer 区分开的高信号词。

已实现代理的一览不在本文件维护 (会腐烂)。各 `<name>.md` 的 frontmatter 自我说明即可。

## 与其他审查手段的分工

为了避免审查面铺得太广,把角色分开:

- **这个 `.claude/agents/` 里的 2 个**: backend endpoint / Vue SFC 的 **Misskey 专属、机械化检查** (endpoint-list 漏注册、misskey-js 漏再生成、限定 ja-JP.yml、SPDX 形式、Storybook 配套 等)。仅限于值得在独立 context 中机械扫描差分的领域
- **`pr-review-toolkit` 插件 (code-reviewer / silent-failure-hunter 等)**: 与语言无关的通用代码质量、bug、设计审查。不看 Misskey 专属规约
- **`working-on-*` skill 的 checklist**: 在 **写代码的过程中** 的自检 (不是专门审查,而是实现指引)

Misskey 专属规约的机械检查归本 agent,通用质量归 pr-review-toolkit,实现中的指引归 skill,各司其职。

## 组织方针

- `tools` 收紧为 **无编辑权限** (不交出 Edit/Write),设计为从与 PR baseline (`git merge-base origin/develop HEAD`) 的差分中自动抽取审查对象
- 差分抽取以 `git merge-base origin/develop HEAD` 为 baseline (为了看整个 PR / 分支)。不要用 `git diff HEAD` 单独命令,因为它 **只能取到未提交的差分,在已提交的 PR 中会变空导致误判**
- `description` 既是调用判断的线索,同时 (即使不被调用) 也会在每次启动 Task 工具时常驻加载。**聚焦于其他地方无法替代的高信号触发语并简洁** 地写 (与通用 reviewer 重叠的词或冗长罗列只会成为 context-budget 上的 overhead,无助于发现性)。健全性可以用 [/harness-audit](../commands/harness-audit.md) / [context-budget skill](../skills/context-budget/SKILL.md) 确认
- 规约的 **正本在 `.claude/skills/*/references/` 一侧**。agent 的 checklist 是它的 **派生副本** (让 subagent 即使不读 skill 也能自洽运行)。改规约时先改 references 再让 agent 跟进 ── 两者不一致即同步漏掉,以 references 为准

## 新增代理时

- 在 `.claude/agents/<name>.md` 中写 YAML frontmatter (`name` / `description` / `tools`) 和正文 Markdown
- `description` 会被用于调用判断,所以要列出目标领域、主要检查项、触发条件。但由于常驻加载,要 **聚焦高信号词并简洁** (参见组织方针的对应项)
- 如果是专门审查,把 `tools: Read, Grep, Glob, Bash` 收紧 (不交出 Edit/Write)。**注意 `Bash` 是能执行任意 shell 命令的强权限**: 在审查用途下,**仅限使用 `git diff` / `git ls-files` / `grep` / `sed` 等读取类命令**。涉及写入、删除、网络发送的操作不要写进正文的示例、指示中 (代理正文就是护栏)
- 指向主要参照文件的链接,用各代理 markdown 出发的相对路径 (`../../packages/backend/...` 这种形式)。绝对路径会依赖 contributor 的 home 目录,所以不用
