# 项目模板

[English](TEMPLATE.md) | 中文

一套从 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 提炼的可复用智能体协作脚手架：分层智能体指令、分层双语文档、决策记录（Agent Note）、可复用智能体技能，以及零依赖的验证门。复制进任何新项目并填入占位符即可使用。

## 你会得到什么

```
AGENTS.md                  AI 智能体的常驻指令（CLAUDE.md 是它的符号链接）
CONTRIBUTING.md            贡献指南骨架
docs/                      分层文档及其标准（docs/AGENTS.md）
.agents/notes/             决策记录：proposed / implemented / rejected / archived
.agents/skills/            可复用智能体工作流（推送前检查、代码评审）
scripts/                   零依赖 Node 验证门 + run-gates 聚合器
benchmarks/                可选的纯 Node 性能通道（benchmarks/AGENTS.md）
website/                   可选的双语文档网站（website/AGENTS.md）
lefthook.yml               Git 钩子接线模板（可选）
.claude/skills             向 Claude Code 暴露技能的符号链接
```

## 套用到新项目

1. 把需要的文件复制到新仓库根目录（模板是增量式的，不要求特定语言或包管理器）。新项目保留自己的 `README.md`；本指南在套用完成后可删除。
2. 替换占位符：运行 `grep -rn "TODO(template)" .` 与 `grep -rn "{{" .`，逐项解决。
3. 运行 `node scripts/run-gates.mjs`；模板自身通过全部验证门，修改之后也必须保持通过。
4. 可选：安装 [lefthook](https://github.com/evilmartians/lefthook) 并运行 `lefthook install`，或把 `node scripts/run-gates.mjs` 接入现有钩子。
5. 裁剪不需要的层级：`docs/postmortem/`、`docs/modules/`、`docs/user/` 均为可选，删除时连同预算清单中的条目一起移除。
6. 可选：性能通道——每条实测用户路径一个目录，每个用例跑五个全新进程样本，预算由评审过的常量换算而来。用例的期望值要在你自己的参考运行上重新记录，并更新[基准通道笔记](.agents/notes/implemented/testing/2026-09-19-performance-benchmark-lane.zh.md)；随附的数字是本仓库的测量结果，不是你的。不需要测量面就整目录删除 `benchmarks/`，并删掉根 `AGENTS.md` 中对应的那一行。
7. 可选：文档网站——填好 `website/site.mjs` 中的 `TODO(template)` 占位符，然后 `cd website && npm install`（任何 npm 兼容的包管理器都可以；网站自包含，不会给仓库引入根 package 清单）。不需要文档站就整目录删除 `website/`。

## 各部分如何协作

| 组成 | 职责 |
|---|---|
| 根 `AGENTS.md` | 智能体每个会话都需要的常驻指令，每条一到三行并链接归属文档 |
| 子树 `AGENTS.md` | 仅作用于 `docs/`、`scripts/`、`.agents/notes/` 的局部指令 |
| `docs/AGENTS.md` | 文档标准：层级表、写作规则、字数预算、slop 清单 |
| Agent Note | RFC 风格的决策记录，含生命周期、分类与强制的 alternatives-considered 小节 |
| 技能 | 带 YAML frontmatter、按需加载的可复用工作流 |
| 验证门 | 由 `scripts/run-gates.mjs` 聚合的确定性检查（`verify-*.mjs`） |
| `benchmarks/` | 可选的性能通道：每条实测用户路径一个目录，每个用例五个全新进程样本，预算来自评审过的常量（[benchmarks/AGENTS.md](benchmarks/AGENTS.md)） |
| `website/` | 可选的 VitePress 站点：发布清单把 `docs/` 文档对投影为中文根语言 + `/en` 双语站点，附每页 raw-Markdown 孪生与 `llms.txt`（[website/AGENTS.md](website/AGENTS.md)） |

## 双语约定

面向人的文档以 `.md` + `.zh.md` 成对存在，同步更新且标题结构互为镜像；`verify-doc-pairs` 检查成对性。机器校验的记号——`# Agent Note:` 头、`Status:` 行、技能 frontmatter——逐字保留英文。`AGENTS.md` 系列、技能与脚本仅英文。

## 验证门

| 命令 | 检查内容 |
|---|---|
| `node scripts/verify-commit-hygiene.mjs` | 被跟踪文件：恰好一个结尾换行、无行尾空白、无冲突标记 |
| `node scripts/verify-md-links.mjs` | 相对 Markdown 链接可解析 |
| `node scripts/verify-md-wrap.mjs` | 一段一行 |
| `node scripts/verify-doc-pairs.mjs` | `.md` / `.zh.md` 成对且标题一致 |
| `node scripts/verify-doc-budgets.mjs` | 常驻文档不超过字数上限 |
| `node scripts/verify-agent-note-format.mjs` | Agent Note 头部、骨架与生命周期一致 |
| `node scripts/verify-agent-note-classification.mjs` | 生命周期与分类目录符合闭集 |
| `node scripts/run-gates.mjs` | 顺序执行以上全部 |

所有验证门在 Node ≥ 18 上运行，零依赖，并从脚本自身位置解析仓库根目录。可选的文档网站因依赖自身安装，刻意不在 `run-gates` 之内——用 `npm --prefix website run build` 检查（[website/AGENTS.md](website/AGENTS.md)）。可选的性能通道出于相反的理由同样不在其中——它零依赖，但既慢又对宿主敏感——用 `node benchmarks/run.mjs` 检查（[benchmarks/AGENTS.md](benchmarks/AGENTS.md)）。

## 与源项目的差异

模板去掉了源项目的 `.i18n.yaml` sidecar、生成式目录、翻译配对机器与 TypeScript 专属验证门；轻量的 `verify-doc-pairs` 取代 sidecar 一致性检查。其余部分——层级分类、Agent Note 生命周期、证据匹配纪律——均以语言无关的形式保留。

基准层级移植了源项目性能门的纪律——每条实测用户路径一个目录、固定的合成输入、全新进程样本、评审过的预算、每个判定都带原始证据——以纯 `.mjs` 重写在零依赖运行器之上。它去掉了 Vitest 编排、工作负载编译构建、工作区私有的基准包与 Playwright 浏览器通道；`*.bench.client.mjs` 文件会被报为无法运行，而不是被静默跳过。

网站层级移植了源项目文档站的投影架构——发布清单、一次性的 `.generated/` 树、每页 raw-Markdown 孪生、`llms.txt`——以纯 `.mjs` 重写在 VitePress 之上，去掉了 Mermaid 查看器、自定义主题与 jsdom 片段校验；Markdown 内容留在 `docs/`，其余全部由投影器派生。

## 来源与许可

结构提炼自 [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)（MIT）；模板正文为原创。可按项目需要保留或替换本声明。
