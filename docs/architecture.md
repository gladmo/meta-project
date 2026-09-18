# Architecture

English | [中文](architecture.zh.md)

The ordered map of {{PROJECT_NAME}}: how the repository composes, which modules exist, and where behavior extends. Decision rationale lives in [Agent Notes](../.agents/notes/README.md); per-module detail lives in [module pages](modules/README.md).

<!-- TODO(template): this page is an ordered map, not an exhaustive reference. A reader should leave with the shape of the system and the vocabulary to search for detail. -->

## Overview

<!-- TODO(template): two or three sentences naming the system's kind, its primary runtime, and the one design idea that explains its shape. -->

## Module map

<!-- TODO(template): one line per module — name, responsibility, and what it depends on. Order by layering: foundations first, entry points last. Link each module's owning page or README. -->

```
benchmarks/  Performance lane: one directory per measured user path (benchmarks/AGENTS.md)
website/     Bilingual documentation site projected from docs/ pairs (website/AGENTS.md)
{{MODULE_A}}    {{one-line responsibility}}
{{MODULE_B}}    {{one-line responsibility}}
```

## Core flows

<!-- TODO(template): describe each named flow in ordered steps over the module map — request lifecycle, startup, shutdown, error propagation. Keep to the sequence and the hand-offs; details belong to the owning module page. -->

## Extension points

<!-- TODO(template): list every documented point where behavior may be added without changing core flow: hooks, plugins, registries, configuration. Each entry names the contract, the owner, and where consumers register. -->

## Invariants

<!-- TODO(template): state the relationships the system guarantees across modules — ownership of resources, ordering, visibility. An invariant that two modules can independently observe is a candidate for a runtime check with its own test. -->
