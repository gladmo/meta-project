// Reference-host facts attached to every sample and aggregate report, so a
// verdict can be interpreted without re-running the case on that machine.

import os from 'node:os'

/**
 * CPU models, available parallelism, platform, and runtime versions for the
 * measuring host. `os.availableParallelism` is absent before Node 18.14.
 * @returns {{cpuModels: string[], parallelism: number, platform: string, arch: string, node: string, v8: string}}
 */
export function environmentFacts() {
  return {
    cpuModels: [...new Set(os.cpus().map(cpu => cpu.model))].sort(),
    parallelism: typeof os.availableParallelism === 'function'
      ? os.availableParallelism()
      : os.cpus().length,
    platform: process.platform,
    arch: process.arch,
    node: process.version,
    v8: process.versions.v8,
  }
}
