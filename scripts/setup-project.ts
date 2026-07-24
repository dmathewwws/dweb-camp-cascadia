#!/usr/bin/env tsx
/**
 * Set up the workspace — run this once after forking the template.
 *
 *   pnpm setup-project [name] [--allowed-origin <url>] [--github-url <url>]
 *
 * `name` defaults to the repo directory name, except when only flags are passed —
 * then the current name is kept so a flags-only run never triggers a rename.
 *
 * The current name is read from the root package.json, and every occurrence of it
 * (package scope `@<current>/`, Cloudflare resource names `<current>-…`, and the
 * Title Case display strings) is rewritten to the new name across the root files
 * and `apps/**`. Because it rewrites *current → next* rather than assuming the
 * pristine template state, it is safe to re-run, renames forks that already
 * scaffolded extra apps, and can even reverse itself
 * (`pnpm setup-project console-starter` restores the template naming).
 *
 * --allowed-origin sets the production ALLOWED_ORIGIN literal in every
 * `apps/<app>/alchemy.run.ts`; --github-url points the footer's open-source link
 * (`apps/<app>/client/src/components/Footer.tsx`) at your fork. Both match whatever
 * value is currently there, so they are also re-runnable and reversible. Both are
 * ALSO applied to `templates/mini-app-starter`, so apps scaffolded later by
 * new-app.ts inherit the fork's values instead of stale placeholders.
 *
 * The *rename* deliberately never touches `templates/`: the vendored starter keeps
 * its generic `@starter/*` names, and new-app.ts rescopes them at copy time using
 * whatever the workspace is called then.
 *
 * What it deliberately does NOT touch: `wrangler.toml` (ALLOWED_ORIGIN is unset in
 * dev on purpose, so the audience check is skipped) and the dev D1 database id.
 */

import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { getWorkspaceName, KEBAB_RE, REPO_ROOT, toTitleCase } from './lib/workspace'

/** Same skip set as new-app.ts — never rewrite inside generated/vendored trees. */
const SKIP = new Set([
  '.git',
  'node_modules',
  'dist',
  '.wrangler',
  '.alchemy',
  'pnpm-lock.yaml',
])

/** Files we rewrite text inside of. */
const TEXT_EXT = new Set(['.ts', '.tsx', '.json', '.toml', '.md', '.html', '.css', '.yaml'])

const USAGE = 'Usage: pnpm setup-project [name] [--allowed-origin <url>] [--github-url <url>]'

function die(msg: string): never {
  console.error(`\n✖ ${msg}\n`)
  process.exit(1)
}

// ── args ────────────────────────────────────────────────────────────────────
let positionals: string[]
let flags: { 'allowed-origin'?: string; 'github-url'?: string }
try {
  ;({ positionals, values: flags } = parseArgs({
    args: process.argv.slice(2),
    options: {
      'allowed-origin': { type: 'string' },
      'github-url': { type: 'string' },
    },
    allowPositionals: true,
  }))
} catch (e) {
  die(`${(e as Error).message}\n  ${USAGE}`)
}

const allowedOrigin = flags['allowed-origin']?.trim()
const githubUrl = flags['github-url']?.trim().replace(/\.git$/, '').replace(/\/+$/, '')

/** The origin is `scheme://host[:port]` — reject paths, trailing slashes, garbage. */
function parseOrigin(raw: string): string {
  if (!raw) die(`--allowed-origin is empty.\n  ${USAGE}`)
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    die(`"${raw}" is not a valid URL. The origin looks like https://your.domain\n  ${USAGE}`)
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    die(`"${raw}" must be http(s). The origin looks like https://your.domain\n  ${USAGE}`)
  }
  if (raw !== url.origin) {
    die(`"${raw}" is not a bare origin — drop the path/trailing slash (did you mean "${url.origin}"?)`)
  }
  if (url.protocol === 'http:') {
    console.warn(`⚠ "${raw}" is http — this is the *production* origin; https expected.`)
  }
  return raw
}

const originValue = allowedOrigin ? parseOrigin(allowedOrigin) : undefined

if (githubUrl && !/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+$/.test(githubUrl)) {
  die(`--github-url must look like https://github.com/owner/repo (got "${githubUrl}")`)
}

const current = getWorkspaceName()
const flagsOnly = positionals.length === 0 && (originValue !== undefined || githubUrl !== undefined)
const next = flagsOnly ? current : (positionals[0]?.trim() || path.basename(REPO_ROOT)).toLowerCase()
const renameNeeded = current !== next

if (renameNeeded) {
  if (!KEBAB_RE.test(next)) {
    die(
      `Invalid name "${next}". Use lowercase kebab-case starting with a letter, e.g. "my-space".\n` +
        `  ${USAGE}`,
    )
  }
  if (next.length < 4) {
    console.warn(
      `⚠ "${next}" is very short — global find-and-replace may hit unrelated text. Double-check the diff.`,
    )
  }
}

if (!renameNeeded && !originValue && !githubUrl) {
  console.log(`\n✅ Project is already named "${next}" — nothing to do.\n`)
  process.exit(0)
}

// ── rename ──────────────────────────────────────────────────────────────────
function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (SKIP.has(e.name)) return []
    const p = path.join(dir, e.name)
    if (e.isDirectory()) return walk(p)
    return TEXT_EXT.has(path.extname(e.name)) ? [p] : []
  })
}

