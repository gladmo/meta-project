/**
 * Build-time projection from canonical repository Markdown into VitePress.
 *
 * The generated tree is disposable: sources stay in their owning `docs/`
 * tier, while this adapter rewrites cross-source links for the public site.
 * The same projection also emits a raw-Markdown twin of every route into the
 * build output, so a page's URL, minus any trailing slash, plus `.md` serves
 * it as plain Markdown.
 */

import {
  copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, rmSync, statSync, writeFileSync,
} from 'node:fs'
import { basename, dirname, extname, posix, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { gfmFromMarkdown } from 'mdast-util-gfm'
import { gfm } from 'micromark-extension-gfm'
import { site } from './site.mjs'
import { docsPages, localeCollections, orderedPages } from './docs.mjs'

const websiteRoot = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(websiteRoot, '..')
const generatedRoot = resolve(websiteRoot, '.generated')

/**
 * Resolve the public repository ref used by projected source links.
 *
 * @param environment Build environment containing an optional explicit public ref.
 * @returns The configured public ref.
 */
export function resolveRepositoryRef(environment) {
  return environment.DOCS_REPOSITORY_REF ?? site.repositoryRef
}

/** Parse GitHub-flavored Markdown with the site's standard extensions. */
function parseMarkdown(source) {
  return fromMarkdown(source, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] })
}

/** Whether a Markdown URL is external, repository-root absolute, or purely in-page. */
function isExternalOrAbsoluteMarkdownUrl(url) {
  return url.startsWith('#')
    || url.startsWith('//')
    || url.startsWith('/')
    || /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)
}

