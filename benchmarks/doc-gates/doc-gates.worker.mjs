// Measured workload for the documentation-gate benchmark: the corpus pass
// every Markdown gate performs — walk the documents, read each one, and run
// the shared production analyzer over its text. Runs as one fresh plain-Node
// process per sample and reports one JSON line.

import { mkdtemp, rm } from 'node:fs/promises'
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

/** Heap in MiB after two collections separated by an event-loop yield. */
async function collectedHeapMiB() {
  if (typeof globalThis.gc !== 'function') throw new Error('doc-gates benchmark requires --expose-gc')
  globalThis.gc()
  await new Promise(resolve => setImmediate(resolve))
  globalThis.gc()
  return process.memoryUsage().heapUsed / 1048576
}

const root = await mkdtemp(join(tmpdir(), 'benchmark-doc-gates-'))
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
