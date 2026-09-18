// Benchmark lane. Discovers the `.bench.mjs` cases under this tree and runs
// them one at a time in a fresh child process, so no measurement shares a CPU
// with another case, then aggregates their JSON report lines.
//
//   node benchmarks/run.mjs              run every case
//   node benchmarks/run.mjs doc-gates    run cases matching a name or directory
//   node benchmarks/run.mjs --list       list discovered cases, run nothing
//   node benchmarks/run.mjs --json       emit one JSON document instead of the summary

import { readdirSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { environmentFacts } from './support/environment.mjs'
import { lastReportLine, spawnNodeCollected } from './support/worker.mjs'

/** The benchmarks tree this runner owns. */
const BENCHMARKS_ROOT = fileURLToPath(new URL('.', import.meta.url))
/** Repository root the child cases run from, so their relative paths are stable. */
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
/** Directories that never hold cases. */
const SKIP_DIRS = new Set(['node_modules', 'support'])
/**
 * Deadline for one case, including every sample it takes; a stuck case is
 * killed. Must exceed each case's total worst-case sample time with headroom
 * for corpus synthesis, startup, and cleanup, so a slow case still prints its
 * own failure detail instead of dying here: the current worst case is
 * doc-gates (5 samples × 60 s), sized at 1.25×.
 */
const CASE_TIMEOUT_MS = 375_000
/** One decimal place, for measures whose budget is in milliseconds or MiB. */
const round = value => Math.round(value * 10) / 10

/**
 * Case files under this tree, plus the browser-face files no lane here runs.
 * @returns {{cases: string[], browserCases: string[]}} Absolute case paths.
 */
function discover() {
  const cases = []
  const browserCases = []
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name) && !entry.name.startsWith('.')) walk(join(directory, entry.name))
      } else if (entry.name.endsWith('.bench.mjs')) {
        cases.push(join(directory, entry.name))
      } else if (entry.name.endsWith('.bench.client.mjs')) {
        browserCases.push(join(directory, entry.name))
      }
    }
  }
  walk(BENCHMARKS_ROOT)
  return { cases: cases.sort(), browserCases: browserCases.sort() }
}

/** The case id a file is addressed by: its basename without the `.bench.mjs` suffix. */
function caseId(file) {
  return basename(file, '.bench.mjs')
}

/**
 * Run one case file, capturing its output and the report line it ends with.
 * Shares the lane's spawn-with-deadline core with the per-sample worker
 * launcher; a spawn failure is folded into `stderr` so a case that could not
 * start reads as an ordinary failed case.
 * @param {string} file Absolute case path.
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null, signal: string|null, timedOut: boolean}>} Case outcome.
 */
async function runCase(file) {
  const { error, ...outcome } = await spawnNodeCollected([file], {
    timeoutMs: CASE_TIMEOUT_MS,
    cwd: REPO_ROOT,
  })
  return error === undefined ? outcome : { ...outcome, stderr: `${outcome.stderr}${String(error)}` }
}

const args = process.argv.slice(2)
const unknownOption = args.find(argument => argument.startsWith('--') && argument !== '--json' && argument !== '--list')
if (unknownOption !== undefined) {
  console.error(`benchmarks: unknown option "${unknownOption}"; usage: node benchmarks/run.mjs [case...] [--list] [--json]`)
  process.exit(2)
}
const asJson = args.includes('--json')
const filters = args.filter(argument => !argument.startsWith('--'))
const discovered = discover()
const selected = filters.length === 0
  ? discovered.cases
  : discovered.cases.filter(file => filters.some(filter =>
    filter === caseId(file) || filter === basename(dirname(file)) || file.endsWith(filter)))
if (selected.length === 0) {
  console.error(`benchmarks: no case matched ${filters.join(', ') || '(none)'}; discovered: ${discovered.cases.map(caseId).join(', ') || 'none'}`)
  process.exit(1)
}
for (const file of discovered.browserCases) {
  console.error(`benchmarks: ${relative(BENCHMARKS_ROOT, file)} is a browser-face case; no lane here runs it`)
}
if (args.includes('--list')) {
  for (const file of selected) console.log(`${caseId(file)}  ${relative(BENCHMARKS_ROOT, file)}`)
  process.exit(0)
}

const environment = environmentFacts()
if (!asJson) {
  console.log(`benchmarks: ${environment.node} ${environment.platform}/${environment.arch}, parallelism ${String(environment.parallelism)}, ${environment.cpuModels.join(', ')}`)
}

const results = []
for (const file of selected) {
  const id = caseId(file)
  if (!asJson) console.log(`benchmarks: ${id} — ${relative(BENCHMARKS_ROOT, file)}`)
  const run = await runCase(file)
  const line = lastReportLine(run.stdout)
  let report
  if (line !== undefined) {
    try {
      report = JSON.parse(line)
    } catch (error) {
      run.stderr += `\nbenchmarks: unparsable report line: ${String(error)}`
    }
  }
  if (!asJson) {
    const narration = run.stdout.trimEnd().split('\n').filter(candidate => candidate !== line).join('\n')
    if (narration.trim() !== '') console.log(narration)
    if (run.stderr.trim() !== '') console.error(run.stderr.trimEnd())
  }
  const failures = []
  if (run.timedOut) failures.push(`case exceeded its ${CASE_TIMEOUT_MS} ms deadline`)
  else if (run.exitCode !== 0) failures.push(`case exited with ${String(run.exitCode)} (signal ${run.signal ?? 'none'})`)
  if (report === undefined) failures.push('case printed no JSON report line')
  else {
    if (report.case !== id) failures.push(`report names case "${String(report.case)}"`)
    if (report.verdict !== 'pass') failures.push(...(Array.isArray(report.failures) && report.failures.length > 0 ? report.failures : ['verdict is not pass']))
  }
  results.push({ id, report, failures })
}

/** One physical line summarizing a passing case, one entry per measured quantity its report carries. */
function summaryLine(id, report) {
  const quantities = Object.entries(report.aggregate ?? {})
    .filter(([, spread]) => spread !== null && typeof spread === 'object' && typeof spread.median === 'number')
    .filter(([key]) => typeof report.budgets?.[key] === 'number')
  if (quantities.length === 0) return `  ${id}  passed without a comparable aggregate`
  const parts = quantities.map(([key, spread]) => `${key} median ${round(spread.median)} / budget ${String(report.budgets[key])}`)
  return `  ${id}  ${parts.join(', ')}`
}

const failed = results.filter(result => result.failures.length > 0)
if (asJson) {
  console.log(JSON.stringify({
    verdict: failed.length === 0 ? 'pass' : 'fail',
    environment,
    cases: results.map(result => ({ ...result.report, case: result.id, verdict: result.failures.length === 0 ? 'pass' : 'fail', failures: result.failures })),
  }))
} else {
  for (const result of failed) for (const failure of result.failures) console.error(`benchmarks: ${result.id}: ${failure}`)
  console.log(`benchmarks: ${String(results.length - failed.length)}/${String(results.length)} case(s) passed`)
  for (const { id, report, failures } of results) {
    if (report === undefined || failures.length > 0) continue
    console.log(summaryLine(id, report))
  }
}
if (failed.length > 0) process.exit(1)
