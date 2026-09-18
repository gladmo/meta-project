// Aggregator: run every documentation gate sequentially. Usage:
//   node scripts/run-gates.mjs            # all gates
//   node scripts/run-gates.mjs <gate>     # one gate, e.g. verify-md-wrap

import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { repoRoot } from './lib/md.mjs'

const GATES = [
  'verify-md-links',
  'verify-md-wrap',
  'verify-doc-pairs',
  'verify-doc-budgets',
  'verify-agent-note-format',
  'verify-agent-note-classification',
]

const selected = process.argv.length > 2 ? [process.argv[2]] : GATES
for (const gate of selected) {
  if (!GATES.includes(gate)) {
    console.error(`run-gates: unknown gate "${gate}"; known gates: ${GATES.join(', ')}`)
    process.exit(1)
  }
}

const failed = []
for (const gate of selected) {
  const script = join(fileURLToPath(new URL('.', import.meta.url)), `${gate}.mjs`)
  const result = spawnSync(process.execPath, [script], { stdio: 'inherit' })
  if (result.status !== 0) failed.push(gate)
}

if (failed.length > 0) {
  console.error(`run-gates: failed: ${failed.join(', ')}`)
  process.exit(1)
}
console.log(`run-gates: all green (${selected.length}/${selected.length})`)
