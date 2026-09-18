/** VitePress configuration for the locally projected documentation site. */

import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { site } from '../site.mjs'
import { landingLink, orderedPages, routeLink, sectionSpec } from '../docs.mjs'
import { docsSourceFiles, emitRawMarkdownPages, llmsTxt, projectDocs, rawMarkdownRoute, resolveRepositoryRef } from '../project.mjs'

projectDocs()

/**
 * Sidebar groups for one collection: `orderedPages` already sorts by section
 * placement, so insertion order carries the group order and each group keeps
 * its pages in sequence. A present `collapsed` is what makes the default
 * theme render the group as collapsible at all, so an open group omits it.
 */
function sidebar(locale, collection) {
  const groups = new Map()
  for (const page of orderedPages(locale, collection)) {
    const entries = groups.get(page.section) ?? []
    entries.push(page)
    groups.set(page.section, entries)
  }
  return [...groups.entries()].map(([text, entries]) => {
    const { collapsed } = sectionSpec(locale, text)
    return {
      text,
      ...(collapsed === undefined ? {} : { collapsed }),
      items: entries.map(page => ({ text: page.label, link: routeLink(page.route) })),
    }
  })
}

/**
 * Per-locale module facts shared by the navigation bar and the sidebar
 * mapping: one entry per sidebar collection, with the route prefix its pages
 * live under. A new manifest collection needs one entry here.
 */
const modules = {
  root: [{ label: '参考', collection: 'zh-reference', prefix: '/reference/' }],
  en: [{ label: 'Reference', collection: 'en-reference', prefix: '/en/reference/' }],
}

function watchCanonicalDocs(server) {
  const sources = docsSourceFiles()
  server.watcher.add(sources)
  server.watcher.on('change', (changed) => {
    if (!sources.includes(changed)) return
    projectDocs()
  })
}

/**
 * Serve the raw-Markdown twin of each route and llms.txt during development,
 * matching what `buildEnd` emits into the static build. Pages project from
 * their canonical sources per request, so an edit shows without a rebuild.
 */
