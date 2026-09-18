# meta-project

English | [中文](README.zh.md)

A scaffold for repositories built with AI agents: layered standing orders ([AGENTS.md](AGENTS.md)), tiered bilingual documentation with word budgets, RFC-style decision records ([Agent Notes](.agents/notes/README.md)), on-demand [skills](.agents/skills/pre-push-checks/SKILL.md), zero-dependency verification [gates](scripts/run-gates.mjs), an optional plain-Node performance lane ([benchmarks/AGENTS.md](benchmarks/AGENTS.md)), and an optional bilingual documentation website ([website/AGENTS.md](website/AGENTS.md)) — distilled from [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) and language-agnostic by design. [TEMPLATE.md](TEMPLATE.md) owns the procedure for applying it to a new project.

## Start here

- [Apply the scaffold to a new project](TEMPLATE.md): what to copy, how placeholders resolve, which tiers are optional.
- [Contribute to this repository](CONTRIBUTING.md): ways to help and pull-request expectations; the standing orders in [AGENTS.md](AGENTS.md) apply to every change.
- [Write or edit documentation](docs/AGENTS.md): the tier standard, writing rules, and word budgets behind every page under `docs/`.
- [Record a decision](.agents/notes/README.md): the Agent Note lifecycle, classification, and file format; reusable workflows live under [.agents/skills/](.agents/skills/pre-push-checks/SKILL.md).

## Verification

```sh
node scripts/run-gates.mjs
```

One entrypoint runs every gate in order — commit hygiene over all tracked files, then the documentation and decision-record gates — on Node ≥ 18 with no dependencies; the table of what each gate checks lives in [TEMPLATE.md](TEMPLATE.md). The evidence to gather before a push is selected by [pre-push-checks](.agents/skills/pre-push-checks/SKILL.md).

```sh
node benchmarks/run.mjs
```

The performance lane is separate because measurement is slow and host-sensitive: it samples every case in fresh processes and enforces reviewed budgets, so it never gates a commit hook. [benchmarks/README.md](benchmarks/README.md) owns its commands and calibration model.

## Origin and license

The structure is derived from [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) (MIT); the wording here is original. When applying the scaffold, keep or replace the attribution as [TEMPLATE.md](TEMPLATE.md) describes.
