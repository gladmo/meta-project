# Documentation-gate corpus case

English | [中文](README.zh.md)

Measures the pass every Markdown gate performs over a corpus: walk the documents, read each one, and run the shared production analyzer in [scripts/lib/md.mjs](../../scripts/lib/md.mjs). The path crosses ownership — the analyzer belongs to the gates, the corpus belongs to the documentation tiers — so its budget lives in this lane rather than beside either owner. Run it with `node benchmarks/run.mjs doc-gates`; the lane itself is documented in [benchmarks/README.md](../README.md).

## Workload

[synthetic-corpus.mjs](synthetic-corpus.mjs) owns the reviewed constants: 400 English/Chinese document pairs across four directories — 800 files, 100,000 lines, 10,400 headings, 38,400 links, 800 continued paragraphs — plus a dependency-directory file and a `CLAUDE.md` the walk must ignore. The English and Chinese sides mirror each other's structure, as a translated pair does. Each document hides one heading-shaped line and one link inside a fenced block, so a pass that lost fence state counts more than the fixture guarantees.

[doc-gates.worker.mjs](doc-gates.worker.mjs) writes that corpus into its own `mkdtemp` root, then asserts the measured endpoints against `expectedEndpoints()`: a pass that skipped documents or over-counted fenced examples fails instead of reporting a fast, wrong sample. No ambient repository content, recorded material, or network service supplies input.

## Measurement

| Endpoint | Boundary | Budget |
|---|---|---|
| Wall time | `markdownFiles` through the last `analyze` call; corpus materialization, both collections, and reporting stay outside | median ≤ 438 ms (`ciTimeBudget(175)`) |
| Retained heap | `heapUsed` after two collections separated by an event-loop yield with the parsed corpus reachable, minus the same measurement before the pass | median ≤ 7 MiB (`memoryBudgetMiB(5)`) |

Five fresh processes produce the samples, each in its own corpus root; the median is the verdict, and the report carries every sample, the spread, and the host facts. A sample that outlives its 60 s deadline is killed and reported with its exit code, signal, timeout, and stderr.

## Exclusions

The measured path stops at the analyzer's output. What each gate does with that output — checking that link targets exist, comparing a pair's heading structure, listing wrap violations — stays outside the boundary, as do process startup, `run-gates` aggregation, and the real repository corpus, which is far smaller than the synthetic one. The [owning Agent Note](../../.agents/notes/implemented/testing/2026-09-19-performance-benchmark-lane.md) carries calibration provenance, alternatives, and the probes that prove the verdict can fail.
