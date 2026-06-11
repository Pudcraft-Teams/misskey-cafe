# `os.*` UI 辅助函数

[`packages/frontend/src/os.ts`](../../../../../packages/frontend/src/os.ts) 中公开的 UI 操作 API 一览。**不要直接调用浏览器标准的 `window.alert()` / `window.confirm()` / `window.prompt()`**。因为它们与 Misskey 的主题 / 无障碍 / 模态层不一致。

## 主要 API

| 函数 | 用途 |
|---|---|
| `os.alert({ type?, title?, text? })` | 单向 alert (所有字段可选) |
| `os.confirm({ type, title?, text? })` | yes/no 确认 (`type` 必填,返回 `{ canceled }`) |
| `os.toast(message)` | 临时通知 |
| `os.popup(component, props, handlers)` | 任意组件的异步弹出 |
| `os.popupMenu(items, anchor?)` | 上下文菜单 |
| `os.contextMenu(items, ev)` | 右键菜单 |
| `os.form(title, fields)` | 表单对话框 |
| `os.apiWithDialog(endpoint, data)` | 调用 API + 出错时显示对话框 |
| `os.success()` / `os.waiting()` | 成功 / 加载中显示 |

## 使用示例

### `os.alert` (单向通知)

```ts
await os.alert({
	type: 'info',
	text: i18n.ts.savedSuccessfully,
});
```

`type` 为 `'info'` / `'warning'` / `'error'` / `'question'` / `'success'` / `'waiting'`。

### `os.confirm` (yes/no 确认)

```ts
const { canceled } = await os.confirm({
	type: 'warning',
	text: i18n.ts._notes.deleteConfirm,
});
if (canceled) return;
// 删除处理
```

`canceled === true` 时什么都不做,这是高频模式。

### `os.toast` (临时通知)

```ts
os.toast(i18n.ts.deleted);
```

成功通知等轻量的 fire-and-forget 反馈。

### `os.popup` (任意组件)

```ts
const { dispose } = os.popup(MkUserSelectDialog, {
	includeSelf: false,
}, {
	ok: (user) => {
		// ...
		dispose();
	},
	cancel: () => {
		dispose();
	},
});
```

要打开自定义对话框时,用 `os.popup` 启动组件 (props / emits)。用 `dispose()` 关闭。

### `os.apiWithDialog` (API + 自动错误对话框)

```ts
const result = await os.apiWithDialog('notes/create', {
	text: 'hello',
});
// 成功时: result 是 API 响应
// 失败时: 自动显示错误对话框。但 promise 本身仍会 reject,所以若要 await 则需要 try/catch
```

普通的 `misskeyApi(...)` 需要自行显示错误对话框,而 `apiWithDialog` 在失败时会自动显示 `os.alert({ type: 'error', ... })`。但它返回的 promise 与原始 `misskeyApi(...)` 相同,会 **reject** ([os.ts](../../../../../packages/frontend/src/os.ts) 中 `return promise`)。若要 `await` 仍需 try/catch (如果只是想在显示对话框后停止后续处理,catch 后吞掉即可)。

## 为什么不用浏览器标准 UI

- `window.alert()` 不跟随 Misskey 的主题 (深色模式 / 自定义主题)
- `window.confirm()` 的键盘操作、focus trap、i18n 都与 Misskey 的规约不一致
- `window.prompt()` 的输入 UI 同理
- 依赖浏览器的显示差异 (Firefox / Safari / Chrome 外观不同)
- 会被 vue-component-reviewer 指摘

应改用 `os.alert` / `os.confirm` / `os.form` / `os.popup`。

## 参考文件

- [packages/frontend/src/os.ts](../../../../../packages/frontend/src/os.ts) — 全部 API 的实现
- 既有的对话框类组件: `MkDialog.vue` (alert / confirm 复用它)、`MkFormDialog.vue` 等
