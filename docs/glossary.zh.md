# 术语表

[English](glossary.md) | 中文

本仓库在文档、代码评审与决策记录中使用的封闭词汇。当行文开始依赖某个词时把它加入表中；定义保持一行并链接归属文档。

<!-- TODO(template): 用项目自身的领域词汇填充本表。下述各行是模板的工作词汇；可保留或改写。 -->

| 术语 | 定义 |
|---|---|
| 常驻指令 | `AGENTS.md` 中一到三行的规则，链接完整契约的归属文档 |
| 层级 | 文档分类表中的一行；每个事实有且只有一个归属层级（[标准](AGENTS.md)） |
| Agent Note | 具备生命周期、分类与强制备选方案的 RFC 风格决策记录（[规则](../.agents/notes/README.md)） |
| 验证门 | `scripts/` 下由 `run-gates` 聚合的确定性零依赖检查 |
| 基准用例 | `benchmarks/` 下的一条实测用户路径，由 `.bench.mjs` 用例及它所测量的工作负载共同拥有（[规则](../benchmarks/AGENTS.md)） |
| 技能 | `.agents/skills/` 下带 YAML frontmatter 的可复用智能体工作流 |
| 复盘 | 编号的事故记录；唯一允许叙事的层级（[规则](postmortem/README.md)） |
| 取代检查 | 为新 note 搜索其替换的旧 Agent Note，每个新 note 必做（[规则](../.agents/notes/AGENTS.md)） |
