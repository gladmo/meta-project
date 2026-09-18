/**
 * Canonical publication manifest for the documentation website.
 *
 * Markdown stays in its owning repository tier. This manifest maps each
 * canonical source into matching route trees for both site locales; when a
 * translation is absent, both routes intentionally project the available
 * source instead of copying Markdown. The root locale is Chinese and projects
 * the `.zh.md` side of each pair; the `en` locale projects the `.md` side.
 */

/** Locale keys used by the VitePress site. */
const locales = ['root', 'en']

/**
 * A manifest entry names a repository-relative `source` Markdown file, the
 * `route` it projects to (including the `.md` suffix), the sidebar `label`
 * and `section` with a stable `order`, and a `sidebar` collection — or null
 * for a locale home page — plus optional `sourceAliases` (additional
 * repository paths resolving to the page) and an `outline` depth override.
 * Entries mirror into both locales; `pairedPages` is the helper for a
 * `.md` / `.zh.md` sibling pair.
 */
/** Mirror one source-backed entry into both locale route trees. */
function mirroredPages(pages) {
  return pages.flatMap(page => locales.map((locale) => {
    const aliases = page.sourceAliases === undefined
      ? []
      : Array.isArray(page.sourceAliases) ? page.sourceAliases : (page.sourceAliases[locale] ?? [])
    const localized = (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value[locale]
      : value
    return {
      locale,
      source: localized(page.source),
      route: locale === 'root' ? page.route : `en/${page.route}`,
      label: page.label[locale],
      sidebar: page.sidebar[locale],
      section: page.section[locale],
      order: page.order,
      ...(page.outline === undefined ? {} : { outline: page.outline }),
      ...(aliases.length === 0 ? {} : { sourceAliases: aliases }),
    }
  }))
}

/**
 * Project a `.md` / `.zh.md` sibling pair: the root locale reads the Chinese
 * side, the `en` locale reads the English side, and each route keeps the
 * other side as a repository alias so language-switcher links resolve.
 */
function pairedPages(pages) {
  return mirroredPages(pages.map((page) => {
    const chineseSource = page.source.replace(/\.md$/, '.zh.md')
    const sharedAliases = page.sourceAliases ?? []
    return {
      ...page,
      source: { root: chineseSource, en: page.source },
      sourceAliases: {
        root: [...sharedAliases, page.source],
        en: [...sharedAliases, chineseSource],
      },
    }
  }))
}

const home = pairedPages([
  {
    source: 'docs/user/index.md',
    route: 'index.md',
    label: { root: '用户指南', en: 'User guide' },
    sidebar: { root: null, en: null },
    section: { root: '首页', en: 'Home' },
    order: 0,
  },
])

/**
 * Reference pages, as `pairedPages` entries. Contributor-facing tiers
 * (development.md, testing.md, modules/, postmortem/) stay repository-only;
 * adding an entry here is what publishes a page.
 */
const reference = pairedPages([
  {
    source: 'docs/architecture.md',
    route: 'reference/architecture.md',
    label: { root: '架构', en: 'Architecture' },
    sidebar: { root: 'zh-reference', en: 'en-reference' },
    section: { root: '概念', en: 'Concepts' },
    order: 1,
  },
  {
    source: 'docs/glossary.md',
    route: 'reference/glossary.md',
    label: { root: '术语表', en: 'Glossary' },
    sidebar: { root: 'zh-reference', en: 'en-reference' },
    section: { root: '概念', en: 'Concepts' },
    order: 2,
  },
  {
    source: 'docs/cookbook/README.md',
    route: 'reference/cookbook/index.md',
    label: { root: '手册', en: 'Cookbook' },
    sidebar: { root: 'zh-reference', en: 'en-reference' },
    section: { root: '手册', en: 'Cookbook' },
    order: 1,
    sourceAliases: ['docs/cookbook'],
  },
  {
    source: 'docs/cookbook/adding-a-module.md',
    route: 'reference/cookbook/adding-a-module.md',
    label: { root: '新增模块', en: 'Adding a module' },
    sidebar: { root: 'zh-reference', en: 'en-reference' },
    section: { root: '手册', en: 'Cookbook' },
    order: 2,
  },
])

/**
 * Sidebar collections of each locale, in the order the site's navigation
 * presents them. The navigation bar and the llms.txt index both read this
 * sequence, so a new collection lands in both surfaces together. A collection
 * must hold at least one page before it can be declared here.
 */
export const localeCollections = {
  root: ['zh-reference'],
  en: ['en-reference'],
}

/** A sidebar group, matched to pages by `label`; `collapsed` renders it collapsed until active. */
const sections = {
  root: [{ label: '概念' }, { label: '手册' }],
  en: [{ label: 'Concepts' }, { label: 'Cookbook' }],
}

/**
 * Placement and collapse behavior of one sidebar group.
 *
 * @throws When the locale declares no placement for the label. Ranking by list
 *   membership alone would sort an undeclared group silently ahead of every
 *   declared one.
 */
export function sectionSpec(locale, label) {
  const declared = sections[locale]
  const section = declared.find(candidate => candidate.label === label)
  if (section === undefined) throw new Error(`Sidebar section "${label}" has no placement in the ${locale} locale.`)
  return { ...section, index: declared.indexOf(section) }
}

/** Every canonical page published by the documentation website. */
export const docsPages = [...home, ...reference]

/**
 * Pages of one sidebar collection, in the order the sidebar lists them:
 * by section placement, then by `order`.
 */
export function orderedPages(locale, collection) {
  return docsPages
    .filter(page => page.locale === locale && page.sidebar === collection)
    .sort((left, right) => (
      sectionSpec(locale, left.section).index - sectionSpec(locale, right.section).index
      || left.order - right.order
    ))
}

/**
 * Site-relative link for a published route.
 *
 * @param route - Manifest route, including its `.md` suffix.
 * @returns The link VitePress serves the route at.
 */
export function routeLink(route) {
  return `/${route.replace(/(?:index)?\.md$/, '')}`
}

/**
 * Where a top-level navigation item lands. The target is derived rather than
 * written down: a collection whose first page is renamed or reordered would
 * otherwise leave the navigation bar pointing at a route the manifest no
 * longer publishes.
 *
 * @throws When the collection publishes no page.
 */
export function landingLink(locale, collection) {
  const first = orderedPages(locale, collection)[0]
  if (first === undefined) throw new Error(`Sidebar collection "${collection}" publishes no page.`)
  return routeLink(first.route)
}
