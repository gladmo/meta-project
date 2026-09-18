# Agent Note: Performance benchmark lane

Status: implemented

English | [中文](2026-09-19-performance-benchmark-lane.zh.md)

## Problem

The scaffold verifies documentation, decision records, and — through the project's own commands — behavior, but it carries no measurement surface. A change that keeps every observable behavior while doubling the cost of a hot path, or retaining the whole input corpus, passes every gate this repository owns. The source project answers that with `benchmarks/`, but its tree is bound to its toolchain: TypeScript cases orchestrated by Vitest, workers compiled by tsdown into `.dsh-build/`, a workspace-private package for benchmark-only dependencies, and a Playwright lane driving built client bundles. None of that transfers to a language-agnostic, zero-dependency scaffold.

## Decision

`benchmarks/` ports the discipline and drops the toolchain. [run.mjs](../../../../benchmarks/run.mjs) discovers `<path>/<name>.bench.mjs` cases, runs one at a time in a fresh child — no measurement shares a CPU with another case — and aggregates the JSON report line each case prints. A case takes its samples through [support/worker.mjs](../../../../benchmarks/support/worker.mjs): one fresh plain-Node process per sample under a deadline, with exit code, signal, timeout, stderr, and report returned independently. Workers assert their own runtime with `assertPlainNodeWorker` — running from this tree, under no module loader, with production entries resolving to JavaScript files. Inputs are synthesized from reviewed constants in a private `mkdtemp` root removed on failure as well as success, and every case asserts its measured endpoint counts against the fixture, so a pass that skipped work fails loud instead of reporting a fast, wrong sample.

Budgets are reviewed source constants: [support/calibration.mjs](../../../../benchmarks/support/calibration.mjs) applies the CI time scale and variance headroom to a reference-machine duration, and headroom alone to retained heap. No environment variable overrides a budget; a verdict is the median of five samples, reported beside the raw samples, their spread, and the host facts.

The shipped case `doc-gates` measures the corpus pass every Markdown gate performs — `markdownFiles`, `readRel`, and the shared `analyze` from [scripts/lib/md.mjs](../../../../scripts/lib/md.mjs) — over a synthetic bilingual corpus of 800 files and 100,000 lines. The gate scripts themselves are CLI-only, so the measured boundary stops at the analyzer's output. The case needs no build step, no browser, and no dependency.

## Calibration evidence

Reference machine: Intel Core i7-6700HQ, darwin x64, parallelism 8, Node v26.7.0, V8 14.6. Five runs of five fresh-process samples each produced wall-time medians of 172.1, 134.6, 160.6, 157.4, and 150.8 ms, and a retained heap of 4.50 MiB in every sample. The shipped expectations round above the observed medians — 175 ms and 5 MiB — giving budgets of 438 ms and 7 MiB.

The 2× time scale is inherited from the source project's hosted-runner calibration rather than measured against a hosted runner here, so a CI measurement is still required before either budget is treated as a guarantee on another machine.

Two probes prove the verdict can fail. Retaining each document's text, as a retention regression would, moves the retained-heap sample from 4.5 MiB to 10.8 MiB, past the 7 MiB budget. An impossible 3 ms wall-time expectation makes the case report `median wall time … exceeds budget 3 ms` and exit nonzero through the runner, which also reports the case's failure and exits nonzero itself.

## Alternatives considered

**Copy the source tree.** Rejected: TypeScript cases, a compiled-worker build, a benchmark-only workspace package, and a Playwright lane all contradict the scaffold's language-agnostic, zero-dependency contract, and a project without that toolchain would inherit a tree it cannot run.

**Ship the tier's rules without a runner.** Rejected: prose budgets are unfalsifiable. The rules are only worth carrying because a command enforces them and a recorded reference makes the numbers revisable.

**Fold the lane into `run-gates`.** Rejected: measurement is slow and host-sensitive, while `run-gates` must stay deterministic and cheap enough for a commit hook. The lane keeps its own entry point, as the source project keeps a separate benchmark CI job.

**Adopt a micro-benchmark library.** Rejected: it adds a dependency to a zero-dependency scaffold and hides the part that matters — fresh-process isolation, deadline handling, and budget arithmetic — behind an API the reader would have to learn anyway.

**Keep the measurements but not the budget arithmetic.** Rejected: reporting a number without a reviewed ceiling invites "looks fine to me" as the verdict, and leaves nothing to fail when the constant is exceeded.

## Consequences

A new case costs a fixture, a worker, a case file, and a README pair, and its calibration evidence updates the owning note. [benchmarks/AGENTS.md](../../../../benchmarks/AGENTS.md) owns the rules for adding one; the case loop is two files because the case orchestrates and the worker measures, and porting a case to another language means replacing both.

Budgets are only as good as their provenance: a host change requires a fresh recorded run and an updated expectation, never a relaxed constant or an environment override. Nothing in this lane runs a browser, so user-visible rendering cost remains the source project's concern until a project adds that lane and its suffix.

The tier is optional. A project that wants no measurement surface deletes `benchmarks/` and the root `AGENTS.md` command line that names it; the remaining tiers never depend on it.
