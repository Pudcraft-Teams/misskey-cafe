# `.claude/skills/` — 项目专属的自定义技能

为了让 Claude 顺畅执行 Misskey 专属的重复任务,以 `.claude/skills/<name>/SKILL.md` 形式放置 **自定义技能**。

frontmatter (`name` + `description`) 是 Claude **判断是否自动调用技能** 的唯一线索。`description` 要把用途写得具体且全面,用 pushy 的触发语 (例: "Use whenever ...", "Must be consulted before any ...") 提高被发现的概率。

已实现技能的一览不在本文件维护 (会腐烂)。各子目录的 `SKILL.md` 的 frontmatter 自我说明即可。

## 组织方针

遵循 Anthropic 官方的 [Agent Skills 最佳实践](https://platform.claude.com/docs/ja/agents-and-tools/agent-skills/best-practices),采用以下结构:

- **SKILL.md 本体 500 行以内** (理想是 30-80 行的索引)
- 详细内容拆分到 `references/tasks/` (步骤) 和 `references/knowledge/` (规约、背景知识) (progressive disclosure)
- 链接原则上 **只做到 references 的一级链接** (例外: 指向其他 skill / agent 的导引可以)
- 文件系统上的 references 在被读取之前是零 context 成本

如果包含 ECC (everything-claude-code) 来源的 MIT 技能,要在文件开头的 SPDX 头 + [.claude/THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md) §1 中记载出处。

## 新增技能时

- 在 `.claude/skills/<name>/SKILL.md` 中写 YAML frontmatter (`name` + `description`) 和正文 Markdown
- description 用 **第三人称的 "Use when ..." 形式**,覆盖主要关键词。加入 pushy 的触发语 ("Must be consulted before ...")
- 不加 `disable-model-invocation: true` (因为要让它 auto-invoke)
- 指向主要参照文件的链接,用各 markdown 文件出发的相对路径 (`../../../../packages/backend/...` 这种形式)。绝对路径会依赖 contributor 的 home 目录,所以不用
- 需要拆分详细内容时,遵循 `references/tasks/` (步骤) / `references/knowledge/` (知识) 的二分法
- 推荐通过 `/skill-creator` (官方的 skill-creator 技能) 的引导来创建技能

## 相关

- 由于设计上靠各技能的 description 自动索引,本文件和 `AGENTS.md` 都不持有已实现技能的手写索引 (一览表) (手写索引会腐烂,因此把 frontmatter 的 description 作为唯一索引)
- 技能本身的健全性检查可以用 [/harness-audit](../commands/harness-audit.md) 打分
