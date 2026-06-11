# misskey-cafe – Claude Code 指南

规约正本是 [AGENTS.md](AGENTS.md)（与 Codex / Copilot 共享的单一信息源）。本文件是 Claude Code 的薄包装层，通过 `@AGENTS.md` 语法在会话开始时把正本规约展开进上下文。

Claude Code 专用的辅助内容（skills / agents / slash commands / docs）已提交在 `.claude/` 下。个人本地配置放在 `.claude/settings.local.json`，MCP 凭据放在 `.claude/.credentials.json`（两者均已 `.gitignore`）。

@AGENTS.md
