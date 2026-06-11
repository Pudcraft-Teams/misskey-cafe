# 重新生成 misskey-js 的自动生成类型

修改 backend 的 API endpoint 或 schema (`meta` / `paramDef` / `res`) 之后,用来把 `packages/misskey-js/src/autogen/` 的自动生成类型刷新到最新的步骤。

**忘了做的话 CI 的 `check-misskey-js-autogen` 必定失败**。最常见的错误之一。

## 什么时候执行

加入以下任意一种变更时:

- 新增 endpoint (`packages/backend/src/server/api/endpoints/<category>/<name>.ts`)
- 修改既有 endpoint 的 `meta` (errors / res / kind / requireCredential 等)
- 修改既有 endpoint 的 `paramDef` (输入 schema)
- 修改 packed entity (`packages/backend/src/models/json-schema/*.ts`)

实质上可以认为「只要动了 `packages/backend/src/server/api/` 下面的东西就必须执行」。

## 执行命令

```bash
# 从仓库根目录执行
pnpm build-misskey-js-with-types
```

内部会一并执行以下步骤:

1. backend 构建 (`pnpm --filter backend build`)
2. 生成 OpenAPI spec (`packages/backend/built/api.json`)
3. 生成 misskey-js 用 schema (`packages/misskey-js/generator/api.json`)
4. 重新生成 misskey-js 的 TypeScript 类型 (`packages/misskey-js/src/autogen/{types,entities,endpoint,models,apiClientJSDoc}.ts`)
5. misskey-js 构建 + API extractor

执行时间约 1-3 分钟。出现超时警告时,使用相当于 `--timeout=600000` 的较长设置。

## 执行后的确认

```bash
# 简单确认改了什么
git status --short -- packages/misskey-js/
git diff --stat -- packages/misskey-js/src/autogen/

# 想看具体内容时
git diff -- packages/misskey-js/src/autogen/
```

## 差分的模式

- **无差分** → backend 的变更没有影响 misskey-js 的公开类型 (内部重构等)。无需额外 commit
- **有差分** → **必须把** `packages/misskey-js/src/autogen/` 下的文件 **纳入 commit**

  ```bash
  git add packages/misskey-js/src/autogen/
  ```

  如果 `api.json` 的差分很大,确认 API endpoint 一侧的 `meta` / `paramDef` / `res` 定义是否符合预期。

## 注意

- 这条命令的目的是 **backend 编辑后的确认**。没改 backend 却运行它,视构建缓存而定会变成 no-op
- 执行过程中 `packages/backend/built/` 和 `packages/misskey-js/built/` 等中间产物会被更新,但它们属于 `.gitignore` 对象
- 如果在生成物之外 (`packages/misskey-js/src/` 中 `autogen/` 以外的部分) 出现意料之外的差分,可能混入了本地编辑,先中止并调查原因
- `packages/misskey-js/` 下属于 **MIT 许可的子包**,所以 `autogen/` 文件不加 / 不需要 AGPL 的 SPDX 头

## CI 失败时的消息示例

```
CI: check-misskey-js-autogen
> Please regenerate misskey-js by running:
>   pnpm build-misskey-js-with-types
> and commit the changes under packages/misskey-js/src/autogen/.
```

在本地再执行一次上述命令 → commit 差分 → 重新 push。

## 相关

- 新增 API endpoint 的完整步骤 → [working-on-backend/references/tasks/adding-api-endpoint.md](../../../working-on-backend/references/tasks/adding-api-endpoint.md)
- `meta` / `paramDef` / `res` 的规约 → [working-on-backend/references/knowledge/api-meta-paramdef.md](../../../working-on-backend/references/knowledge/api-meta-paramdef.md)
