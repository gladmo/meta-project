# AGENTS.md — Performance benchmarks

`benchmarks/` owns the repository's performance lane: required budgets for measured user paths whose cost crosses module ownership. Local diagnostics stay beside their owners and never join this lane.

- Organize by measured user path, one directory per path. Never mirror the module tree.
- A case is `<path>/<name>.bench.mjs`; the workload it measures is `<name>.worker.mjs`; fixtures and support modules carry no benchmark suffix.
- [run.mjs](run.mjs) runs one case at a time in a fresh child. A case takes every sample through [support/worker.mjs](support/worker.mjs), which spawns a fresh plain-Node process per sample and returns its JSON report line; a worker asserts its own runtime with `assertPlainNodeWorker` — this tree, no module loader, production entries resolving to JavaScript.
- Synthesize fixed inputs from reviewed constants inside the case's private `mkdtemp` root. Never read recorded material, ambient repository content, or a network service; remove owned roots after failure as well as success.
- Exercise production entry points. Never copy a product algorithm into this tree, add an export only for measurement, or turn a case into a duplicate semantic assertion; assert endpoint counts instead, so a pass that skipped work fails loud rather than reporting a fast, wrong sample.
- Budgets are reviewed source constants scaled by [support/calibration.mjs](support/calibration.mjs); environment variables never override them. Time takes the CI scale, memory and dimensionless ratios take headroom only.
- Report raw samples plus the aggregate the verdict uses — median, minimum, absolute value, or ratio — and name that aggregate in the case README.
- Keep scenario support beside its case; move a helper into [support/](support/) only after two case directories need the same behavior.
- The case README owns the workload, timing boundary, memory endpoint, budgets, and known exclusions; the owning Agent Note owns calibration evidence and alternatives.
