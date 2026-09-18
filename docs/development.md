# Development guide

English | [中文](development.zh.md)

The setup tutorial takes a new contributor from prerequisites to a verified checkout; the contributor reference covers daily workflow and CI organization. Testing policy lives in [testing.md](testing.md); design rationale lives in [Agent Notes](../.agents/notes/README.md).

## Setup tutorial

### Prerequisites

<!-- TODO(template): list runtimes with exact version floors, the package manager and how it is enabled, git version if hooks need it, and optional credentials for demos or e2e tests. -->

- {{RUNTIME_AND_VERSION}}
- {{PACKAGE_MANAGER}}
- Optional: {{OPTIONAL_CREDENTIALS}}

### First-time setup

```sh
{{INSTALL_COMMAND}}
{{TYPECHECK_COMMAND}}
```

<!-- TODO(template): state what the install configures beyond dependencies (git hooks, generated files) and how to repair it when a cached restore skips that step. -->

Setup is complete when `{{TYPECHECK_COMMAND}}` exits successfully.

## Contributor reference

### Daily workflow

<!-- TODO(template): describe the loop — branch, change, focused evidence per pre-push-checks, commit conventions if any. One home per fact: do not restate AGENTS.md rules here. -->

### CI organization

<!-- TODO(template): summarize which lanes exist and what each owns (lint, unit, e2e, platform matrix). Link the workflow files; do not enumerate check-by-check lists that drift from the actual scripts. -->

### TODO marker semantics

`FIXME` marks a defect to fix before the next release; `TODO` marks accepted work not yet scheduled; `XXX` marks a landmine that needs a design decision. Each marker carries enough context for its future owner.