/** Split one Markdown URL without normalizing its query or fragment suffix. */
function splitMarkdownUrlTarget(url) {
  const boundary = url.search(/[?#]/)
  if (boundary === -1) return { path: url, suffix: '' }
  return { path: url.slice(0, boundary), suffix: url.slice(boundary) }
}

function skipWhitespace(source, start) {
  let index = start
  while (/\s/.test(source[index] ?? '')) index += 1
  return index
}

function labelEnd(rawNode) {
  const first = rawNode.indexOf('[')
  if (first === -1) return -1
  let depth = 0
  for (let index = first; index < rawNode.length; index += 1) {
    const char = rawNode[index]
    if (char === '\\') index += 1
    else if (char === '[') depth += 1
    else if (char === ']') {
      depth -= 1
      if (depth === 0) return index
    }
  }
  return -1
}

function destinationRange(rawNode, type) {
  const endOfLabel = labelEnd(rawNode)
  if (endOfLabel === -1) throw new Error(`project: cannot locate label end in ${JSON.stringify(rawNode)}`)
  let start
  if (type === 'definition') {
    const colon = rawNode.indexOf(':', endOfLabel + 1)
    if (colon === -1) throw new Error(`project: cannot locate definition separator in ${JSON.stringify(rawNode)}`)
    start = skipWhitespace(rawNode, colon + 1)
  } else {
    if (rawNode[endOfLabel + 1] !== '(') {
      throw new Error(`project: cannot locate inline destination in ${JSON.stringify(rawNode)}`)
    }
    start = skipWhitespace(rawNode, endOfLabel + 2)
  }
  if (rawNode[start] === '<') {
    for (let index = start + 1; index < rawNode.length; index += 1) {
      if (rawNode[index] === '\\') index += 1
      else if (rawNode[index] === '>') return { start: start + 1, end: index }
    }
    throw new Error(`project: cannot locate angle-bracket destination end in ${JSON.stringify(rawNode)}`)
  }
  let depth = 0
  for (let index = start; index < rawNode.length; index += 1) {
    const char = rawNode[index]
    if (char === '\\') index += 1
    else if (char === '(') depth += 1
    else if (char === ')') {
      if (depth === 0) return { start, end: index }
      depth -= 1
    } else if (/\s/.test(char ?? '') && depth === 0) {
      return { start, end: index }
    }
  }
  return { start, end: rawNode.length }
}

/** Locate one parsed destination in the original Markdown without reserializing it. */
function markdownDestination(source, node) {
  const start = node.position?.start.offset
  const end = node.position?.end.offset
  if (start === undefined || end === undefined) {
    throw new Error(`project: destination ${JSON.stringify(node.url)} has no source offsets`)
  }
  const range = destinationRange(source.slice(start, end), node.type)
  const absolute = { start: start + range.start, end: start + range.end }
  return { ...absolute, url: source.slice(absolute.start, absolute.end) }
}

/** One `{ start, end, value }` source replacement collected while rewriting. */

function repoPath(absPath, repoRoot) {
  return relative(repoRoot, absPath).split(sep).join('/')
}

function decodePath(path) {
  try {
    return decodeURIComponent(path)
  } catch {
    throw new Error(`project: malformed percent escape in ${JSON.stringify(path)}.`)
  }
}

function routeTarget(fromRoute, toRoute, suffix) {
  const target = posix.relative(posix.dirname(fromRoute), toRoute)
  return `${target.startsWith('.') ? target : `./${target}`}${suffix}`
}

function sourceMap(pages) {
  const map = new Map()
  for (const page of pages) {
    for (const source of [page.source, ...(page.sourceAliases ?? [])]) {
      const localized = map.get(source) ?? new Map()
      if (localized.has(page.locale)) {
        throw new Error(`project: duplicate source or alias ${JSON.stringify(source)} for locale ${JSON.stringify(page.locale)}.`)
      }
      localized.set(page.locale, page)
      map.set(source, localized)
    }
  }
  return map
}

function counterpartSource(source) {
  return source.endsWith('.zh.md')
    ? source.replace(/\.zh\.md$/, '.md')
    : source.replace(/\.md$/, '.zh.md')
}

function resolveRepositoryTarget(sourceAbs, rawPath, repoRoot) {
  const decoded = decodePath(rawPath)
  let absPath = resolve(dirname(sourceAbs), decoded)
  if (existsSync(absPath)) return { absPath }

  const lineMatch = decoded.match(/:(\d+)$/)
  if (lineMatch !== null) {
    const lineText = lineMatch[1]
    if (lineText === undefined) throw new Error('project: line suffix matched without a line number.')
    absPath = resolve(dirname(sourceAbs), decoded.slice(0, -lineMatch[0].length))
    if (existsSync(absPath)) return { absPath, line: Number.parseInt(lineText, 10) }
  }

  if (extname(decoded) === '') {
    const markdown = resolve(dirname(sourceAbs), `${decoded}.md`)
    if (existsSync(markdown)) return { absPath: markdown }
    const index = resolve(dirname(sourceAbs), decoded, 'index.md')
    if (existsSync(index)) return { absPath: index }
  }

  throw new Error(`project: ${repoPath(sourceAbs, repoRoot)} links to missing path ${JSON.stringify(rawPath)}.`)
}

/** Owner/repo pair of the configured repository URL, for raw file links. */
function repositorySlug() {
  const pathname = new URL(site.repositoryUrl).pathname
  return pathname.replace(/^\//, '').replace(/\.git$/, '')
}

function githubTarget(absPath, line, suffix, repositoryRef, repoRoot, image) {
  const path = repoPath(absPath, repoRoot)
  if (image) return `${site.rawFileBase}/${repositorySlug()}/${repositoryRef}/${path}${suffix}`
  const kind = lstatSync(absPath).isDirectory() ? 'tree' : 'blob'
  const lineSuffix = line === undefined ? suffix : `#L${line}`
  return `${site.repositoryUrl}/${kind}/${repositoryRef}/${path}${lineSuffix}`
}

/**
 * Rewrite repository-relative links without reserializing Markdown.
 *
 * `options` carries `locale`, `sourcePath`, `route`, `pages`, `repoRoot`,
 * `repositoryRef`, and an optional `placeImage(absPath)` callback. A
 * referenced image that the build may publish travels into the generated tree
 * beside the page; a GitHub raw URL cannot serve a private repository, and no
 * reader of the site is authenticated to it.
 *
 * @returns Markdown whose published links resolve inside the site or to GitHub.
 */
export function rewriteMarkdown(source, options) {
  const sourceAbs = resolve(options.repoRoot, options.sourcePath)
  const published = sourceMap(options.pages)
  const tree = parseMarkdown(source)
  const replacements = []

  const rewrite = (node) => {
    if (isExternalOrAbsoluteMarkdownUrl(node.url)) return
    const { path, suffix } = splitMarkdownUrlTarget(node.url)
    if (path === '') return
    const { absPath, line } = resolveRepositoryTarget(sourceAbs, path, options.repoRoot)
    const targetPath = repoPath(absPath, options.repoRoot)
    const isLanguageSwitcher = targetPath === counterpartSource(options.sourcePath)
    const targetLocale = isLanguageSwitcher
      ? options.locale === 'root' ? 'en' : 'root'
      : options.locale
    const page = published.get(targetPath)?.get(targetLocale)
    let nextUrl
    if (page !== undefined) {
      nextUrl = routeTarget(options.route, page.route, suffix)
    } else if (node.type === 'image' && options.placeImage !== undefined) {
      // The suffix rides along exactly as the repository keeps it: an SVG
      // view fragment or a Vite query changes what the reference means.
      nextUrl = `${options.placeImage(absPath)}${suffix}`
    } else {
      nextUrl = githubTarget(absPath, line, suffix, options.repositoryRef, options.repoRoot, node.type === 'image')
    }

    const destination = markdownDestination(source, node)
    replacements.push({ start: destination.start, end: destination.end, value: nextUrl })
  }

  const visit = (node) => {
    if ((node.type === 'link' || node.type === 'image' || node.type === 'definition') && 'url' in node) rewrite(node)
    if ('children' in node) {
      for (const child of node.children) visit(child)
    }
  }
  visit(tree)

  let projected = source
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    projected = projected.slice(0, replacement.start) + replacement.value + projected.slice(replacement.end)
  }
  return projected
}

/**
 * Record the canonical edit target in VitePress frontmatter.
 *
 * @param markdown Projected Markdown content.
 * @param page Publication manifest entry for the content.
 * @returns Markdown with projection-owned frontmatter fields.
 */
export function addProjectionFrontmatter(markdown, page) {
  const fields = [
    `editSource: ${JSON.stringify(page.source)}`,
    ...(page.outline === undefined ? [] : [`outline: ${JSON.stringify(page.outline)}`]),
  ].join('\n')
  if (markdown.startsWith('---\n')) return markdown.replace('---\n', `---\n${fields}\n`)
  return `---\n${fields}\n---\n\n${markdown}`
}

/** The switcher line a canonical page carries so its GitHub reader can reach the other language. */
const LANGUAGE_SWITCHER = /^(?:English \| \[中文\]\([^)]*\)|\[English\]\([^)]*\) \| 中文)$/

