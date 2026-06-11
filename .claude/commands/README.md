# `.claude/commands/` — 项目专属的斜杠命令

为了能用 `/command-name` 调用 Misskey 开发中反复使用的工作流,以 `.claude/commands/<name>.md` 形式放置。

已实现命令的一览不在本文件维护 (会腐烂)。各 `<name>.md` 的 frontmatter (`description`) 自我说明即可。

当前保留的只有 ECC ([everything-claude-code](https://github.com/affaan-m/everything-claude-code)) 来源的 MIT 许可命令,Misskey 专属的斜杠命令已废弃并整合到 `.claude/skills/` 下的技能中。MIT 出处见 [.claude/THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md)。

## 设计方针

- Misskey 专属的工作流原则上整合进 `.claude/skills/` (因为靠 description 自动索引。命令必须由用户 `/name` 键入才会启动)
- 如果已有的 `superpowers` / `pr-review-toolkit` 等插件提供的斜杠命令已经够用,就不新增

## 新增命令时 (仅在用技能实在无法表达时)

- frontmatter 至少指定 `description`。如果取参数就加 `argument-hint`,可能的话也指定 `allowed-tools` (为了最小化 permission prompt)
- 伴随长时间构建 (超过 2 分钟) 的命令不要用内联 `` !`<cmd>` ``,而是在正文中指示调用 `Bash` 工具时的 `timeout`
- 指向主要参照文件的链接,用各命令 markdown 出发的相对路径。绝对路径会依赖 contributor 的 home 目录,所以不用
