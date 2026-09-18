# 开发指南

English | [中文](development.zh.md)

搭建教程带新贡献者从前置条件走到验证通过的检出；贡献者参考覆盖日常工作流与 CI 组织。测试策略见 [testing.md](testing.zh.md)；设计依据存放在 [Agent Note](../.agents/notes/README.md)。

## 搭建教程

### 前置条件

<!-- TODO(template): 列出运行时及其确切版本下限、包管理器及其启用方式、钩子所需的 git 版本，以及演示或 e2e 测试可选的凭据。 -->

- {{RUNTIME_AND_VERSION}}
- {{PACKAGE_MANAGER}}
- 可选：{{OPTIONAL_CREDENTIALS}}

### 首次搭建

```sh
{{INSTALL_COMMAND}}
{{TYPECHECK_COMMAND}}
```

<!-- TODO(template): 说明安装除依赖之外还配置了什么（git 钩子、生成文件），以及缓存恢复跳过该步骤时如何修复。 -->

`{{TYPECHECK_COMMAND}}` 成功退出即搭建完成。

## 贡献者参考

### 日常工作流

<!-- TODO(template): 描述循环——建分支、修改、按 pre-push-checks 选取聚焦证据、提交约定（若有）。一处一事：不要在此复述 AGENTS.md 的规则。 -->

### CI 组织

<!-- TODO(template): 概述存在哪些通道、各通道负责什么（lint、单元、e2e、平台矩阵）。链接工作流文件；不要逐条罗列会随真实脚本漂移的检查清单。 -->

### TODO 标记语义

`FIXME` 表示必须在下个发布前修复的缺陷；`TODO` 表示已接受但未排期的工作；`XXX` 表示需要设计决策的地雷。每个标记都要为其未来的主人留下足够上下文。
