#!/usr/bin/env node
// Re-fetch ward flag and seal images as 500px PNG thumbnails from Wikimedia.
// Wikimedia rate-limits direct SVG fetches and only serves thumbnails at standard
// "step" sizes (120, 250, 500, ...). 500px renders crisply on mobile retina.
//
// Reads raw Wikipedia scrapes from data/raw/<id>.md, extracts thumb URLs, rewrites
// the size segment to 500px, downloads PNGs to data/flags + data/seals + the public
// folders, and updates app/src/data/wards.json to point at the new .png paths.

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, unlinkSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

const wardsJsonPath = join(repoRoot, 'app/src/data/wards.json')
const wards = JSON.parse(readFileSync(wardsJsonPath, 'utf8'))

const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
const TARGET_PX = 500

// Rewrite a thumb URL like /thumb/<a>/<ab>/<File>.svg/<NNN>px-<File>.svg.png
// to use TARGET_PX for the rendered size.
function rewriteThumbSize(url) {
  const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\/[0-9a-f]\/[0-9a-f]{2}\/([^/]+))\/\d+px-([^/]+)$/)
  if (!m) return null
  const [, prefix, filename, suffix] = m
  return `${prefix}/${TARGET_PX}px-${suffix.replace(/^\d+px-/, '')}`
    .replace(/(\/)(\d+px-)?/, `$1${TARGET_PX}px-`)
    // Belt-and-braces: ensure exactly the canonical pattern.
    .replace(/\/\d+px-/, `/${TARGET_PX}px-`)
    || `${prefix}/${TARGET_PX}px-${filename}.png`
}

// The above is overly clever. Simpler explicit version:
function rewriteThumbSizeV2(url) {
  // /thumb/<a>/<ab>/<File>.svg/<NNN>px-<File>.svg.png -> /thumb/<a>/<ab>/<File>.svg/500px-<File>.svg.png
  return url.replace(/\/(\d+)px-/, `/${TARGET_PX}px-`)
}

function decodeUrl(u) { try { return decodeURIComponent(u) } catch { return u } }

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function findUrlsInMd(mdText, ward) {
  const englishName = ward.name_en
  const flagRegex = new RegExp(`!\\[Flag of ${escapeRegex(englishName)}[^\\]]*\\]\\((https:[^)]+)\\)`, 'i')
  const sealRegexes = [
    new RegExp(`!\\[Official seal of ${escapeRegex(englishName)}[^\\]]*\\]\\((https:[^)]+)\\)`, 'i'),
    new RegExp(`!\\[Emblem of ${escapeRegex(englishName)}[^\\]]*\\]\\((https:[^)]+)\\)`, 'i'),
  ]
  const flagMatch = mdText.match(flagRegex)
  let sealMatch = null
  for (const r of sealRegexes) {
    sealMatch = mdText.match(r)
    if (sealMatch) break
  }
  return {
    flagThumb: flagMatch?.[1] ?? null,
    sealThumb: sealMatch?.[1] ?? null,
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

async function fetchPng(url, attempt = 1) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': 'https://en.wikipedia.org/',
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site',
    },
  })
  if (res.status === 429 && attempt <= 6) {
    const waitMs = 4000 * attempt
    process.stderr.write(`  429 attempt ${attempt}, sleeping ${waitMs}ms\n`)
    await sleep(waitMs)
    return fetchPng(url, attempt + 1)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const ct = res.headers.get('content-type') || ''
  if (!ct.startsWith('image/')) throw new Error(`unexpected content-type ${ct}`)
  const buf = Buffer.from(await res.arrayBuffer())
  // PNG magic: 89 50 4E 47
  if (buf.length < 8 || buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) {
    throw new Error('response is not a PNG')
  }
  return buf
}

function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }) }

const targets = {
  dataFlags: join(repoRoot, 'data/flags'),
  dataSeals: join(repoRoot, 'data/seals'),
  publicFlags: join(repoRoot, 'app/public/flags'),
  publicSeals: join(repoRoot, 'app/public/seals'),
}
for (const k of Object.values(targets)) ensureDir(k)