if (renameNeeded) {
  const rootFiles = ['package.json', 'README.md', 'CLAUDE.md', 'pnpm-workspace.yaml', 'tsconfig.json']
    .map((f) => path.join(REPO_ROOT, f))
    .filter((f) => fs.existsSync(f))

  const files = [...rootFiles, ...walk(path.join(REPO_ROOT, 'apps'))]

  /**
   * Ordered so the most specific form wins; plain split/join, no regex escaping needed.
   * The bare kebab pass also covers `@<current>/…` scopes, `<current>-dev`, `<current>-dev-db`,
   * `alchemy('<current>')`, and pnpm --filter refs.
   */
  const REWRITES: Array<[string, string]> = [
    [current, next],
    [toTitleCase(current), toTitleCase(next)],
  ]

  console.log(`\n📛 Renaming "${current}" → "${next}"\n`)

  let updated = 0
  for (const file of files) {
    const before = fs.readFileSync(file, 'utf8')
    let after = before
    for (const [from, to] of REWRITES) after = after.split(from).join(to)
    const rel = path.relative(REPO_ROOT, file)
    if (after !== before) {
      fs.writeFileSync(file, after)
      console.log(`   updated     ${rel}`)
      updated++
    }
  }
  console.log(`\n   ${updated} file(s) updated, ${files.length - updated} unchanged.`)
}

// ── flag-set values ─────────────────────────────────────────────────────────
/**
 * `<relPath>` in every app directory — plus the vendored template, so apps
 * scaffolded later inherit the flag-set values instead of stale placeholders.
 */
function targetFiles(relPath: string): string[] {
  const appsDir = path.join(REPO_ROOT, 'apps')
  const appDirs = !fs.existsSync(appsDir)
    ? []
    : fs
        .readdirSync(appsDir, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !SKIP.has(e.name))
        .map((e) => path.join(appsDir, e.name))
  return [...appDirs, path.join(REPO_ROOT, 'templates', 'mini-app-starter')]
    .map((dir) => path.join(dir, relPath))
    .filter((f) => fs.existsSync(f))
}

/**
 * Replace one anchored pattern per file, matching whatever value is currently
 * there (placeholder or a previous run's value). Returns how many files changed.
 */
function setInAppFiles(
  relPath: string,
  pattern: RegExp,
  desired: string,
  replacement: (match: RegExpMatchArray) => string,
  label: string,
): number {
  let changed = 0
  const targets = targetFiles(relPath)
  if (targets.length === 0) {
    console.warn(`   ⚠ no ${relPath} found in apps/* or templates/ — ${label} not applied`)
    return 0
  }
  for (const file of targets) {
    const rel = path.relative(REPO_ROOT, file)
    const before = fs.readFileSync(file, 'utf8')
    const m = before.match(pattern)
    if (!m) {
      console.warn(`   ⚠ no ${label} in ${rel} — skipped`)
      continue
    }
    if (m[0] === replacement(m)) {
      console.log(`   unchanged   ${rel}`)
      continue
    }
    fs.writeFileSync(file, before.replace(pattern, () => replacement(m)))
    console.log(`   updated     ${rel}  (${label} → ${desired})`)
    changed++
  }
  return changed
}

const ORIGIN_LINE_RE = /^(\s*ALLOWED_ORIGIN:\s*)(['"])[^'"\n]*\2/m
const GITHUB_HREF_RE = /href="https:\/\/github\.com\/[^"]*"/

let originChanged = 0
if (originValue) {
  console.log(`\n🌐 Setting production ALLOWED_ORIGIN\n`)
  originChanged = setInAppFiles(
    'alchemy.run.ts',
    ORIGIN_LINE_RE,
    originValue,
    (m) => `${m[1]}${m[2]}${originValue}${m[2]}`,
    'ALLOWED_ORIGIN',
  )
}

let footerChanged = 0
if (githubUrl) {
  console.log(`\n🔗 Setting footer GitHub link\n`)
  footerChanged = setInAppFiles(
    path.join('client', 'src', 'components', 'Footer.tsx'),
    GITHUB_HREF_RE,
    githubUrl,
    () => `href="${githubUrl}"`,
    'GitHub link',
  )
}

// ── install (only a rename changes package names / the lockfile) ────────────
if (renameNeeded) {
  console.log('\n   Running pnpm install to update the lockfile…\n')
  try {
    execFileSync('pnpm', ['install'], { cwd: REPO_ROOT, stdio: 'inherit' })
  } catch {
    console.warn("\n⚠ `pnpm install` failed — run it yourself before continuing.\n")
  }
}

// ── report ──────────────────────────────────────────────────────────────────
const done: string[] = []
if (renameNeeded) done.push(`✅ Project renamed to "${next}"`)
if (originValue) {
  done.push(
    originChanged > 0
      ? `✅ ALLOWED_ORIGIN set to "${originValue}" in ${originChanged} file(s)`
      : `✅ ALLOWED_ORIGIN already "${originValue}"`,
  )
}
if (githubUrl) {
  done.push(
    footerChanged > 0
      ? `✅ Footer GitHub link set to ${githubUrl} in ${footerChanged} file(s)`
      : `✅ Footer GitHub link already ${githubUrl}`,
  )
}

done.push('✅ Project setup complete')

console.log(`\n${done.join('\n')}\n`)