/**
 * Drop the language-switcher line that addresses a canonical page's GitHub
 * reader; the site carries a locale switcher in its navigation bar, so
 * projecting the line would repeat it as the first element under each
 * heading. Only a switcher introducing the page qualifies; further down, the
 * same text is prose or a sample rather than the page's own header.
 */
function withoutRepositoryChrome(markdown) {
  const lines = markdown.split('\n')
  const switcher = lines.findIndex(line => LANGUAGE_SWITCHER.test(line))
  if (switcher !== -1 && switcher < 8) {
    lines.splice(switcher, lines[switcher + 1] === '' ? 2 : 1)
  }
  return lines.join('\n')
}

/**
 * The Markdown rendered for one published page: the rewritten canonical
 * content minus its repository chrome.
 */
export function projectedPageContent(markdown, _page) {
  return withoutRepositoryChrome(markdown)
}

/** realpath of each repoRoot seen, so the per-image fence check does not repeat the synchronous resolution. */
const realRoots = new Map()

/**
 * The repository file one image reference resolves to, or `undefined` when the
 * target is not a local file this build may publish. Publication copies the
 * bytes into the site, so a reference escaping the repository — or a symlink
 * pointing out of the tree — would put a build-machine file on the site;
 * `existsSync` alone, which is all link resolution needs, does not answer
 * that. Both sides are realpath'd, so a checkout reached through a symlinked
 * path (a linked worktree, /tmp on macOS) compares equal to its files.
 */
export function publishableImage(absPath, repoRoot) {
  const real = realpathSync(absPath)
  let realRoot = realRoots.get(repoRoot)
  if (realRoot === undefined) {
    realRoot = realpathSync(repoRoot)
    realRoots.set(repoRoot, realRoot)
  }
  const inside = real === realRoot || real.startsWith(`${realRoot}${sep}`)
  return inside && statSync(real).isFile() ? real : undefined
}

/** Every local image a published page references, resolved to its repository file. */
function referencedImages() {
  const found = new Set()
  for (const page of docsPages) {
    const sourceAbs = resolve(root, page.source)
    if (!existsSync(sourceAbs)) continue
    rewriteMarkdown(readFileSync(sourceAbs, 'utf8'), {
      sourcePath: page.source,
      locale: page.locale,
      route: page.route,
      pages: docsPages,
      repoRoot: root,
      repositoryRef: site.repositoryRef,
      placeImage: (absPath) => {
        const real = publishableImage(absPath, root)
        if (real !== undefined) found.add(real)
        return ''
      },
    })
  }
  return [...found]
}

/**
 * Files watched by the local VitePress dev server: every canonical Markdown
 * source, plus the images they publish. Without the images, replacing a
 * screenshot leaves the previous copy in the generated tree until something
 * touches the Markdown beside it.
 */
export function docsSourceFiles() {
  return [...new Set([...docsPages.map(page => resolve(root, page.source)), ...referencedImages()])]
}

