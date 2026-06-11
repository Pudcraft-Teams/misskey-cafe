# 向 `endpoint-list.ts` 注册

新增 API endpoint 时的 **最大陷阱**。由于 endpoint 不会被 glob 自动收集，忘记向这里加 1 行就会 404。

## 为何必要

[`packages/backend/src/server/api/EndpointsModule.ts`](../../../../../packages/backend/src/server/api/EndpointsModule.ts) 用 `Object.entries()` 遍历 [`endpoint-list.ts`](../../../../../packages/backend/src/server/api/endpoint-list.ts) 的全部 export，生成 NestJS provider (`provide: 'ep:<path>'`)。**这个列表是 API 路由的唯一真实来源**，不在其中的会被当作不存在处理。

## 注册方法

向 [endpoint-list.ts](../../../../../packages/backend/src/server/api/endpoint-list.ts) 的 **同一 category 内** 增加 1 行:

```ts
export * as '<category>/<name>' from './endpoints/<category>/<name>.js';
```

`<category>` 是功能领域 (`notes`, `users`, `admin/announcements` 等)，`<name>` 是 endpoint 名 (`create`, `show`, `delete` 等)。两者都是 kebab-case / 斜杠分隔，与文件系统的路径结构一致。

例如要添加 `endpoints/notes/create.ts`:

```ts
export * as 'notes/create' from './endpoints/notes/create.js';
```

## 排列顺序

**排列顺序并不严格**。即使在同一目录 (例如 `admin/queue/*`) 中，很多地方也不是按字母序而是按添加的先后顺序排列。

- **新增**: 加到同一 category 内的末尾即可
- **靠近现有项**: 也可以放在同一 category 内相关 endpoint 的附近
- **不要过度整理**: 不需要把现有排列全部重新 sort 的 PR (只会增加 review 成本)

## 注册确认

添加文件后，用 grep 确认该行存在:

```bash
grep -F "'<category>/<name>'" packages/backend/src/server/api/endpoint-list.ts
```

没命中就是注册遗漏。

## 现有示例 (用于发现注册遗漏的 grep 示例)

`endpoint-list.ts` 开头的注释中写明了「这个列表是 API 路由的唯一真实来源」。新开发时，先打开这个文件把握按 category 划分的结构，再写新的 endpoint 文件会更高效。

## 相关

- 新增 endpoint 的全部步骤 → [tasks/adding-api-endpoint.md](../tasks/adding-api-endpoint.md)
- NestJS DI / module 结构 → [nestjs-di.md](nestjs-di.md)
