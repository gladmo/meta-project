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
 */
export function runBenchmarkWorker(options) {
  if (!WORKER_EXTENSIONS.some(extension => options.worker.endsWith(extension))) {
    throw new Error(`benchmark worker must be JavaScript: ${options.worker}`)
  }
  const env = { ...process.env }
  delete env['NODE_OPTIONS']
  delete env['NODE_COMPILE_CACHE']
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      ...options.exposeGc === true ? ['--expose-gc'] : [],
      ...options.heapLimitMb === undefined ? [] : [`--max-old-space-size=${String(options.heapLimitMb)}`],
      options.worker,
      ...options.args ?? [],
    ], {
      cwd: options.cwd ?? process.cwd(),
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const deadline = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, options.timeoutMs)
    child.stdout.setEncoding('utf8').on('data', (chunk) => { stdout += chunk })
    child.stderr.setEncoding('utf8').on('data', (chunk) => { stderr += chunk })
    child.once('error', (error) => {
      clearTimeout(deadline)
      reject(error)
    })
    child.once('close', (exitCode, signal) => {
      clearTimeout(deadline)
      const line = stdout.trim().split('\n').findLast(candidate => candidate.startsWith('{'))
      try {
        const report = exitCode === 0 && line !== undefined ? JSON.parse(line) : undefined
        resolve({ report, exitCode, signal, timedOut, stderr })
      } catch (error) {
        reject(error)
      }
    })
  })
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
