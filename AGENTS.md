# AGENTS.md

{{PROJECT_NAME}} — {{PROJECT_DESC}}. Read [docs/architecture.md](docs/architecture.md) before changing {{PRIMARY_SOURCE_DIR}}; follow [docs/AGENTS.md](docs/AGENTS.md) for documentation.

<!-- TODO(template): replace {{PROJECT_NAME}}, {{PROJECT_DESC}}, and {{PRIMARY_SOURCE_DIR}}, then delete every TODO(template) marker with `grep -r "TODO(template)"`. -->

## Stability

<!-- TODO(template): state the API-stability contract (pre-stable, semver, or frozen) and what a breaking change must update, or delete this section. -->

## Repository layout

<!-- TODO(template): edit the tree to match this repository; one line per entry, most-important first. -->

```
docs/        Documentation; the tier standard lives in docs/AGENTS.md
scripts/     Zero-dependency verification gates (scripts/AGENTS.md)
.agents/     Agent workflows and decision records (.agents/notes/README.md)
benchmarks/  Optional performance lane: one directory per measured user path (benchmarks/AGENTS.md)
website/     Optional VitePress documentation site (website/AGENTS.md)
```

## Commands

<!-- TODO(template): keep the minimal daily set an agent needs; CI owns the exhaustive matrix. -->

```sh
{{INSTALL_COMMAND}}          # install dependencies
{{TEST_COMMAND}}             # unit tests
{{LINT_COMMAND}}             # lint
{{TYPECHECK_COMMAND}}        # typecheck / static analysis
{{BUILD_COMMAND}}            # build
node scripts/run-gates.mjs   # commit hygiene, documentation, and decision-record gates
node benchmarks/run.mjs      # performance lane: fresh processes, not part of run-gates
```

### Run relevant checks locally

Before pushing, follow [pre-push-checks](.agents/skills/pre-push-checks/SKILL.md) and report only the commands you ran. Match evidence to the surface: focused behavior tests for code, the owning case under [benchmarks/](benchmarks/AGENTS.md) for a measured path, `run-gates` for docs and Agent Notes, built smokes for published artifacts, real-API e2e for external providers. Never default to the full suite; CI owns exhaustive coverage and the platform matrix.

## Secrets / .env

Never commit credentials. Tests that require secrets self-skip when they are absent; [docs/testing.md](docs/testing.md) owns the key policy.

<!-- TODO(template): list the environment variables real-API tests read (and optional base URLs), plus any packaging or signing credential locations. -->

## Conventions

- **One home per fact.** State a rule once at its owning tier and link there; [docs/AGENTS.md](docs/AGENTS.md) owns the tier table.
- **Durable decisions get an [Agent Note](.agents/notes/README.md)** recording the why, the alternatives considered, and the consequences; mechanical edits are exempt. Every new note triggers the [supersession check](.agents/notes/AGENTS.md).
- **Registrations are effects.** Every listener, registration, or side effect has a matching cleanup on shutdown; the registration API returns the disposer.
- **Explicit > implicit at boundaries.** Defaulting is one named resolve step in the owning module, never a hidden fallback inside execution logic.
- **Misconfiguration fails loud** at load, or at the earliest resolvable point; never silently skip a missing referent.
- **Switch on discriminant tags;** closed unions end in an exhaustive check.
- **Tests describe behavior, not correctness.** Change obsolete behavior together with its tests and explain why in the PR.
- **Docs accompany every code change:** update the affected README and reference docs in the same commit ([standard](docs/AGENTS.md)).
- **Comments state contracts, not reasoning transcripts.** Keep behavior, failure, timing, ownership, and safe-use facts; delete narration and code restatement.
- TODO markers: `FIXME` / `TODO` / `XXX` by urgency ([semantics](docs/development.md)).
- Files end with exactly one trailing newline.

## Decision records and skills

Decisions live in [Agent Notes](.agents/notes/README.md); reusable agent workflows live in [.agents/skills/](.agents/skills/), and `.claude/skills` symlinks there for Claude Code.

## Editing these instructions

`CLAUDE.md` symlinks this file; edit the real file. Keep each rule self-contained while linking its home; condense when clarity survives. Raise a ceiling in [scripts/doc-budgets.manifest.json](scripts/doc-budgets.manifest.json) only when the content genuinely needs the space, and justify the manifest diff in the PR.
