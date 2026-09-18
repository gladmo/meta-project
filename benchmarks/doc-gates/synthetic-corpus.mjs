// Synthetic bilingual documentation corpus for the documentation-gate
// benchmark. Every input derives from the constants below: no ambient
// repository content, recorded material, or network service supplies input.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

/** `.md` / `.zh.md` pairs written per corpus. */
export const DOCUMENT_PAIRS = 400
/** Sections per document. */
export const SECTIONS_PER_DOCUMENT = 12
/** Markdown links per section. */
export const LINKS_PER_SECTION = 4
/** Corpus directories, so the measured walk recurses instead of listing one flat directory. */
export const TIERS = ['docs', 'docs/cookbook', 'docs/modules', '.agents/notes/implemented']
/** Files the measured walk must ignore: a dependency directory and the instructions symlink target. */
export const DECOYS = ['node_modules/vendored.md', 'CLAUDE.md']

/** Pad a corpus index into the four-digit form its file names and titles use. */
function pad(index) {
  return String(index).padStart(4, '0')
}

/**
 * Endpoint counts the fixture guarantees. The worker compares them against the
 * measured pass, so a workload that skipped documents or counted fenced
 * examples fails loud instead of reporting a fast, wrong sample.
 * @returns {{documents: number, headings: number, links: number, wrapViolations: number}}
 */
export function expectedEndpoints() {
  const documents = DOCUMENT_PAIRS * 2
  return {
    documents,
    headings: documents * (1 + SECTIONS_PER_DOCUMENT),
    links: documents * SECTIONS_PER_DOCUMENT * LINKS_PER_SECTION,
    wrapViolations: documents,
  }
}

/**
 * One document. The English and Chinese sides mirror each other's structure
 * exactly, as a translated pair does: one H1, `SECTIONS_PER_DOCUMENT` H2s,
 * `LINKS_PER_SECTION` links per section, and exactly one paragraph continued
 * onto a second physical line. The fenced block hides one heading-shaped line
 * and one link from the analyzer.
 * @param {number} index Corpus index.
 * @param {boolean} chinese Whether to render the Chinese side of the pair.
 * @returns {string} Document text ending in one newline.
 */
function document(index, chinese) {
  const id = pad(index)
  const lines = [
    `# ${chinese ? '文档' : 'Document'} ${id}`,
    '',
    chinese
      ? '本页描述一个模块的契约：它负责什么、依赖什么，以及读它在扩展点上的行为。'
      : 'This page describes one module contract: what it owns, what it depends on, and how it behaves at its extension points.',
    chinese
      ? '这一段故意续写在第二行，用来让一次完整扫描必然发现一处段落折行。'
      : 'This paragraph deliberately continues onto a second physical line so a complete pass necessarily reports one wrap violation.',
    '',
    '```sh',
    '# a fenced comment is not a heading',
    `- [fenced target](doc-${id}.md)`,
    'node scripts/run-gates.mjs',
    '```',
    '',
    '| Field | Value |',
    '|---|---|',
    `| id | ${id} |`,
    '',
    chinese ? '> 预算以评审过的源码常量为准。' : '> Budgets come from reviewed source constants.',
    '',
  ]
  for (let section = 0; section < SECTIONS_PER_DOCUMENT; section++) {
    lines.push(`## ${chinese ? '小节' : 'Section'} ${section}`, '')
    for (let link = 0; link < LINKS_PER_SECTION; link++) {
      const target = pad((index + section + link + 1) % DOCUMENT_PAIRS)
      lines.push(chinese
        ? `- [目标 ${link}](doc-${target}.md) —— 指向同一语料库中的另一份文档`
        : `- [target ${link}](doc-${target}.md) — points at another document in the same corpus`)
    }
    lines.push('', chinese
      ? `正文段落 ${section}：说明行为、失败方式与所有权，读者据此判断改动落在哪一层。`
      : `Body paragraph ${section}: states behavior, failure mode, and ownership so a reader can place a change in the right tier.`, '')
  }
  return `${lines.join('\n')}\n`
}

/** A decoy document the measured walk must ignore; its shape matches the corpus. */
function decoy() {
  return `${['# Ignored', '', '## Section', '', '- [target](doc-0000.md)', ''].join('\n')}\n`
}

/**
 * Write the corpus into a root the caller owns.
 * @param {string} root Absolute path to the caller's private directory.
 * @returns {Promise<{files: number, lines: number}>} Written pair count and total line count.
 */
export async function writeSyntheticCorpus(root) {
  let lines = 0
  for (let index = 0; index < DOCUMENT_PAIRS; index++) {
    const directory = join(root, TIERS[index % TIERS.length])
    await mkdir(directory, { recursive: true })
    for (const [suffix, chinese] of [['.md', false], ['.zh.md', true]]) {
      const text = document(index, chinese)
      lines += text.split('\n').length - 1
      await writeFile(join(directory, `doc-${pad(index)}${suffix}`), text)
    }
  }
  for (const relative of DECOYS) {
    const path = join(root, relative)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, decoy())
  }
  return { files: DOCUMENT_PAIRS * 2, lines }
}
