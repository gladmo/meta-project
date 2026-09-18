# Glossary

English | [中文](glossary.zh.md)

The closed vocabulary this repository uses in documentation, code review, and decision records. Add a term when prose starts leaning on it; keep definitions to one line and link the owning document.

<!-- TODO(template): seed this table with the project's own domain terms. The rows below are the template's working vocabulary; keep or adapt them. -->

| Term | Definition |
|---|---|
| Standing order | A one-to-three-line rule in an `AGENTS.md` that links the document owning the full contract |
| Tier | One row of the documentation taxonomy; each fact has exactly one owning tier ([standard](AGENTS.md)) |
| Agent Note | An RFC-style decision record with lifecycle, classification, and mandatory alternatives ([rules](../.agents/notes/README.md)) |
| Gate | A deterministic zero-dependency check under `scripts/`, aggregated by `run-gates` |
| Skill | A reusable agent workflow under `.agents/skills/` with YAML frontmatter |
| Postmortem | A numbered incident record; the only tier where narrative belongs ([rules](postmortem/README.md)) |
| Supersession check | The search for older Agent Notes a new note replaces, required on every new note ([rule](../.agents/notes/AGENTS.md)) |