/**
 * Project every page and its images into one target tree.
 *
 * `entries` are what gets emitted; link resolution always reads the canonical
 * `context.pages`, so an alias entry sharing a source with its index route
 * emits at its own path while links keep targeting canonical routes.
 */
function projectPagesInto(targetRoot, context, pageContent, entries = context.pages) {
  const routes = new Set()
  /** Projected path to the repository file that claimed it, pages and images alike. */
  const claimed = new Map()

  /** Reserve one projected path, refusing a second source for it. */
  const claim = (target, sourceAbs) => {
    const holder = claimed.get(target)
    if (holder !== undefined && holder !== sourceAbs) {
      throw new Error(
        `project: ${repoPath(sourceAbs, context.repoRoot)} and ${repoPath(holder, context.repoRoot)}`
        + ` both project to ${relative(targetRoot, target).split(sep).join('/')}.`,
      )
    }
    // A file the projection did not claim is another producer's output — in
    // the twin pass, the build VitePress just wrote, including `public/`
    // copies. Overwriting one would silently corrupt the site.
    if (holder === undefined && existsSync(target)) {
      throw new Error(
        `project: ${repoPath(sourceAbs, context.repoRoot)} would overwrite existing build file`
        + ` ${relative(targetRoot, target).split(sep).join('/')}.`,
      )
    }
    claimed.set(target, sourceAbs)
  }

  for (const page of entries) {
    if (routes.has(page.route)) throw new Error(`project: duplicate route ${JSON.stringify(page.route)}.`)
    routes.add(page.route)
    const sourceAbs = resolve(context.repoRoot, page.source)
    if (!existsSync(sourceAbs) || !lstatSync(sourceAbs).isFile()) {
      throw new Error(`project: source ${JSON.stringify(page.source)} does not exist or is not a file.`)
    }
    const output = resolve(targetRoot, page.route)
    // Claimed before the images are placed: a page and an image landing on one
    // path would otherwise overwrite each other in whichever order they ran.
    claim(output, sourceAbs)
    mkdirSync(dirname(output), { recursive: true })
    const markdown = readFileSync(sourceAbs, 'utf8')
    const projected = rewriteMarkdown(markdown, {
      sourcePath: page.source,
      locale: page.locale,
      route: page.route,
      pages: context.pages,
      repoRoot: context.repoRoot,
      repositoryRef: context.repositoryRef,
      placeImage: (absPath) => {
        const real = publishableImage(absPath, context.repoRoot)
        if (real === undefined) {
          throw new Error(
            `project: ${page.source} references image ${repoPath(absPath, context.repoRoot)},`
            + ' which is not a regular file inside the repository.',
          )
        }
        // Beside the page that references it, under its own basename: each
        // locale's route tree gets its own copy, so one relative URL is
        // correct from both.
        const name = basename(real)
        const target = resolve(dirname(output), name)
        claim(target, real)
        copyFileSync(real, target)
        // Encoded because the destination is a Markdown inline target, where an
        // unescaped space would end it early.
        return `./${encodeURI(name)}`
      },
    })
    writeFileSync(output, pageContent(projected, page))
  }
}

/**
 * Manifest and repository inputs for one projection pass: `pages`, `repoRoot`
 * (every source and placed image must live under it), and `repositoryRef`
 * (public ref used by projected GitHub links).
 */
function defaultProjectionContext() {
  return { pages: docsPages, repoRoot: root, repositoryRef: resolveRepositoryRef(process.env) }
}

/** Rebuild the disposable VitePress source tree from the publication manifest. */
export function projectDocs() {
  rmSync(generatedRoot, { recursive: true, force: true })
  projectPagesInto(generatedRoot, defaultProjectionContext(), (markdown, page) =>
    addProjectionFrontmatter(projectedPageContent(markdown, page), page))
}

/**
 * Strip the leading YAML frontmatter of a projected page.
 *
 * @param markdown Rewritten canonical Markdown content.
 * @param source Repository-relative page source, named by the failure.
 * @returns The content after the frontmatter block, or the input when none opens it.
 */
function withoutFrontmatter(markdown, source) {
  if (!markdown.startsWith('---\n')) return markdown
  const closingDelimiter = '\n---\n'
  const closing = markdown.indexOf(closingDelimiter, 4)
  if (closing === -1) {
    throw new Error(`project: ${JSON.stringify(source)} has unclosed YAML frontmatter.`)
  }
  return markdown.slice(closing + closingDelimiter.length).replace(/^\n+/, '')
}

