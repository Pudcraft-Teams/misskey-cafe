# 路线图

## 本 fork 的策略

misskey-cafe 是 [misskey-dev/misskey](https://github.com/misskey-dev/misskey) 的 fork，基本策略是：

1. **跟随上游**: 持续合并上游 `develop` 分支，保持与上游的最小偏移，使合并成本可控
2. **最小化定制**: fork 自身的改动尽量保持小而内聚；对上游也有价值的改动优先考虑向上游提 PR，而不是留在 fork 里
3. **fork 专属功能**: 仅保留与本实例运营相关、不适合进上游的定制

fork 自身的具体功能计划通过本仓库的 [Issues](https://github.com/Pudcraft-Teams/misskey-cafe/issues) 与 [Discussions](https://github.com/Pudcraft-Teams/misskey-cafe/discussions) 管理。

## 上游路线图

Misskey 本体的开发路线见上游 [ROADMAP.md](https://github.com/misskey-dev/misskey/blob/develop/ROADMAP.md)。上游当前处于「提升可维护性」阶段，后续阶段（功能完善、可扩展性）的进展会随上游合并自然进入本 fork。
