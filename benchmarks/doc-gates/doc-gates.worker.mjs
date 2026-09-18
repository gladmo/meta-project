// Measured workload for the documentation-gate benchmark: the corpus pass
// every Markdown gate performs — walk the documents, read each one, and run
// the shared production analyzer over its text. Runs as one fresh plain-Node
// process per sample and reports one JSON line.

import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyze, markdownFiles, readRel } from '../../scripts/lib/md.mjs'
import { environmentFacts } from '../support/environment.mjs'
import { assertPlainNodeWorker } from '../support/worker.mjs'
import { DOCUMENT_PAIRS, LINKS_PER_SECTION, SECTIONS_PER_DOCUMENT, expectedEndpoints, writeSyntheticCorpus } from './synthetic-corpus.mjs'

/** The production analyzer the measured path must resolve to, not a copy of it. */
const ANALYZER_ENTRY = fileURLToPath(new URL('../../scripts/lib/md.mjs', import.meta.url))

assertPlainNodeWorker(import.meta.url, { 'scripts/lib/md.mjs': ANALYZER_ENTRY })

/** Corpus-root prefix this case's samples create under the system tmpdir. */
const CORPUS_PREFIX = 'benchmark-doc-gates-'

/**
 * Remove corpus roots abandoned by samples that were SIGKILLed past their
 * deadline: a killed process never runs the `finally` that owns its removal.
 * Only roots idle for over an hour are taken — far beyond one sample's
 * 60 s budget, so a concurrently running sample's root is never touched.
 * Best-effort throughout: a stale root this process cannot list or delete
 * must not fail the samples the cleanup was meant to unblock.
 */
async function removeAbandonedCorpusRoots() {
  const thresholdMs = 60 * 60 * 1000
  const entries = await readdir(tmpdir()).catch(() => [])
  for (const entry of entries) {
    if (!entry.startsWith(CORPUS_PREFIX)) continue
    const path = join(tmpdir(), entry)
    const stats = await stat(path).catch(() => undefined)
    if (stats?.isDirectory() === true && Date.now() - stats.mtimeMs >= thresholdMs) {
      await rm(path, { recursive: true, force: true }).catch(() => undefined)
    }
  }
}

/** Heap in MiB after two collections separated by an event-loop yield. */
async function collectedHeapMiB() {
  if (typeof globalThis.gc !== 'function') throw new Error('doc-gates benchmark requires --expose-gc')
  globalThis.gc()
  await new Promise(resolve => setImmediate(resolve))
  globalThis.gc()
  return process.memoryUsage().heapUsed / 1048576
}

await removeAbandonedCorpusRoots()
const root = await mkdtemp(join(tmpdir(), CORPUS_PREFIX))
try {
  const corpus = await writeSyntheticCorpus(root)
  const baselineHeapMiB = await collectedHeapMiB()
  const started = process.hrtime.bigint()
  const documents = markdownFiles(root)
  const parsed = documents.map(relative => analyze(readRel(root, relative)))
  const wallMs = Number(process.hrtime.bigint() - started) / 1e6
  const retainedHeapMiB = await collectedHeapMiB() - baselineHeapMiB
  const endpoints = {
    documents: documents.length,
    headings: parsed.reduce((total, document) => total + document.headings.length, 0),
    links: parsed.reduce((total, document) => total + document.links.length, 0),
    wrapViolations: parsed.reduce((total, document) => total + document.wrapViolations.length, 0),
  }
  for (const [endpoint, expected] of Object.entries(expectedEndpoints())) {
    if (endpoints[endpoint] !== expected) {
      throw new Error(`measured ${endpoint}=${String(endpoints[endpoint])}, expected ${String(expected)}: the pass did not cover the fixture`)
    }
  }
  console.log(`doc-gates: ${wallMs.toFixed(1)} ms over ${String(corpus.files)} files / ${String(corpus.lines)} lines, ${retainedHeapMiB.toFixed(1)} MiB retained`)
  console.log(JSON.stringify({
    case: 'doc-gates',
    workload: {
      documentPairs: DOCUMENT_PAIRS,
      sectionsPerDocument: SECTIONS_PER_DOCUMENT,
      linksPerSection: LINKS_PER_SECTION,
      files: corpus.files,
      lines: corpus.lines,
    },
    endpoints,
    wallMs,
    retainedHeapMiB,
    baselineHeapMiB,
    environment: environmentFacts(),
  }))
} finally {
  await rm(root, { recursive: true, force: true })
}
