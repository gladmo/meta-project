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
lefthook.yml               Git-hook wiring template (optional)
.claude/skills             Symlink exposing skills to Claude Code
```

## Apply to a new project

1. Copy the files you want into the new repository root (the template is additive; it never requires a specific language or package manager). Your project keeps its own `README.md`; this guide is deletable once applied.
2. Replace placeholders: run `grep -rn "TODO(template)" .` and `grep -rn "{{" .` and resolve every hit.
3. Run `node scripts/run-gates.mjs`; the template passes its own gates, and it must still pass after your edits.
4. Optional: install [lefthook](https://github.com/evilmartians/lefthook) and run `lefthook install`, or wire `node scripts/run-gates.mjs` into your existing hooks.
5. Prune tiers you do not need: `docs/postmortem/`, `docs/modules/`, and `docs/user/` are optional; remove them and their budget entries together.

## How the pieces fit

| Piece | Role |
|---|---|
| Root `AGENTS.md` | Standing orders an agent needs in every session, one to three lines each, linking the owning document |
| Subtree `AGENTS.md` | Orders scoped to `docs/`, `scripts/`, and `.agents/notes/` |
| `docs/AGENTS.md` | The documentation standard: tier table, writing rules, word budgets, slop checklist |
| Agent Notes | RFC-style decision records with lifecycle, classification, and a mandatory alternatives-considered section |
| Skills | Reusable workflows with YAML frontmatter, loaded on demand |
| Gates | Deterministic checks (`verify-*.mjs`) aggregated by `scripts/run-gates.mjs` |

## Bilingual convention

Human-facing documents are `.md` + `.zh.md` pairs that update together and mirror each other's heading structure; `verify-doc-pairs` gates the pairing. Machine-checked tokens — `# Agent Note:` headers, `Status:` lines, skill frontmatter — stay in English verbatim. `AGENTS.md` files, skills, and scripts are English-only.

## Gates

| Command | Checks |
|---|---|
| `node scripts/verify-md-links.mjs` | Relative Markdown links resolve |
| `node scripts/verify-md-wrap.mjs` | One physical line per paragraph |
| `node scripts/verify-doc-pairs.mjs` | `.md` / `.zh.md` pairs exist and headings match |
| `node scripts/verify-doc-budgets.mjs` | Standing documents stay within word ceilings |
| `node scripts/verify-agent-note-format.mjs` | Agent Note headers, skeletons, and lifecycle agreement |
| `node scripts/verify-agent-note-classification.mjs` | Lifecycle and class folders follow the closed tree |
| `node scripts/run-gates.mjs` | All of the above, sequentially |

All gates run on Node ≥ 18 with no dependencies and resolve the repository root from their own location.

## Differences from the source project

The template drops the `.i18n.yaml` sidecars, generated catalogs, translation-pairing machinery, and TypeScript-specific gates of the source; the lightweight `verify-doc-pairs` gate replaces the sidecar consistency check. Everything else — the tier taxonomy, the Agent Note lifecycle, the evidence-matching discipline — is preserved in language-agnostic form.

## Origin and license

Structurally derived from [deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) (MIT); the template text is original. Keep or replace this attribution as your project requires.
