---
name: pre-push-checks
description: Use before pushing, force-pushing, or claiming checks pass, to select the smallest set of tests and checks that covers the outgoing diff without reflexively running the full suite.
---

# Pre-Push Checks

Use this skill once before every push to select relevant local evidence. Git hooks stay intentionally narrow; CI owns exhaustive coverage and the platform matrix. Report only the commands you ran and their results.

## Inspect the outgoing change

1. Confirm the checkout, branch, and the exact base you will be reviewed against.

```sh
git status --short --branch
git rev-parse --show-toplevel
```

2. Inspect the complete scope of the outgoing change against that base.

```sh
git diff --stat <verified-base-ref>...HEAD
```

Supply a base verified from current remote state; do not guess. After retarget or merge, re-inspect the scope and rerun only checks the combined change invalidates.

## Select relevant evidence

There is no universal local baseline beyond the hooks. Every behavior change needs the narrowest available check that would fail for its regression; add broader checks only for surfaces the diff actually reaches.

- **Code behavior:** run the owning test file or the focused test name; adjacent tests when a shared contract changes.
- **Measured user paths:** run the owning case, `node benchmarks/run.mjs <case>`, when the diff touches a path the lane measures. Never relax a budget, and never re-record an expectation, to make a push pass.
- **Documentation, Agent Notes, or decision records:** run `node scripts/run-gates.mjs`.
- **User- or model-visible output:** run the snapshot or expected-output test that owns the output.
- **Package manifests, public exports, or build configuration:** run the build and the owning built-artifact smoke.
- **Real external providers:** run the relevant e2e target when credentials are available; never print secrets.

Do not manually repeat a passing check merely because a commit or push follows; do not push and hope CI differs.

## Full local rehearsal

Run the complete suite only when explicitly requested, while diagnosing a CI failure, or when the change spans the repository so broadly that no narrower set is credible.

## History-rewriting pushes

Rebase is allowed for standalone and stacked branches. Before rewriting history, fetch the current remote branch and record its exact commit id; publish with `--force-with-lease=<branch>:<observed-id>` so a concurrent update aborts the push. Raw `--force` is never allowed. After any rewritten push, re-audit unresolved review threads and checks; pre-rewrite anchors are not current evidence.

## Handle failures

If a relevant check fails, stop and fix or explain the blocker. If a failure looks environment-specific, prove it: record the exact command, the failing test, and the platform-specific mismatch, then confirm the relevant non-platform evidence. Bypass a local hook only when the user explicitly agrees, and report exactly what failed.
