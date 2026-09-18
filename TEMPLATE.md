# Project Template

English | [中文](TEMPLATE.zh.md)

A reusable agent-collaboration scaffold distilled from [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness): layered agent instructions, tiered bilingual documentation, decision records (Agent Notes), reusable agent skills, and zero-dependency verification gates. Copy it into any new project and fill in the placeholders.

## What you get

```
AGENTS.md                  Standing orders for AI agents (CLAUDE.md symlinks it)
CONTRIBUTING.md            Contribution guide skeleton
docs/                      Tiered documentation and its standard (docs/AGENTS.md)
.agents/notes/             Decision records: proposed / implemented / rejected / archived
.agents/skills/            Reusable agent workflows (pre-push checks, code review)
scripts/                   Zero-dependency Node gates + run-gates aggregator
benchmarks/                Optional plain-Node performance lane (benchmarks/AGENTS.md)
website/                   Optional bilingual documentation website (website/AGENTS.md)
lefthook.yml               Git-hook wiring template (optional)
.claude/skills             Symlink exposing skills to Claude Code
```

## Apply to a new project

1. Copy the files you want into the new repository root (the template is additive; it never requires a specific language or package manager). Your project keeps its own `README.md`; this guide is deletable once applied.
2. Replace placeholders: run `grep -rn "TODO(template)" .` and `grep -rn "{{" .` and resolve every hit.
3. Run `node scripts/run-gates.mjs`; the template passes its own gates, and it must still pass after your edits.
4. Optional: install [lefthook](https://github.com/evilmartians/lefthook) and run `lefthook install`, or wire `node scripts/run-gates.mjs` into your existing hooks.
5. Prune tiers you do not need: `docs/postmortem/`, `docs/modules/`, and `docs/user/` are optional; remove them and their budget entries together.
6. Optional: performance lane — one directory per measured user path, each case running five fresh-process samples against budgets built from reviewed constants. Record the case's expectations from your own reference run and update the [benchmark-lane note](.agents/notes/implemented/testing/2026-09-19-performance-benchmark-lane.md); the shipped numbers are this repository's measurement, not yours. Need no measurement surface? Delete the whole `benchmarks/` directory and its line in the root `AGENTS.md`.
7. Optional: documentation website — fill the `TODO(template)` placeholders in `website/site.mjs`, then `cd website && npm install` (any npm-compatible package manager works; the website is self-contained and never adds a root package manifest). Need no docs site? Delete the whole `website/` directory.

## How the pieces fit

| Piece | Role |
|---|---|
| Root `AGENTS.md` | Standing orders an agent needs in every session, one to three lines each, linking the owning document |
| Subtree `AGENTS.md` | Orders scoped to `docs/`, `scripts/`, and `.agents/notes/` |
| `docs/AGENTS.md` | The documentation standard: tier table, writing rules, word budgets, slop checklist |
| Agent Notes | RFC-style decision records with lifecycle, classification, and a mandatory alternatives-considered section |
| Skills | Reusable workflows with YAML frontmatter, loaded on demand |
| Gates | Deterministic checks (`verify-*.mjs`) aggregated by `scripts/run-gates.mjs` |
| `benchmarks/` | Optional performance lane: one directory per measured user path, five fresh-process samples per case, budgets from reviewed constants ([benchmarks/AGENTS.md](benchmarks/AGENTS.md)) |
| `website/` | Optional VitePress site: a publication manifest projects the `docs/` pairs into a Chinese-root and `/en` site, with raw-Markdown twins and `llms.txt` ([website/AGENTS.md](website/AGENTS.md)) |

## Bilingual convention

Human-facing documents are `.md` + `.zh.md` pairs that update together and mirror each other's heading structure; `verify-doc-pairs` gates the pairing. Machine-checked tokens — `# Agent Note:` headers, `Status:` lines, skill frontmatter — stay in English verbatim. `AGENTS.md` files, skills, and scripts are English-only.

## Gates

| Command | Checks |
|---|---|
| `node scripts/verify-commit-hygiene.mjs` | Tracked files: one trailing newline, no trailing whitespace, no conflict markers |
| `node scripts/verify-md-links.mjs` | Relative Markdown links resolve |
| `node scripts/verify-md-wrap.mjs` | One physical line per paragraph |
| `node scripts/verify-doc-pairs.mjs` | `.md` / `.zh.md` pairs exist and headings match |
| `node scripts/verify-doc-budgets.mjs` | Standing documents stay within word ceilings |
| `node scripts/verify-agent-note-format.mjs` | Agent Note headers, skeletons, and lifecycle agreement |
| `node scripts/verify-agent-note-classification.mjs` | Lifecycle and class folders follow the closed tree |
| `node scripts/run-gates.mjs` | All of the above, sequentially |

All gates run on Node ≥ 18 with no dependencies and resolve the repository root from their own location. The optional documentation website stays outside `run-gates` on purpose — it needs its own dependencies — so check it with `npm --prefix website run build` ([website/AGENTS.md](website/AGENTS.md)). The optional performance lane stays outside it for the opposite reason — no dependency, but slow and host-sensitive — so check it with `node benchmarks/run.mjs` ([benchmarks/AGENTS.md](benchmarks/AGENTS.md)).

## Differences from the source project

The template drops the `.i18n.yaml` sidecars, generated catalogs, translation-pairing machinery, and TypeScript-specific gates of the source; the lightweight `verify-doc-pairs` gate replaces the sidecar consistency check. Everything else — the tier taxonomy, the Agent Note lifecycle, the evidence-matching discipline — is preserved in language-agnostic form.

The benchmark tier ports the source project's performance-gate discipline — one directory per measured user path, fixed synthetic inputs, fresh-process samples, reviewed budgets, raw evidence beside every verdict — rewritten as plain `.mjs` under a zero-dependency runner. It drops the Vitest orchestration, the compiled-worker build, the workspace-private benchmark package, and the Playwright browser lane; a `*.bench.client.mjs` file is reported as unrunnable rather than silently skipped.

The website tier ports the source project's documentation site with its projection architecture — publication manifest, disposable `.generated/` tree, per-route raw-Markdown twins, `llms.txt` — rewritten as plain `.mjs` on VitePress, without the Mermaid viewer, the custom theme, and the jsdom fragment gate; Markdown content stays in `docs/` and the projector derives everything else.

## Origin and license

Structurally derived from [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) (MIT); the template text is original. Keep or replace this attribution as your project requires.
