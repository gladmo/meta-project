/**
 * Site identity and repository links — the single placeholder home for the
 * website tier. The values below describe this template repository so the
 * site builds out of the box. TODO(template): replace them with the applying
 * project's identity; the projector, the edit links, and the GitHub
 * fallbacks all read from here.
 */

/** Public identity of the documentation site. */
export const site = {
  /** Site title shown in the navigation bar and written into llms.txt. */
  title: 'meta-project',
  /** One-line site description (Chinese is conventional for the root locale). */
  description: '面向 AI 智能体协作仓库的脚手架',
  /** Canonical public repository URL; edit links and link fallbacks build on it. */
  repositoryUrl: 'https://github.com/gladmo/meta-project',
  /** Base URL of the repository host's raw-file endpoint, for image links the site does not publish; kept beside `repositoryUrl` so switching forges moves both. */
  rawFileBase: 'https://raw.githubusercontent.com',
  /** Public ref the site links repository files against; DOCS_REPOSITORY_REF overrides it per build. */
  repositoryRef: 'master',
  /** Site base path with leading and trailing slashes; DOCS_BASE overrides it per build. */
  base: '/',
}
