// Measures WCAG 2.x contrast for token pairs by parsing app/globals.css.
// Usage: node scripts/contrast-tokens.mjs [--md]   (exit 1 if any required pair fails)
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')

function block(selector) {
  const i = css.indexOf(`\n  ${selector} {`)
  if (i < 0) throw new Error(`missing ${selector}`)
  const body = css.slice(css.indexOf('{', i) + 1, css.indexOf('\n  }', i))
  const vars = {}
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim()
  return vars
}
const root = block(':root'), dark = block('.dark')
const vic = block('.theme-victorian'), darkVic = block('.dark .theme-victorian')

const contexts = {
  'global light': { ...root },
  'global dark': { ...root, ...dark },
  'victorian light': { ...root, ...vic },
  'victorian dark': { ...root, ...dark, ...vic, ...darkVic },
}

function resolve(ctx, name, depth = 0) {
  let v = ctx[name]
  if (v === undefined) throw new Error(`no --${name}`)
  const m = v.match(/^var\(--([\w-]+)\)$/)
  return m && depth < 5 ? resolve(ctx, m[1], depth + 1) : v
}
function rgb(hsl) {
  const [h, s, l] = hsl.replace(/%/g, '').split(/\s+/).map(Number)
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const f = (n) => {
    const k = (n + h / 30) % 12
    return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
  }
  return [f(0), f(8), f(4)]
}
const lum = ([r, g, b]) => {
  const c = (x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b)
}
const ratio = (a, b) => {
  const [x, y] = [lum(rgb(a)), lum(rgb(b))].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

// [foreground, background, minimum, label]
const T = 4.5, U = 3
const base = (surfaces) => {
  const out = []
  for (const s of surfaces) {
    out.push(['foreground', s, T], ['muted-foreground', s, T])
  }
  return out
}
const pairs = [
  ...base(['background', 'card', 'secondary', 'muted', 'accent']),
  ['card-foreground', 'card', T], ['popover-foreground', 'popover', T],
  ['primary-foreground', 'primary', T], ['secondary-foreground', 'secondary', T],
  ['accent-foreground', 'accent', T], ['destructive-foreground', 'destructive', T],
  ['success-foreground', 'success', T], ['warning-foreground', 'warning', T],
  ['info-foreground', 'info', T],
  ['destructive', 'card', T], ['success', 'card', T], ['info', 'card', T],
  ['primary', 'card', T], ['primary', 'background', T],
  ['border', 'card', U], ['border', 'background', U], ['input', 'card', U],
  ['ring', 'card', U], ['ring', 'background', U],
  ['gilt-foreground', 'gilt', T], ['gilt-ink', 'card', T], ['gilt-ink', 'background', T],
  ['gilt-ink', 'secondary', T], ['gilt', 'card', 1],
  ['seal-foreground', 'seal', T],
  ...[1, 2, 3, 4, 5].map((n) => [`chart-${n}`, 'card', U]),
]
for (const t of ['1', '2', '3', '4', '5', 'top10', 'top20', 'none']) {
  pairs.push([`rank-${t}-foreground`, `rank-${t}`, T])
  for (const s of ['card', 'background', 'secondary']) pairs.push([`rank-${t}-ink`, s, T])
  // Badge rings and plate rules are drawn in -ink, so the non-text edge is the ink check above.
}
// Rank-1 gold and the gilt text must stay distinguishable: report only.
const md = process.argv.includes('--md')
let fails = 0
const rows = []
for (const [ctxName, ctx] of Object.entries(contexts)) {
  for (const [fg, bg, min] of pairs) {
    // Global (wave-1) semantic tokens are not part of this pass; only the new families are gated there.
    if (ctxName.startsWith('global') && !/^(gilt|seal|rank-|chart-)/.test(fg)) continue
    // Primary is a fill, and text only in light mode (dark primary is never used as text).
    if (ctxName === 'victorian dark' && fg === 'primary') continue
    let r
    try { r = ratio(resolve(ctx, fg), resolve(ctx, bg)) } catch { continue }
    const ok = r >= min
    if (!ok) fails++
    rows.push({ ctxName, fg, bg, min, r, ok })
  }
}
if (md) {
  for (const ctxName of Object.keys(contexts)) {
    console.log(`\n#### ${ctxName}\n\n| Foreground | on | Min | Measured | Result |\n|---|---|---|---|---|`)
    for (const x of rows.filter((x) => x.ctxName === ctxName))
      if (x.min > 1) console.log(`| \`${x.fg}\` | \`${x.bg}\` | ${x.min}:1 | ${x.r.toFixed(2)}:1 | ${x.ok ? 'pass' : 'FAIL'} |`)
  }
} else {
  for (const x of rows.filter((x) => !x.ok)) console.log(`FAIL [${x.ctxName}] ${x.fg} on ${x.bg}: ${x.r.toFixed(2)} < ${x.min}`)
  console.log(`${rows.length} pairs measured, ${fails} failing`)
}
process.exit(fails ? 1 : 0)