/**
 * The raw-Markdown twin of one published page: frontmatter is VitePress
 * rendering configuration and is dropped, and repository chrome is removed.
 *
 * @param markdown Rewritten canonical Markdown content.
 * @param source Repository-relative page source, named by frontmatter failures.
 * @returns Plain Markdown without frontmatter or repository chrome.
 */
export function rawMarkdownPageContent(markdown, source) {
  return withoutRepositoryChrome(withoutFrontmatter(markdown, source))
}

/**
 * Parent-level alias route of an index route, or `undefined` for other routes.
 *
 * The rendered site shows an index route as a directory URL, so "append
 * `.md`" naturally lands on `<dir>.md` once the trailing slash is dropped.
 * The root `index.md` has no parent to alias into.
 */
function indexAliasRoute(route) {
  const match = /^(.+)\/index\.md$/.exec(route)
  return match?.[1] === undefined ? undefined : `${match[1]}.md`
}

/**
 * Emit the raw-Markdown twin of every published route into a built site, so
 * static hosting serves the page's URL, minus any trailing slash, plus `.md`
 * as plain Markdown. Each index route also emits a parent-level alias twin,
 * projected over the alias route so its relative links stay correct.
 * Referenced images are copied beside the pages, keeping the same relative
 * URLs valid in both trees. Existing build files stay in place, and a name
 * collision with one fails the emission.
 *
 * @param outDir Build output directory to emit into.
 */
export function emitRawMarkdownPages(outDir) {
  const context = defaultProjectionContext()
  const aliases = context.pages.flatMap((page) => {
    const alias = indexAliasRoute(page.route)
    return alias === undefined ? [] : [{ ...page, route: alias }]
  })
  projectPagesInto(
    outDir,
    context,
    (markdown, page) => rawMarkdownPageContent(markdown, page.source),
    [...context.pages, ...aliases],
  )
}

/**
 * Raw Markdown served for one site route.
 *
 * Dev-server counterpart of {@link emitRawMarkdownPages}: an index route also
 * serves its parent-level alias twin (`reference/cookbook.md` for
 * `reference/cookbook/index.md`), projected over the alias route so its
 * relative links stay as correct as the emitted twin's. The generated tree
 * serves an image only beside the canonical page, so image links carry the
 * hop from the requested route's directory back to the canonical page's —
 * empty for a canonical route, whose links stay exactly as before.
 *
 * @param route Manifest route or the parent-level alias of an index route, including the `.md` suffix.
 * @returns The projected page, or `undefined` when the manifest publishes neither.
 */
export function rawMarkdownRoute(route) {
  const context = defaultProjectionContext()
  const page = context.pages.find(candidate => candidate.route === route)
    ?? context.pages.find(candidate => indexAliasRoute(candidate.route) === route)
  if (page === undefined) return undefined
  const markdown = readFileSync(resolve(context.repoRoot, page.source), 'utf8')
  const imageDir = posix.relative(posix.dirname(route), posix.dirname(page.route))
  return rawMarkdownPageContent(rewriteMarkdown(markdown, {
    sourcePath: page.source,
    locale: page.locale,
    route,
    pages: context.pages,
    repoRoot: context.repoRoot,
    repositoryRef: context.repositoryRef,
    placeImage: absPath => `./${encodeURI(posix.join(imageDir, basename(absPath)))}`,
  }), page.source)
}

// llmsTxt() receives the site identity — `base`, `title`, `description` — from its caller.

/** Locale groups llms.txt lists, in the order the site's navigation presents them. */
const llmsTxtLocales = [
  { heading: '简体中文', locale: 'root' },
  { heading: 'English', locale: 'en' },
]

/**
 * The llms.txt index of every published page's raw-Markdown twin.
 *
 * Links are site-absolute so an agent resolves them against the host it
 * fetched llms.txt from; locale home pages stay out because this file is the
 * agent-facing entry point itself.
 *
 * @param site Site identity and base path.
 * @returns llms.txt content listing both locale trees.
 */
export function llmsTxt(target) {
  const lines = [
    `# ${target.title}`,
    '',
    `> ${target.description}`,
    '',
    '页面 URL 去掉末尾斜杠再加 `.md` 即为该页原始 Markdown(根路径用 `/index.md`);下方列表是各页精确地址。Drop any trailing slash and append `.md` to a page URL for its raw Markdown (the site root is `/index.md`); the list below carries the exact addresses.',
  ]
  for (const { heading, locale } of llmsTxtLocales) {
    lines.push('', `## ${heading}`, '')
    for (const collection of localeCollections[locale]) {
      for (const page of orderedPages(locale, collection)) {
        lines.push(`- [${page.label}](${target.base}${page.route}): ${page.section}`)
      }
    }
  }
  return `${lines.join('\n')}\n`
}
