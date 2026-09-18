# meta-project

English | [中文](README.zh.md)

一套面向由 AI 智能体参与构建的仓库的脚手架：分层常驻指令（[AGENTS.md](AGENTS.md)）、带字数预算的分层双语文档、RFC 风格的决策记录（[Agent Note](.agents/notes/README.md)）、按需加载的[技能](.agents/skills/pre-push-checks/SKILL.md)，以及零依赖的验证[门](scripts/run-gates.mjs)——结构提炼自 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)，天然与语言无关。套用到新项目的完整步骤由 [TEMPLATE.md](TEMPLATE.md) 负责。

## 从这里开始

- [把脚手架套用到新项目](TEMPLATE.md)：复制什么、占位符如何替换、哪些层级可选。
- [为本仓库做贡献](CONTRIBUTING.md)：参与方式与提交要求；[AGENTS.md](AGENTS.md) 中的常驻指令适用于每一处改动。
- [撰写或修改文档](docs/AGENTS.md)：驱动 `docs/` 下所有页面的层级标准、写作规则与字数预算。
- [记录一次决策](.agents/notes/README.md)：Agent Note 的生命周期、分类与文件格式；可复用工作流位于 [.agents/skills/](.agents/skills/pre-push-checks/SKILL.md)。

## 验证

```sh
node scripts/run-gates.mjs
```

一个入口按顺序运行全部文档与决策记录验证门，Node ≥ 18、零依赖；每个门检查什么的清单见 [TEMPLATE.md](TEMPLATE.md)。推送前应收集哪些证据，由 [pre-push-checks](.agents/skills/pre-push-checks/SKILL.md) 负责选取。

## 来源与许可

结构提炼自 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（MIT）；本仓库文字为原创。套用脚手架时，按 [TEMPLATE.md](TEMPLATE.md) 的说明保留或替换署名。
