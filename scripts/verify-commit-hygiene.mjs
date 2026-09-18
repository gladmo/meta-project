// Gate: commit hygiene over the git index. Every tracked text file ends with
// exactly one trailing newline and carries no trailing whitespace and no
// leftover merge-conflict markers. The corpus is `git ls-files` — the index,
// with core.quotepath=false so non-ASCII names arrive unescaped in every
// clone — so staged additions are checked and staged deletions drop out;
// like the other gates, the content read is the working tree. Binary files
// (NUL byte), non-regular files (symlinked paths, gone-but-listed), and
// unreadable paths are skipped and the counts are printed so an empty corpus
// stays visible.

import { spawnSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { repoRoot } from './lib/md.mjs'

const listed = spawnSync('git', ['-c', 'core.quotepath=false', 'ls-files'], {
  cwd: repoRoot,
  encoding: 'utf8',
})
if (listed.error || listed.status !== 0) {
  console.error(`verify-commit-hygiene: git ls-files failed: ${listed.error ?? listed.stderr.trim()}`)
  process.exit(1)
}

const violations = []
const fail = (rel, line, msg) => violations.push(`${rel}${line === 0 ? '' : `:${line}`}: ${msg}`)

let checked = 0
let skipped = 0
for (const rel of listed.stdout.split('\n')) {
  if (rel === '') continue
  const abs = join(repoRoot, rel)
  let content
  try {
    if (!statSync(abs).isFile()) throw new Error('not a regular file')
    content = readFileSync(abs, 'utf8')
  } catch {
    skipped++
    continue
  }
  if (content.includes('\u0000')) {
    skipped++
    continue
  }
  checked++
  if (content.length > 0) {
    if (!content.endsWith('\n')) fail(rel, 0, 'missing trailing newline at end of file')
    else if (content.endsWith('\n\n')) fail(rel, 0, 'more than one trailing newline at end of file')
  }
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (/[ \t]+$/.test(lines[i])) fail(rel, i + 1, 'trailing whitespace')
    if (/^(<{7}|>{7})/.test(lines[i])) fail(rel, i + 1, 'conflict marker')
  }
}

if (violations.length > 0) {
  for (const v of violations.slice(0, 30)) console.error(`verify-commit-hygiene: ${v}`)
  if (violations.length > 30) console.error(`verify-commit-hygiene: … and ${violations.length - 30} more`)
  console.error(`verify-commit-hygiene: ${violations.length} violation(s); fix them, then commit again`)
  process.exit(1)
}
console.log(`verify-commit-hygiene: ok (${checked} file(s), ${skipped} skipped)`)
