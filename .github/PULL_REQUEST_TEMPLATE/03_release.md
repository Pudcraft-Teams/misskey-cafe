## Summary
这是一个 release PR。

关于发布流程的更多信息请参阅:
https://github.com/Pudcraft-Teams/misskey-cafe/blob/develop/CONTRIBUTING.md#release

## For reviewers
请确认以下事项:

- CHANGELOG 是否有遗漏
- 版本号的提升方式是否恰当
- 是否还有其他必须包含进本次发布的变更
- 纵观全部变更内容是否存在问题
- 如有未经 review 的 commit，确认其是否没有问题
- 是否完成了最终的运行确认且没有问题

如认为已具备发布条件，请 approve。

## Checklist
- [ ] package.json 的版本号已正确更新
- [ ] CHANGELOG 已更新且无遗漏、无多余内容
- [ ] CI 全部通过
