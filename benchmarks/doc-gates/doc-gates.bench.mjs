// Budget case for the documentation-gate corpus pass. Each sample is a fresh
// child process with its own private corpus; the medians enforce both budgets.
// Prints its samples, then one JSON report line the runner consumes.

import { fileURLToPath } from 'node:url'
import { CI_TIME_SCALE, PERFORMANCE_BUDGET_HEADROOM, ciTimeBudget, memoryBudgetMiB } from '../support/calibration.mjs'
import { environmentFacts } from '../support/environment.mjs'
import { runBenchmarkWorker } from '../support/worker.mjs'

/** Fresh processes per sample. */
const ATTEMPTS = 5
/** Deadline for one sample, well below the runner's case deadline. */
const WORKER_TIMEOUT_MS = 60_000
/** Reference-machine expectations before scaling; provenance lives in the owning Agent Note. */
const EXPECTED_WALL_MS = 175
const EXPECTED_RETAINED_HEAP_MIB = 5

const WALL_BUDGET_MS = ciTimeBudget(EXPECTED_WALL_MS)
const RETAINED_HEAP_BUDGET_MIB = memoryBudgetMiB(EXPECTED_RETAINED_HEAP_MIB)
const WORKER = fileURLToPath(new URL('doc-gates.worker.mjs', import.meta.url))

/**
 * Median of a sample set; an even count averages the two middle values.
 * @param {number[]} values Sample values.
 * @returns {number} Median value.
 */
function median(values) {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = sorted.length / 2
  return sorted.length % 2 === 1
    ? sorted[(sorted.length - 1) / 2]
    : (sorted[middle - 1] + sorted[middle]) / 2
}

/**
 * Spread of one measured quantity across samples.
 * @param {number[]} values Sample values.
 * @returns {{min: number, median: number, max: number}} Minimum, median, and maximum.
 */
function aggregate(values) {
  return { min: Math.min(...values), median: median(values), max: Math.max(...values) }
}

const failures = []
const samples = []
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  const run = await runBenchmarkWorker({ worker: WORKER, timeoutMs: WORKER_TIMEOUT_MS, exposeGc: true })
  const problem = run.timedOut
    ? `sample ${attempt} exceeded its ${WORKER_TIMEOUT_MS} ms deadline`
    : run.exitCode !== 0
      ? `sample ${attempt} exited with ${String(run.exitCode)} (signal ${run.signal ?? 'none'})`
      : run.report === undefined
        ? `sample ${attempt} reported no JSON line`
        : undefined
  if (problem !== undefined) {
    failures.push(problem)
    if (run.stderr.trim() !== '') console.error(run.stderr.trim())
    continue
  }
  samples.push(run.report)
  console.log(`  sample ${attempt}: ${run.report.wallMs.toFixed(1)} ms, ${run.report.retainedHeapMiB.toFixed(1)} MiB retained heap`)
}

const wallMs = aggregate(samples.map(sample => sample.wallMs))
const retainedHeapMiB = aggregate(samples.map(sample => sample.retainedHeapMiB))
if (samples.length === 0) failures.push(`no sample completed in ${ATTEMPTS} attempt(s)`)
if (samples.length > 0 && wallMs.median > WALL_BUDGET_MS) {
  failures.push(`median wall time ${wallMs.median.toFixed(1)} ms exceeds budget ${WALL_BUDGET_MS} ms`)
}
if (samples.length > 0 && retainedHeapMiB.median > RETAINED_HEAP_BUDGET_MIB) {
  failures.push(`median retained heap ${retainedHeapMiB.median.toFixed(1)} MiB exceeds budget ${RETAINED_HEAP_BUDGET_MIB} MiB`)
}
for (const failure of failures) console.error(`doc-gates: ${failure}`)

const first = samples[0]
console.log(JSON.stringify({
  case: 'doc-gates',
  verdict: failures.length === 0 ? 'pass' : 'fail',
  failures,
  workload: first?.workload ?? null,
  endpoints: first?.endpoints ?? null,
  samples,
  aggregate: samples.length === 0 ? null : { wallMs, retainedHeapMiB },
  budgets: {
    wallMs: WALL_BUDGET_MS,
    retainedHeapMiB: RETAINED_HEAP_BUDGET_MIB,
    expected: { wallMs: EXPECTED_WALL_MS, retainedHeapMiB: EXPECTED_RETAINED_HEAP_MIB },
    timeScale: CI_TIME_SCALE,
    headroom: PERFORMANCE_BUDGET_HEADROOM,
  },
  environment: environmentFacts(),
}))
if (failures.length > 0) process.exitCode = 1
