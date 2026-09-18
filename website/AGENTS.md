# AGENTS.md — Documentation website adapter

Follow the [root instructions](../AGENTS.md) and the [documentation standard](../docs/AGENTS.md).

## Keep documentation content out of this tree

`website/` owns only VitePress configuration, the publication manifest, and presentation assets. This file is the only maintained Markdown file in this subtree.

Canonical prose stays in its owning `docs/` tier; expose selected pages through the manifest in [docs.mjs](docs.mjs). Never add locale, route, or copied documentation trees such as `website/zh/` or `website/en/`.

The projector writes disposable Markdown to the ignored `.generated/` directory. Never edit or commit `.generated/`, `.cache/`, or `.dist/`.

## Commands

```sh
cd website && npm install   # or: pnpm install
npm run dev                 # dev server at 127.0.0.1:5173; docs/ edits re-project live
npm run build               # production build into .dist/ (doubles as a dead-link check)
npm run preview             # serve the production build at 127.0.0.1:4173
```

From the repository root without `cd`: `npm --prefix website run <script>`. The tier carries its own dependencies; the zero-dependency gates under `scripts/` never require them.

## Site behavior

The site has two locales: Chinese at the root path, projected from the `.zh.md` side of each published pair, and English under `/en`, projected from the `.md` side. The manifest in [docs.mjs](docs.mjs) pairs them; `verify-doc-pairs` keeps the sources in step.

Site identity and repository links have one home: [site.mjs](site.mjs). Fill its `TODO(template)` placeholders when applying the scaffold; edit links and GitHub fallbacks derive from them.

Builds emit each route's raw-Markdown twin — a page's URL, minus any trailing slash, plus `.md` — and a root `llms.txt`, into `.dist/` and from the dev server alike. Links to repository files the manifest does not publish resolve to GitHub at build time.

Contributor-facing tiers (development.md, testing.md, modules/, postmortem/) stay repository-only; adding a page to the manifest is what publishes it. Run `node scripts/run-gates.mjs` after changing this subtree — the gates ignore the generated directories.
