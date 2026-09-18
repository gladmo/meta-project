// Plain-Node launcher for measured benchmark workloads: one child process per
// sample, bounded by a deadline, reporting exit, signal, timeout, stderr, and
// the child's final JSON report line. Ported from the source project's
// benchmarks/support/built-worker.ts, minus its build-artifact checks — this
// lane runs the worker sources directly.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The benchmarks tree that owns this support module. */
const benchmarksRoot = dirname(fileURLToPath(new URL('.', import.meta.url)))

/** Extensions a benchmark worker may run from without a loader. */
const WORKER_EXTENSIONS = ['.mjs', '.js', '.cjs']

/**
 * The last output line that opens a JSON object — the report line a worker
 * ends with. Scanned backwards by hand: this lane keeps running on Node
 * releases older than the `Array.prototype.findLast` baseline (18.0).
 * @param {string} stdout Collected child stdout.
 * @returns {string|undefined} The final JSON-candidate line, when one exists.
 */
export function lastReportLine(stdout) {
  const lines = stdout.trim().split('\n')
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].startsWith('{')) return lines[index]
  }
  return undefined
}

/**
 * Spawn one plain-Node child under a deadline and collect its complete
 * output; the shared subprocess core of this lane. A spawn failure is
 * carried as `error` instead of rejecting, so callers choose whether it is
 * a resolved outcome or a thrown one.
 * @param {string[]} argv Child arguments, starting at the script path.
 * @param {object} options Spawn options.
 * @param {number} options.timeoutMs Deadline; the child is SIGKILLed when it expires.
 * @param {string} [options.cwd] Child working directory.
 * @param {string[]} [options.nodeFlags] Flags placed before the script path.
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number|null, signal: string|null, timedOut: boolean, error: Error|undefined}>}
 *   Collected child outcome; `error` is set only when the child could not spawn.
 */
export function spawnNodeCollected(argv, { timeoutMs, cwd, nodeFlags = [] }) {
  // A missing deadline would clamp setTimeout to 1 ms and read as a phantom
  // timeout; fail loud instead, as the misconfiguration it is.
  if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs)) {
    throw new TypeError(`spawnNodeCollected requires a finite timeoutMs, got ${String(timeoutMs)}`)
  }
  return new Promise((resolve) => {
    const env = { ...process.env }
    delete env['NODE_OPTIONS']
    delete env['NODE_COMPILE_CACHE']
    const child = spawn(process.execPath, [...nodeFlags, ...argv], {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const deadline = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
    child.once('error', (error) => {
      clearTimeout(deadline)
      resolve({ stdout, stderr, exitCode: null, signal: null, timedOut, error })
    })
    child.once('close', (exitCode, signal) => {
      clearTimeout(deadline)
      resolve({ stdout, stderr, exitCode, signal, timedOut, error: undefined })
    })
  })
}

/**
 * Run one benchmark worker as a fresh plain-Node process.
 * @param {object} options Sample options.
 * @param {string} options.worker Absolute path to the worker entry.
 * @param {string[]} [options.args] Arguments passed to the worker.
 * @param {number} options.timeoutMs Deadline; the child is killed when it expires.
 * @param {boolean} [options.exposeGc] Expose `globalThis.gc` for retained-heap endpoints.
 * @param {number} [options.heapLimitMb] V8 old-space limit for constrained-heap samples.
 * @param {string} [options.cwd] Child working directory; defaults to the current one.
 * @returns {Promise<{report: object|undefined, exitCode: number|null, signal: string|null, timedOut: boolean, stderr: string}>}
 *   Child exit details and its final JSON report line when the exit succeeded.
 * @throws When the child cannot spawn or its report line does not parse.
 */
export async function runBenchmarkWorker(options) {
  if (!WORKER_EXTENSIONS.some(extension => options.worker.endsWith(extension))) {
    throw new Error(`benchmark worker must be JavaScript: ${options.worker}`)
  }
  const run = await spawnNodeCollected([options.worker, ...options.args ?? []], {
    timeoutMs: options.timeoutMs,
    cwd: options.cwd ?? process.cwd(),
    nodeFlags: [
      ...options.exposeGc === true ? ['--expose-gc'] : [],
      ...options.heapLimitMb === undefined ? [] : [`--max-old-space-size=${String(options.heapLimitMb)}`],
    ],
  })
  if (run.error !== undefined) throw run.error
  let report
  if (run.exitCode === 0) {
    const line = lastReportLine(run.stdout)
    if (line !== undefined) {
      try {
        report = JSON.parse(line)
      } catch (error) {
        throw new Error(`benchmark worker ${options.worker} printed an unparsable report line: ${String(error)}`)
      }
    }
  }
  return { report, exitCode: run.exitCode, signal: run.signal, timedOut: run.timedOut, stderr: run.stderr }
}

/**
 * Reject a measured workload reached through a module loader, a copy outside
 * this tree, or a non-JavaScript entry — each would make the sample measure
 * something other than the shipped path. Call it from the worker entry itself.
 * @param {string} moduleUrl `import.meta.url` of the worker entry.
 * @param {Record<string, string>} [entries] Production modules the measured path resolves through.
 */
export function assertPlainNodeWorker(moduleUrl, entries = {}) {
  const workerPath = fileURLToPath(moduleUrl)
  if (!workerPath.startsWith(`${benchmarksRoot}${sep}`)) {
    throw new Error(`benchmark worker is not running from the benchmarks tree: ${workerPath}`)
  }
  const loader = process.execArgv.find(argument =>
    /--(?:experimental-)?loader\b|--import\b|--require\b|(?:^|[/\\])(?:tsx|ts-node)(?:[/\\]|$)/.test(argument))
  if (loader !== undefined) throw new Error(`benchmark worker received a module loader: ${loader}`)
  for (const [specifier, entry] of Object.entries(entries)) {
    if (!WORKER_EXTENSIONS.some(extension => entry.endsWith(extension)) || !existsSync(entry)) {
      throw new Error(`benchmark entry ${specifier} is not a JavaScript file in this tree: ${entry}`)
    }
  }
}
