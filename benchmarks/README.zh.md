# 性能基准测试通道

[English](README.md) | 中文

性能通道：为成本跨越模块归属的实测用户路径设定必需预算。确定性验证门证明仓库行为依旧正确，本通道则证明它测量的路径仍然只花评审过的常量所规定的成本。在本目录工作的规则见 [AGENTS.md](AGENTS.md)；通道为何存在、放弃了什么，见[基准通道 Agent Note](../.agents/notes/implemented/testing/2026-09-19-performance-benchmark-lane.zh.md)。

## 目录结构

```
run.mjs                     通道入口：发现用例、串行执行、汇总
support/calibration.mjs     把参考机器的期望换算成预算
support/environment.mjs     随每个样本上报的宿主信息
support/worker.mjs          新进程工作负载启动器与运行期断言
doc-gates/                  一条实测用户路径（[README](doc-gates/README.zh.md)）
```

## 运行

```sh
node benchmarks/run.mjs            # 全部用例，逐个执行
node benchmarks/run.mjs doc-gates  # 单个用例，按用例名或目录
node benchmarks/run.mjs --list     # 只列出将要运行的用例
node benchmarks/run.mjs --json     # 输出一份 JSON 文档而非摘要
```

本通道零依赖、无构建步骤，要求 Node ≥ 18。它刻意不在 `node scripts/run-gates.mjs` 之内：测量既慢又对宿主敏感，而文档验证门必须在提交钩子里保持确定且足够快。

## 新增用例

1. 新建 `benchmarks/<实测用户路径>/`——以用户路径命名，而不是以其中占主导的模块命名。
2. 编写 `<name>.worker.mjs`：用评审过的常量在自己的 `mkdtemp` 根目录里合成输入，调用 `assertPlainNodeWorker`，测量各端点，最后打印一行 JSON 报告，并在 `finally` 中删除该根目录。
3. 编写 `<name>.bench.mjs`：通过 `runBenchmarkWorker` 取五个样本，聚合并与预算比较，打印各样本，最后打印一行 JSON 报告——其中 `case` 与 `verdict` 由运行器校验，`samples`、`aggregate`、`budgets` 与 `environment` 由它上报。
4. 记录首次参考运行的各中位数，把期望值向上取整到中位数之上，并通过 [support/calibration.mjs](support/calibration.mjs) 设定预算——绝不用裸数字。
5. 为 `<name>` 增加 README 文档对：负载、计时边界、内存端点、预算、排除项。
6. 把负载、校准证据与备选方案记入归属的 [Agent Note](../.agents/notes/README.md)。

## 预算

预算把一条参考机器期望换算成上限。时间同时乘两个系数；内存与无量纲比值只乘余量，因为机器更慢并不会保留更多堆。

| 常量 | 取值 | 含义 |
|---|---|---|
| `CI_TIME_SCALE` | 2 | CI 运行器与参考机器之间的实测墙钟时间比 |
| `PERFORMANCE_BUDGET_HEADROOM` | 1.25 | 允许高出校准期望的波动 |
| `ciTimeBudget(ms)` | `ceil(ms × 2 × 1.25)` | CI 墙钟时间预算 |
| `memoryBudgetMiB(mib)` | `ceil(mib × 1.25)` | 保留堆预算 |

判定使用各样本的中位数，并在用例中写明这一选择；原始样本、其离散程度与宿主信息随判定一同上报，读者据此区分回归与宿主噪声。失败用例以非零退出，指明超出预算的聚合量，并让 `run.mjs` 同样以非零退出。

## 已知排除项

- 无浏览器通道。源项目用 Playwright 驱动构建后的客户端产物并单独上报该证据；浏览器通道会重新引入本次移植所放弃的依赖与产物流水线。`*.bench.client.mjs` 文件会被明确报告为无法运行，而不是被静默跳过——需要该通道的项目保留此后缀并自行接线。
- 无构建步骤。用例与工作负载以纯 Node 直接从源码运行；没有编译产物目录，也没有需要拒绝的 TypeScript 加载器。
- 无包私有基准依赖。在通道本身零依赖时，为基准专用依赖单设工作区私有包并无必要。
