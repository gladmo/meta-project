# 添加模块

English | [中文](adding-a-module.zh.md)

向 {{PROJECT_NAME}} 添加一个模块，并把它接入架构地图、归属参考页与验证门。

<!-- TODO(template): 本指南是形态示例。用仓库的真实步骤替换通用步骤；保留编号路径与验证步骤。 -->

## 步骤

1. 创建模块骨架：源码目录、陈述模块契约（配置、语义、局限、扩展点）的 README，以及一个测试文件。

2. 在依赖可用的组合点注册模块；注册即效果——清理随 disposer 返回。

3. 把模块加入[模块地图](../architecture.md)，附一行职责说明。

4. 当模块暴露值得参考的类型或配置时，在 [modules/](../modules/README.md) 下创建归属参考页。

5. 仅当模块 README 成为常驻文档时，才把它加入字数预算清单。

6. 编写能让"该模块要防止的回归"失败的测试；见[测试策略](../testing.zh.md)。

## 验证

```sh
{{TEST_COMMAND}}
node scripts/run-gates.mjs
```

两条命令都退出零，即模块接线正确且其文档可解析。
