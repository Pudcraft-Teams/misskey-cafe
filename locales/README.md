# **DO NOT edit locale files** except `zh-CN.yml`.

> [!NOTE]
> misskey-cafe (本 fork): 本仓库只直接维护 `zh-CN.yml` —— fork 特有功能的键只写在这里（简体中文），它同时是全语言的最终回退与 i18n 类型生成的并入源（实现见 `packages/i18n/src/index.ts` 与 `packages/i18n/scripts/generateLocaleInterface.ts`）。`ja-JP.yml` 是上游键源，保持与上游零差异；其余语言文件由上游 Crowdin 管理，均不可直接修改。欢迎贡献者通过 PR 为 fork 特有键补充其他语言翻译。

When you add text to the ja-JP file (of misskey-dev/misskey), it will automatically be applied to other language files.
Translations added in ja-JP file should contain the original Japanese strings.

Please see [Contribution guide](../CONTRIBUTING.md) for more information.
