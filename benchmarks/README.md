# Benchmark lane

English | [中文](README.zh.md)

The performance lane: required budgets for measured user paths whose cost crosses module ownership. Deterministic gates prove the repository still behaves; this lane proves the paths it measures still cost what the reviewed constants say they cost. The rules for working in this tree live in [AGENTS.md](AGENTS.md); why the lane exists and what it gave up live in the [benchmark-lane Agent Note](../.agents/notes/implemented/testing/2026-09-19-performance-benchmark-lane.md).

## Layout

```
run.mjs                     Lane entry point: discovery, serial execution, summary
support/calibration.mjs     Reference-machine expectations to budgets
support/environment.mjs     Host facts reported with every sample
support/worker.mjs          Fresh-process worker launcher and runtime assertion
doc-gates/                  One measured user path ([README](doc-gates/README.md))
```

## Run

```sh
node benchmarks/run.mjs            # every case, one at a time
node benchmarks/run.mjs doc-gates  # one case, by case name or directory
node benchmarks/run.mjs --list     # what would run, running nothing
node benchmarks/run.mjs --json     # one JSON document instead of the summary
```

The lane needs no dependencies, no build step, and Node ≥ 18. It stays outside `node scripts/run-gates.mjs` on purpose: measurement is slow and host-sensitive, while a documentation gate must stay deterministic and fast enough for a commit hook.

## Add a case

1. Create `benchmarks/<measured-user-path>/` — named after the user path, not the module that dominates it.
2. Write `<name>.worker.mjs`: synthesize the input from reviewed constants in your own `mkdtemp` root, call `assertPlainNodeWorker`, measure the endpoints, print one JSON report line last, and remove the root in a `finally`.
3. Write `<name>.bench.mjs`: take five samples through `runBenchmarkWorker`, aggregate them, compare the aggregate against the budgets, print the samples, then one JSON report line whose `case` and `verdict` the runner validates and whose `samples`, `aggregate`, `budgets`, and `environment` it reports.
4. Record the first reference run's medians, round the expectations above them, and set the budgets through [support/calibration.mjs](support/calibration.mjs) — never a bare number.
5. Add `<name>`'s README pair: workload, timing boundary, memory endpoint, budgets, exclusions.
6. Record the workload, calibration evidence, and alternatives in the owning [Agent Note](../.agents/notes/README.md).

## Budgets

A budget converts one reference-machine expectation into a limit. Time takes both factors; memory and dimensionless ratios take headroom only, because a slower machine does not retain more heap.

| Constant | Value | Meaning |
|---|---|---|
| `CI_TIME_SCALE` | 2 | Measured wall-time ratio between the CI runner and the reference machine |
| `PERFORMANCE_BUDGET_HEADROOM` | 1.25 | Allowed variance above a calibrated expectation |
| `ciTimeBudget(ms)` | `ceil(ms × 2 × 1.25)` | CI wall-time budget |
| `memoryBudgetMiB(mib)` | `ceil(mib × 1.25)` | Retained-heap budget |

A verdict uses the median of the samples and states that choice; the raw samples, their spread, and the host facts are reported alongside it, so a reader can tell a regression from a noisy host. A failed case exits nonzero, names the aggregate that exceeded its budget, and makes `run.mjs` exit nonzero as well.

## Known exclusions

- No browser lane. The source project drives built client bundles through Playwright and reports that evidence separately; a browser lane reintroduces the dependency and artifact pipeline this port drops. `*.bench.client.mjs` files are reported as unrunnable rather than silently skipped, so a project that adds the lane keeps the suffix and wires its own command.
- No build step. Cases and workers run from source under plain Node; there is no compiled-worker directory and no TypeScript loader to reject.
- No package-private benchmark dependencies. A workspace-private package holding benchmark-only dependencies is unnecessary where the lane has none.