function serveRawMarkdown(server) {
  server.middlewares.use((req, res, next) => {
    if (req.url === undefined || (req.method !== 'GET' && req.method !== 'HEAD')) {
      next()
      return
    }
    // The dev client imports page modules at these same `.md` URLs, and a
    // module script must reach Vite's transform. Browsers declare the purpose:
    // `script` for module imports, `document` for address-bar navigation.
    // Header-less clients (curl, agents) read the raw twin. In-page fetch()
    // (`empty`) also passes to Vite — a deliberate dev-only divergence that
    // keeps Vite's own requests unbroken, while production static hosting
    // answers such a fetch with the raw file.
    const fetchDest = req.headers['sec-fetch-dest']
    if (fetchDest !== undefined && fetchDest !== 'document') {
      next()
      return
    }
    const pathname = req.url.split(/[?#]/, 1)[0] ?? ''
    const sitePath = pathname.startsWith(base) ? pathname.slice(base.length) : pathname.replace(/^\//, '')
    if (sitePath === 'llms.txt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(llmsTxt({ base, ...siteIdentity }))
      return
    }
    const content = sitePath.endsWith('.md') ? rawMarkdownRoute(sitePath) : undefined
    if (content === undefined) {
      next()
      return
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.end(content)
  })
}

/**
 * Escape Vue interpolation in rendered text. VitePress compiles Markdown
 * prose as a Vue template, where `{{...}}` template tokens from the canonical
 * pages would otherwise parse as interpolations — valid ones resolve against
 * nothing and invalid ones (prose inside the braces) fail the build.
 */
function escapeVueInterpolation(html) {
  return html.replaceAll('{{', '&#123;&#123;').replaceAll('}}', '&#125;&#125;')
}

/** Site base path, carrying the leading and trailing slashes VitePress requires. */
const base = process.env.DOCS_BASE ?? site.base

/** Site identity shared by the VitePress configuration and the llms.txt index. */
const siteIdentity = {
  title: site.title,
  description: site.description,
}

/**
 * GitHub edit link for the canonical source a page was projected from.
 *
 * VitePress serializes `editLink.pattern` into the client build and re-evals
 * it there, so it must be self-contained: the repository URL and ref are
 * interpolated into the function body at configuration time instead of
 * closing over this module.
 *
 * @throws When a projected page lacks its `editSource` frontmatter.
 */
function editLinkPattern() {
  const prefix = JSON.stringify(`${site.repositoryUrl}/edit/${resolveRepositoryRef(process.env)}/`)
  return new Function('page', `
    const frontmatter = page.frontmatter
    const editSource = typeof frontmatter === 'object' && frontmatter !== null ? Reflect.get(frontmatter, 'editSource') : undefined
    if (typeof editSource !== 'string') throw new Error('Projected documentation page has no editSource frontmatter.')
    return ${prefix} + editSource
  `)
}

export default {
  title: siteIdentity.title,
  description: siteIdentity.description,
  base,
  /** Emit the raw-Markdown twin of every route plus llms.txt beside the rendered site. */
  buildEnd(siteConfig) {
    emitRawMarkdownPages(siteConfig.outDir)
    writeFileSync(resolve(siteConfig.outDir, 'llms.txt'), llmsTxt({ base, ...siteIdentity }))
  },
  head: [
    // VitePress leaves head hrefs untouched, so the base belongs here explicitly.
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}favicon.svg` }],
  ],
  cleanUrls: true,
  srcDir: '.generated',
  cacheDir: '.cache',
  outDir: '.dist',
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      themeConfig: {
        nav: modules.root.map(({ label, collection, prefix }) => (
          { text: label, link: landingLink('root', collection), activeMatch: `^${prefix}` }
        )),
        sidebar: Object.fromEntries(modules.root.map(({ collection, prefix }) => [prefix, sidebar('root', collection)])),
        editLink: { pattern: editLinkPattern(), text: '在 GitHub 上编辑此页' },
        outline: { label: '本页目录' },
        docFooter: { prev: '上一篇', next: '下一篇' },
        darkModeSwitchLabel: '外观',
        lightModeSwitchTitle: '切换到浅色主题',
        darkModeSwitchTitle: '切换到深色主题',
        sidebarMenuLabel: '菜单',
        returnToTopLabel: '返回顶部',
        langMenuLabel: '切换语言',
        skipToContentLabel: '跳至内容',
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: modules.en.map(({ label, collection, prefix }) => (
          { text: label, link: landingLink('en', collection), activeMatch: `^${prefix}` }
        )),
        sidebar: Object.fromEntries(modules.en.map(({ collection, prefix }) => [prefix, sidebar('en', collection)])),
        editLink: { pattern: editLinkPattern(), text: 'Edit this page on GitHub' },
        outline: { label: 'On this page' },
        docFooter: { prev: 'Previous', next: 'Next' },
      },
    },
  },
  vite: {
    // `srcDir` puts the Vite root inside the disposable generated tree, whose
    // own `public/` no tracked asset can live in.
    publicDir: fileURLToPath(new URL('../public', import.meta.url)),
    plugins: [
      {
        name: 'documentation-projector',
        configureServer(server) {
          watchCanonicalDocs(server)
          serveRawMarkdown(server)
        },
      },
    ],
  },
  markdown: {
    config(md) {
      const renderText = md.renderer.rules.text
      const renderCode = md.renderer.rules.code_inline
      if (renderText === undefined) throw new Error('VitePress Markdown renderer is missing the text rendering rule.')
      if (renderCode === undefined) throw new Error('VitePress Markdown renderer is missing the inline-code rendering rule.')
      md.renderer.rules.text = (...args) => escapeVueInterpolation(renderText(...args))
      md.renderer.rules.code_inline = (...args) => escapeVueInterpolation(renderCode(...args))
    },
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                displayDetails: '显示详细列表',
                resetButtonTitle: '清除搜索',
                backButtonTitle: '关闭搜索',
                noResultsText: '未找到相关结果',
                footer: {
                  selectText: '选择',
                  selectKeyAriaLabel: '回车键',
                  navigateText: '切换',
                  navigateUpKeyAriaLabel: '上方向键',
                  navigateDownKeyAriaLabel: '下方向键',
                  closeText: '关闭',
                  closeKeyAriaLabel: 'Esc 键',
                },
              },
            },
          },
        },
      },
    },
    socialLinks: [
      { icon: 'github', link: site.repositoryUrl },
    ],
  },
}