const results = []

for (const ward of wards) {
  const mdPath = join(repoRoot, 'data/raw', `${ward.id}.md`)
  if (!existsSync(mdPath)) {
    results.push({ id: ward.id, status: 'SKIP', reason: 'no raw md' })
    continue
  }
  const md = readFileSync(mdPath, 'utf8')
  const { flagThumb, sealThumb } = findUrlsInMd(md, ward)

  for (const [kind, thumb] of [['flag', flagThumb], ['seal', sealThumb]]) {
    const dataDir = kind === 'flag' ? targets.dataFlags : targets.dataSeals
    const publicDir = kind === 'flag' ? targets.publicFlags : targets.publicSeals
    const filename = `${ward.id}.png`
    const dataPath = join(dataDir, filename)

    if (existsSync(dataPath)) {
      // Validate PNG magic bytes; if good, skip.
      const buf = readFileSync(dataPath)
      if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
        copyFileSync(dataPath, join(publicDir, filename))
        results.push({ id: ward.id, kind, status: 'SKIP', reason: 'already valid PNG' })
        continue
      }
    }

    if (!thumb) {
      results.push({ id: ward.id, kind, status: 'NOURL' })
      process.stderr.write(`${ward.id.padEnd(12)} ${kind.padEnd(4)} NOURL\n`)
      continue
    }
    const url = rewriteThumbSizeV2(thumb)
    try {
      const buf = await fetchPng(url)
      writeFileSync(dataPath, buf)
      copyFileSync(dataPath, join(publicDir, filename))
      results.push({ id: ward.id, kind, status: 'OK', bytes: buf.length, url: decodeUrl(url) })
      process.stderr.write(`${ward.id.padEnd(12)} ${kind.padEnd(4)} OK ${buf.length}B\n`)
    } catch (err) {
      results.push({ id: ward.id, kind, status: 'FAIL', reason: err.message, url: decodeUrl(url) })
      process.stderr.write(`${ward.id.padEnd(12)} ${kind.padEnd(4)} FAIL ${err.message}\n`)
    }
    await sleep(2000)
  }
}

let okCount = 0, skipCount = 0, failCount = 0
for (const r of results) {
  if (r.status === 'OK') okCount++
  else if (r.status === 'SKIP') skipCount++
  else failCount++
  const line = r.status === 'OK' ? `${r.id.padEnd(12)} ${r.kind.padEnd(4)} OK   ${r.bytes}B`
    : r.status === 'SKIP' ? `${r.id.padEnd(12)} ${(r.kind ?? '').padEnd(4)} SKIP ${r.reason}`
    : `${r.id.padEnd(12)} ${(r.kind ?? '').padEnd(4)} ${r.status} ${r.reason ?? ''}`
  console.log(line)
}
console.log(`\n${okCount} downloaded, ${skipCount} skipped, ${failCount} failed`)

// If everything we needed succeeded, update wards.json to point at .png files
// and clean up obsolete .svg files (keep tokyo-metro.png).
if (failCount === 0) {
  const updated = wards.map(w => ({
    ...w,
    flag_url: `flags/${w.id}.png`,
    seal_url: `seals/${w.id}.png`,
  }))
  writeFileSync(wardsJsonPath, JSON.stringify(updated, null, 2) + '\n', 'utf8')
  console.log(`Updated ${wardsJsonPath} to use .png paths.`)

  // Remove obsolete .svg files from data/ and public/ folders for the wards.
  for (const dir of [targets.dataFlags, targets.dataSeals, targets.publicFlags, targets.publicSeals]) {
    for (const name of readdirSync(dir)) {
      if (!name.endsWith('.svg')) continue
      const id = name.slice(0, -4)
      // Only remove files matching a ward id; leave anything else (e.g. tokyo-metro).
      if (wards.some(w => w.id === id)) {
        unlinkSync(join(dir, name))
      }
    }
  }
  console.log('Removed stale .svg ward files.')
}

process.exit(failCount > 0 ? 1 : 0)
